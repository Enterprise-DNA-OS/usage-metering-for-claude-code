create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table accounts (
 id uuid primary key default gen_random_uuid(), code text not null unique check(code ~ '^[A-Za-z0-9_-]+$'),
 name text not null check(length(trim(name))>0), owner text not null check(length(trim(owner))>0),
 currency text not null check(currency in ('NZD','AUD','USD','GBP','EUR')),
 review_on date not null, retention_review_on date not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table meters (
 id uuid primary key default gen_random_uuid(), code text not null unique check(code ~ '^[A-Za-z0-9_-]+$'),
 name text not null, unit text not null, aggregation text not null default 'sum' check(aggregation='sum'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table rate_cards (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references accounts, meter_id uuid not null references meters,
 valid_from date not null check(extract(day from valid_from)=1), valid_to date check(extract(day from valid_to)=1 and valid_to>valid_from),
 included_units numeric(20,6) not null default 0 check(included_units>=0),
 tier_units numeric(20,6) not null check(tier_units>=0),
 unit_price numeric(20,6) not null check(unit_price>=0), overage_price numeric(20,6) not null check(overage_price>=0),
 base_cents bigint not null default 0 check(base_cents>=0 and base_cents<1000000000000),
 evidence text not null check(length(trim(evidence))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table import_batches (
 id uuid primary key default gen_random_uuid(), source text not null, sha256 text not null, filename text not null,
 mapping jsonb not null, row_count integer not null check(row_count>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(source,sha256)
);
create table usage_records (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references accounts, meter_id uuid not null references meters,
 period_start timestamptz not null, period_end timestamptz not null,
 quantity numeric(20,6) not null check(quantity>=0), dimensions jsonb not null default '{}' check(jsonb_typeof(dimensions)='object'),
 source text not null, source_ref text not null, batch_id uuid references import_batches, raw_record jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(source,source_ref), check(period_end>period_start),
 check(date_trunc('month',period_start at time zone 'UTC')=date_trunc('month',(period_end-interval '1 microsecond') at time zone 'UTC'))
);
create table voids (
 id uuid primary key default gen_random_uuid(), usage_id uuid not null unique references usage_records,
 actor text not null check(length(trim(actor))>0), reason text not null check(length(trim(reason))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table issues (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references accounts,
 title text not null, owner text not null, due_on date not null,
 status text not null default 'open' check(status in ('open','resolved')),
 resolution text, resolved_by text, resolved_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((status='open' and resolved_at is null) or (status='resolved' and length(trim(resolution))>0 and length(trim(resolved_by))>0 and resolved_at is not null))
);
create table notes (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references accounts, actor text not null, body text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table statements (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references accounts,
 month date not null check(extract(day from month)=1), currency text not null, lines jsonb not null,
 total_cents bigint not null, fingerprint text not null, prepared_by text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table approvals (
 id uuid primary key default gen_random_uuid(), statement_id uuid not null unique references statements,
 account_id uuid not null references accounts, month date not null,
 reviewed_by text not null, evidence text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(account_id,month)
);
create table audit_log (
 id uuid primary key default gen_random_uuid(), entity text not null, record_id uuid not null,
 operation text not null, before_record jsonb, after_record jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function audit_change() returns trigger language plpgsql as $$ begin
 insert into audit_log(entity,record_id,operation,before_record,after_record)
 values(tg_table_name,new.id,tg_op,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new)); return new; end $$;
create function immutable_record() returns trigger language plpgsql as $$ begin raise exception 'History is immutable; append a correction'; end $$;
create function protect_usage() returns trigger language plpgsql as $$ begin
 perform id from accounts where id=new.account_id for update;
 if exists(select 1 from approvals where account_id=new.account_id and month=date_trunc('month',new.period_start at time zone 'UTC')::date) then raise exception 'Approved month is locked'; end if;
 if exists(select 1 from usage_records u where u.account_id=new.account_id and u.meter_id=new.meter_id and u.dimensions=new.dimensions
 and u.period_start<new.period_end and u.period_end>new.period_start and not exists(select 1 from voids v where v.usage_id=u.id)) then
 raise exception 'Overlapping usage window: reconcile or void the old record first'; end if;
 return new; end $$;
create trigger protect_usage before insert on usage_records for each row execute function protect_usage();
create function protect_void() returns trigger language plpgsql as $$ declare u usage_records; begin
 select * into strict u from usage_records where id=new.usage_id;
 perform id from accounts where id=u.account_id for update;
 if exists(select 1 from approvals where account_id=u.account_id and month=date_trunc('month',u.period_start at time zone 'UTC')::date) then raise exception 'Approved month is locked'; end if;
 return new; end $$;
create trigger protect_void before insert on voids for each row execute function protect_void();
create function protect_rate() returns trigger language plpgsql as $$ begin
 perform id from accounts where id=new.account_id for update;
 if exists(select 1 from rate_cards r where r.account_id=new.account_id and r.meter_id=new.meter_id and r.valid_from<coalesce(new.valid_to,'infinity'::date) and coalesce(r.valid_to,'infinity'::date)>new.valid_from) then raise exception 'Overlapping rate periods'; end if;
 if exists(select 1 from approvals where account_id=new.account_id and month>=new.valid_from and month<coalesce(new.valid_to,'infinity'::date)) then raise exception 'Approved month is locked'; end if;
 return new; end $$;
create trigger protect_rate before insert on rate_cards for each row execute function protect_rate();
create function protect_account() returns trigger language plpgsql as $$ begin
 if new.currency<>old.currency then raise exception 'Account currency is fixed; create a new account'; end if; return new; end $$;
create trigger protect_account before update on accounts for each row execute function protect_account();
create view active_usage as select u.* from usage_records u where not exists(select 1 from voids v where v.usage_id=u.id);
create view monthly_usage as
 select account_id,meter_id,date_trunc('month',period_start at time zone 'UTC')::date as month,
 sum(quantity) as units,count(*)::integer as records,min(period_start) as first_period,max(period_end) as last_period
 from active_usage group by account_id,meter_id,date_trunc('month',period_start at time zone 'UTC')::date;
create view monthly_charges as
 with periods as (
 select account_id,meter_id,month from monthly_usage
 union select r.account_id,r.meter_id,g::date from rate_cards r,
 lateral generate_series(r.valid_from,least(coalesce(r.valid_to-1,current_date),current_date),'1 month'::interval) g
 ), rated as (
 select a.id as account_id,a.code as account,a.name,a.owner,a.currency,m.code as meter,m.unit,p.month,
 coalesce(u.units,0) as units,coalesce(u.records,0) as records,r.id as rate_id,
 r.included_units,r.tier_units,r.unit_price,r.overage_price,r.base_cents,
 greatest(coalesce(u.units,0)-coalesce(r.included_units,0),0) as chargeable_units
 from periods p join accounts a on a.id=p.account_id join meters m on m.id=p.meter_id
 left join monthly_usage u on u.account_id=p.account_id and u.meter_id=p.meter_id and u.month=p.month
 left join rate_cards r on r.account_id=p.account_id and r.meter_id=p.meter_id and p.month>=r.valid_from and p.month<coalesce(r.valid_to,'infinity'::date)
 ) select *,case when rate_id is null then null else base_cents + round((least(chargeable_units,tier_units)*unit_price+greatest(chargeable_units-tier_units,0)*overage_price)*100)::bigint end as charge_cents
 from rated;
create view compliance_findings as
 select a.code as account,'REVIEW'::text as rule,'local policy supporting NZ IPP8'::text as basis,'Account accuracy review overdue'::text as finding,a.owner,a.review_on as due_on
 from accounts a where a.review_on<current_date
 union all select a.code,'RETENTION','local policy supporting NZ IPP9','Retention purpose review overdue',a.owner,a.retention_review_on from accounts a where a.retention_review_on<current_date
 union all select c.account,'RATE','local charge review control','Usage has no agreed rate: '||c.meter||' '||c.month,c.owner,c.month from monthly_charges c where rate_id is null;
create view attention_board as
 select account,rule as kind,finding,owner,due_on from compliance_findings
 union all select a.code,'ISSUE',i.title,i.owner,i.due_on from issues i join accounts a on a.id=i.account_id where status='open'
 union all select a.code,'STALE','No usage window ended within seven days',a.owner,current_date from accounts a where exists(select 1 from rate_cards r where r.account_id=a.id and r.valid_from<=current_date and coalesce(r.valid_to,'infinity'::date)>current_date) and not exists(select 1 from active_usage u where u.account_id=a.id and u.period_end>now()-interval '7 days');
create view statement_register as select s.id,a.code as account,s.month,s.currency,s.total_cents,s.prepared_by,
 case when ap.id is null then 'draft' else 'approved' end as status,ap.reviewed_by,s.created_at
 from statements s join accounts a on a.id=s.account_id left join approvals ap on ap.statement_id=s.id;
alter table accounts enable row level security;
revoke all on accounts from public;
create trigger audit_accounts after insert or update on accounts for each row execute function audit_change();
create trigger touch_accounts before update on accounts for each row execute function touch_updated();
create trigger no_delete_accounts before delete on accounts for each row execute function immutable_record();
alter table meters enable row level security;
revoke all on meters from public;
create trigger audit_meters after insert or update on meters for each row execute function audit_change();
create trigger immutable_meters before update or delete on meters for each row execute function immutable_record();
alter table rate_cards enable row level security;
revoke all on rate_cards from public;
create trigger audit_rate_cards after insert or update on rate_cards for each row execute function audit_change();
create trigger immutable_rate_cards before update or delete on rate_cards for each row execute function immutable_record();
alter table import_batches enable row level security;
revoke all on import_batches from public;
create trigger audit_import_batches after insert or update on import_batches for each row execute function audit_change();
create trigger immutable_import_batches before update or delete on import_batches for each row execute function immutable_record();
alter table usage_records enable row level security;
revoke all on usage_records from public;
create trigger audit_usage_records after insert or update on usage_records for each row execute function audit_change();
create trigger immutable_usage_records before update or delete on usage_records for each row execute function immutable_record();
alter table voids enable row level security;
revoke all on voids from public;
create trigger audit_voids after insert or update on voids for each row execute function audit_change();
create trigger immutable_voids before update or delete on voids for each row execute function immutable_record();
alter table issues enable row level security;
revoke all on issues from public;
create trigger audit_issues after insert or update on issues for each row execute function audit_change();
create trigger touch_issues before update on issues for each row execute function touch_updated();
create trigger no_delete_issues before delete on issues for each row execute function immutable_record();
alter table notes enable row level security;
revoke all on notes from public;
create trigger audit_notes after insert or update on notes for each row execute function audit_change();
create trigger immutable_notes before update or delete on notes for each row execute function immutable_record();
alter table statements enable row level security;
revoke all on statements from public;
create trigger audit_statements after insert or update on statements for each row execute function audit_change();
create trigger immutable_statements before update or delete on statements for each row execute function immutable_record();
alter table approvals enable row level security;
revoke all on approvals from public;
create trigger audit_approvals after insert or update on approvals for each row execute function audit_change();
create trigger immutable_approvals before update or delete on approvals for each row execute function immutable_record();
alter table audit_log enable row level security;
revoke all on audit_log from public;
create trigger immutable_audit_log before update or delete on audit_log for each row execute function immutable_record();
revoke all on active_usage,monthly_usage,monthly_charges,compliance_findings,attention_board,statement_register from public;
