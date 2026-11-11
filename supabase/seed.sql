do $$
declare a uuid; b uuid; c uuid; m uuid; n uuid; start_month date:=date_trunc('month',current_date)::date;
begin
 if exists(select 1 from accounts where code='DEMO-NORTH') then return; end if;
 insert into accounts(code,name,owner,currency,review_on,retention_review_on) values('DEMO-NORTH','North Harbour Software','Mara','NZD',current_date-4,current_date+90) returning id into a;
 insert into accounts(code,name,owner,currency,review_on,retention_review_on) values('DEMO-SOUTH','South Ridge Software','Eli','AUD',current_date+30,current_date-8) returning id into b;
 insert into accounts(code,name,owner,currency,review_on,retention_review_on) values('DEMO-SILENT','Silent Stream Demo','Mara','NZD',current_date+30,current_date+90) returning id into c;
 insert into meters(code,name,unit) values('api_calls','Completed API calls','calls') returning id into m;
 insert into meters(code,name,unit) values('storage_gb_days','Storage consumed','GB days') returning id into n;
 insert into rate_cards(account_id,meter_id,valid_from,included_units,tier_units,unit_price,overage_price,base_cents,evidence) values
 (a,m,start_month-interval '1 month',1000,9000,0.01,0.005,2500,'Fictional demo contract A'),
 (b,m,start_month-interval '1 month',500,4500,0.02,0.01,0,'Fictional demo contract B'),
 (c,m,start_month-interval '1 month',0,0,0.01,0.01,0,'Fictional demo contract C');
 insert into usage_records(account_id,meter_id,period_start,period_end,quantity,source,source_ref) values
 (a,m,start_month,start_month+interval '1 day',15000,'demo','north-current'),
 (a,m,start_month-interval '1 month',start_month-interval '1 month'+interval '1 day',9000,'demo','north-previous'),
 (b,m,start_month,start_month+interval '1 day',7200,'demo','south-current'),
 (a,n,start_month,start_month+interval '1 day',42.125,'demo','storage-unrated');
 insert into issues(account_id,title,owner,due_on) values(a,'Compare source totals before charge review','Mara',current_date-3),(b,'Confirm storage meter start date','Eli',current_date+3);
 insert into notes(account_id,actor,body) values(a,'Demo operator','Fictional records only. Compare the source export before approval.');
end $$;
