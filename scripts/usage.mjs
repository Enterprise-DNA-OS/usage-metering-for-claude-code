#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv } from './lib/csv.mjs';
import { table as textTable } from './lib/format.mjs';
import { page, table, writeOut } from './lib/render.mjs';

export const reads = {
 accounts: 'select code,name,owner,currency,review_on,retention_review_on from accounts order by code',
 meters: 'select code,name,unit,aggregation from meters order by code',
 rates: `select a.code as account,m.code as meter,r.valid_from,r.valid_to,r.included_units,r.tier_units,r.unit_price,r.overage_price,r.base_cents,a.currency,r.evidence from rate_cards r join accounts a on a.id=r.account_id join meters m on m.id=r.meter_id order by a.code,m.code,r.valid_from`,
 'usage-round': `select a.code as account,m.code as meter,u.period_start,u.period_end,u.quantity,u.dimensions,u.source,u.source_ref,u.id from active_usage u join accounts a on a.id=u.account_id join meters m on m.id=u.meter_id order by u.period_start desc,a.code,m.code`,
 'monthly-charges': `select account,meter,month,currency,units,included_units,chargeable_units,charge_cents from monthly_charges order by month desc,account,meter`,
 overages: `select account,meter,month,units,included_units,chargeable_units,charge_cents,currency from monthly_charges where chargeable_units>0 and rate_id is not null order by month desc,account,meter`,
 'unpriced-usage': `select account,meter,month,units from monthly_charges where rate_id is null order by month,account,meter`,
 'quiet-accounts': `select account,owner,finding from attention_board where kind='STALE' order by account`,
 'usage-trend': `select a.code as account,m.code as meter,u.month,u.units,lag(u.units) over(partition by u.account_id,u.meter_id order by u.month) as previous_recorded_month_units from monthly_usage u join accounts a on a.id=u.account_id join meters m on m.id=u.meter_id order by a.code,m.code,u.month`,
 'dimension-review': `select a.code as account,m.code as meter,date_trunc('month',u.period_start at time zone 'UTC')::date as month,u.dimensions,sum(u.quantity) as units from active_usage u join accounts a on a.id=u.account_id join meters m on m.id=u.meter_id group by a.code,m.code,date_trunc('month',u.period_start at time zone 'UTC')::date,u.dimensions order by a.code,m.code,month`,
 'owner-workload': `select owner,count(*)::integer as findings,count(*) filter(where due_on<current_date)::integer as overdue from attention_board group by owner order by overdue desc,owner`,
 issues: `select i.id,a.code as account,i.title,i.owner,i.due_on,i.status,i.resolution from issues i join accounts a on a.id=i.account_id order by i.due_on,i.id`,
 'issues-due': `select a.code as account,i.title,i.owner,i.due_on from issues i join accounts a on a.id=i.account_id where i.status='open' and i.due_on<=current_date+7 order by i.due_on,a.code`,
 attention: 'select * from attention_board order by due_on,account,kind',
 compliance: 'select * from compliance_findings order by account,rule,finding',
 'import-history': 'select source,filename,sha256,row_count,created_at from import_batches order by created_at,id',
 statements: 'select * from statement_register order by month desc,account,created_at',
 'void-history': `select u.source_ref,a.code as account,v.actor,v.reason,v.created_at from voids v join usage_records u on u.id=v.usage_id join accounts a on a.id=u.account_id order by v.created_at`,
};
const help=`Usage Metering for Claude Code\nReads: ${Object.keys(reads).join(', ')}, account <ref>, audit <account>\nWrites: add account|meter|rate, record, void <usage-ref>, issue, resolve <issue>, review <account>, log <account>, draft-statement <account>, approve <statement>, weekly-review, draft-usage-letter <account>, import amberflo <csv> --map=<json> [--dry-run], export --out=<folder-name>\nRead docs/cli.md for flags. Every command accepts --json. Nothing sends or collects payment.`;
const stable = v => Array.isArray(v) ? v.map(stable) : v && typeof v==='object' && !(v instanceof Date) ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])) : v;
const hash = v => createHash('sha256').update(typeof v==='string'?v:JSON.stringify(stable(v))).digest('hex');
const need = (f,k) => {if(typeof f[k]!=='string'||!f[k].trim())throw Error(`Missing --${k}`);return f[k].trim();};
function decimal(v,label='quantity') {if(!/^(?:0|[1-9]\d{0,12})(?:\.\d{1,6})?$/.test(String(v)))throw Error(`${label} must be a nonnegative decimal with at most six places`);return String(v);}
function date(v) {if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Date must be a valid YYYY-MM-DD');return v;}
function instant(v) {if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(v)||!Number.isFinite(Date.parse(v)))throw Error('Timestamp requires an ISO date and explicit timezone');date(v.slice(0,10));return new Date(v).toISOString();}
function month(v){date(v);if(!v.endsWith('-01'))throw Error('Month must be YYYY-MM-01');return v;}
function obj(v){const x=typeof v==='string'?JSON.parse(v):v;if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Dimensions must be a JSON object');return x;}
function args(raw){const f={},p=[];for(const a of raw){if(a.startsWith('--')){const at=a.indexOf('=');const k=at<0?a.slice(2):a.slice(2,at);if(k in f)throw Error(`Repeated --${k}`);f[k]=at<0?true:a.slice(at+1);}else p.push(a);}return {f,p};}
const flagSets={
 add:['code','name','owner','currency','review-on','retention-on','unit','account','meter','from','to','included','tier','price','overage-price','base-cents','evidence'],
 record:['account','meter','from','to','quantity','ref','dimensions'],void:['reason','actor'],issue:['account','title','owner','due'],resolve:['reason','actor'],review:['on','retention-on','owner'],log:['actor','text'],
 'draft-statement':['month','actor'],approve:['actor','evidence'],import:['map','dry-run'],export:['out'],'draft-usage-letter':['month'],
};
export async function resolve(db,entity,ref){
 const config={accounts:['code','name'],meters:['code','name'],usage_records:['source_ref'],issues:['title'],statements:[]};
 if(!config[entity]||!ref)throw Error(`A ${entity} reference is required`);
 const cols=config[entity];const rows=await db.query(`select * from ${entity} where id::text ilike $1 ${cols.map(c=>`or ${c} ilike $1`).join(' ')}`,['%'+ref.replace(/[\\%_]/g,'\\$&')+'%']);
 const exact=rows.filter(r=>r.id===ref||cols.some(c=>String(r[c]).toLowerCase()===ref.toLowerCase()));const found=exact.length?exact:rows;
 if(found.length!==1)throw Error(`${found.length?'Ambiguous':'No matching'} ${entity}: ${ref}\n${found.map(r=>`${r.id}  ${cols.map(c=>r[c]).join('  ')}`).join('\n')}`);
 return found[0];
}
async function tx(db,fn,rollback=false){await db.exec('BEGIN ISOLATION LEVEL SERIALIZABLE');try{const v=await fn();await db.exec(rollback?'ROLLBACK':'COMMIT');return v;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function lock(db,id){await db.query('select id from accounts where id=$1 for update',[id]);}
async function chargeState(db,accountId,m){
 const lines=await db.query('select meter,unit,units,records,rate_id,included_units,tier_units,unit_price,overage_price,base_cents,chargeable_units,charge_cents from monthly_charges where account_id=$1 and month=$2 order by meter',[accountId,m]);
 if(!lines.length)throw Error('No usage or rate cards for this month');
 if(lines.some(r=>r.rate_id===null))throw Error('Usage has no agreed rate; resolve unpriced usage before drafting');
 const usage=await db.query(`select id,quantity,dimensions,period_start,period_end from active_usage where account_id=$1 and date_trunc('month',period_start at time zone 'UTC')::date=$2 order by id`,[accountId,m]);
 const [{total}]=await db.query('select sum(charge_cents)::text as total from monthly_charges where account_id=$1 and month=$2',[accountId,m]);
 if(BigInt(total)>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Statement amount exceeds safe integer range');
 return {lines,total:Number(total),fingerprint:hash({lines,usage})};
}
async function insertUsage(db,record){
 const existing=(await db.query('select * from usage_records where source=$1 and source_ref=$2',[record.source,record.source_ref]))[0];
 if(existing){
  const keys=['account_id','meter_id','period_start','period_end','quantity','dimensions'];
  const normal=(x,k)=>k.startsWith('period_')?new Date(x).toISOString():k==='quantity'?String(x).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, ''):x;
  if(keys.some(k=>JSON.stringify(stable(normal(existing[k],k)))!==JSON.stringify(stable(normal(record[k],k)))))throw Error('Source reference already exists with different usage');
  return {id:existing.id,result:'duplicate'};
 }
 const cols=Object.keys(record);const rows=await db.query(`insert into usage_records(${cols.join(',')}) values(${cols.map((_,i)=>'$'+(i+1)).join(',')}) returning id`,cols.map(k=>['dimensions','raw_record'].includes(k)?JSON.stringify(record[k]):record[k]));
 return {id:rows[0].id,result:'imported'};
}
function privateFolder(kind,name){if(!/^[a-zA-Z0-9_-]+$/.test(name))throw Error('Output name must contain only letters, digits, underscores or hyphens');const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,kind,name);return dir;}
export async function run(db,raw){
 const {f,p}=args(raw);const [cmd,ref,extra]=p;
 if(!cmd||cmd==='help'||f.help)return [{help}];
 const allowed=new Set(['json',...(flagSets[cmd]||[])]);for(const k of Object.keys(f))if(!allowed.has(k))throw Error(`Unknown flag --${k} for ${cmd}`);
 const maxPos=cmd==='import'?3:cmd==='add'?2:['account','audit','void','resolve','review','log','draft-statement','approve','draft-usage-letter'].includes(cmd)?2:1;
 if(p.length>maxPos)throw Error('Unexpected positional argument');
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='account'){const a=await resolve(db,'accounts',ref);return [{...a,rates:await db.query(reads.rates.replace('order by a.code,m.code,r.valid_from','where a.id=$1 order by m.code,r.valid_from'),[a.id]),notes:await db.query('select actor,body,created_at from notes where account_id=$1 order by created_at',[a.id])}];}
 if(cmd==='audit'){const a=await resolve(db,'accounts',ref);return db.query(`select entity,operation,record_id,before_record,after_record,created_at from audit_log where record_id=$1 or after_record->>'account_id'=$2 order by created_at,id`,[a.id,a.id]);}
 if(cmd==='add')return tx(db,async()=>{
  if(ref==='account')return db.query('insert into accounts(code,name,owner,currency,review_on,retention_review_on) values($1,$2,$3,$4,$5,$6) returning id,code',[need(f,'code'),need(f,'name'),need(f,'owner'),need(f,'currency'),date(need(f,'review-on')),date(need(f,'retention-on'))]);
  if(ref==='meter')return db.query('insert into meters(code,name,unit) values($1,$2,$3) returning id,code',[need(f,'code'),need(f,'name'),need(f,'unit')]);
  if(ref==='rate'){
   const a=await resolve(db,'accounts',need(f,'account')),m=await resolve(db,'meters',need(f,'meter'));
   const cents=need(f,'base-cents');if(!/^\d{1,12}$/.test(cents))throw Error('base-cents must be an integer below 1000000000000');
   return db.query(`insert into rate_cards(account_id,meter_id,valid_from,valid_to,included_units,tier_units,unit_price,overage_price,base_cents,evidence) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,[a.id,m.id,month(need(f,'from')),f.to?month(f.to):null,decimal(need(f,'included')),decimal(need(f,'tier')),decimal(need(f,'price')),decimal(need(f,'overage-price')),cents,need(f,'evidence')]);
  }throw Error('add requires account, meter or rate');
 });
 if(cmd==='record')return tx(db,async()=>{
  const a=await resolve(db,'accounts',need(f,'account')),m=await resolve(db,'meters',need(f,'meter'));await lock(db,a.id);
  return [await insertUsage(db,{account_id:a.id,meter_id:m.id,period_start:instant(need(f,'from')),period_end:instant(need(f,'to')),quantity:decimal(need(f,'quantity')),dimensions:obj(f.dimensions||'{}'),source:'manual',source_ref:need(f,'ref'),raw_record:{}})];
 });
 if(cmd==='void')return tx(db,async()=>{const u=await resolve(db,'usage_records',ref);return db.query('insert into voids(usage_id,actor,reason) values($1,$2,$3) returning id',[u.id,need(f,'actor'),need(f,'reason')]);});
 if(cmd==='issue')return tx(db,async()=>{const a=await resolve(db,'accounts',need(f,'account'));await lock(db,a.id);return db.query('insert into issues(account_id,title,owner,due_on) values($1,$2,$3,$4) returning id',[a.id,need(f,'title'),need(f,'owner'),date(need(f,'due'))]);});
 if(cmd==='resolve')return tx(db,async()=>{const i=await resolve(db,'issues',ref);if(i.status!=='open')throw Error('Issue is already resolved');return db.query(`update issues set status='resolved',resolution=$2,resolved_by=$3,resolved_at=now() where id=$1 returning id,status`,[i.id,need(f,'reason'),need(f,'actor')]);});
 if(cmd==='review')return tx(db,async()=>{const a=await resolve(db,'accounts',ref);if(!f.on&&!f['retention-on']&&!f.owner)throw Error('Supply --on, --retention-on or --owner');return db.query('update accounts set review_on=$2,retention_review_on=$3,owner=$4 where id=$1 returning code,review_on,retention_review_on,owner',[a.id,f.on?date(f.on):a.review_on,f['retention-on']?date(f['retention-on']):a.retention_review_on,f.owner?need(f,'owner'):a.owner]);});
 if(cmd==='log')return tx(db,async()=>{const a=await resolve(db,'accounts',ref);return db.query('insert into notes(account_id,actor,body) values($1,$2,$3) returning id',[a.id,need(f,'actor'),need(f,'text')]);});
 if(cmd==='draft-statement')return tx(db,async()=>{
  const a=await resolve(db,'accounts',ref),m=month(need(f,'month'));await lock(db,a.id);
  const s=await chargeState(db,a.id,m);
  return db.query('insert into statements(account_id,month,currency,lines,total_cents,fingerprint,prepared_by) values($1,$2,$3,$4,$5,$6,$7) returning id,month,currency,total_cents',[a.id,m,a.currency,JSON.stringify(s.lines),s.total,s.fingerprint,need(f,'actor')]);
 });
 if(cmd==='approve')return tx(db,async()=>{
  const s=await resolve(db,'statements',ref);await lock(db,s.account_id);
  const [a]=await db.query('select * from accounts where id=$1',[s.account_id]);
  const [{closed}]=await db.query("select $1::date < date_trunc('month',current_date)::date as closed",[s.month]);if(!closed)throw Error('Only a completed calendar month can be approved');
  const [{overdue}]=await db.query('select review_on<current_date as overdue from accounts where id=$1',[a.id]);if(overdue)throw Error('Account accuracy review overdue');
  if((await db.query("select id from issues where account_id=$1 and status='open'",[a.id])).length)throw Error('Resolve account issues before approval');
  const current=await chargeState(db,a.id,s.month);if(current.fingerprint!==s.fingerprint)throw Error('Statement is stale; draft it again from current records');
  return db.query('insert into approvals(statement_id,account_id,month,reviewed_by,evidence) values($1,$2,$3,$4,$5) returning id,month,reviewed_by',[s.id,a.id,s.month,need(f,'actor'),need(f,'evidence')]);
 });
 if(cmd==='import'){
  if(ref!=='amberflo'||!extra)throw Error('Use import amberflo <csv> --map=<json>');
  const input=fs.readFileSync(path.resolve(extra),'utf8'),mapping=obj(JSON.parse(fs.readFileSync(path.resolve(need(f,'map')),'utf8')));
  for(const k of ['account','meter','from','to','quantity','reference'])if(typeof mapping[k]!=='string'||!mapping[k].trim())throw Error(`Mapping requires ${k}`);
  const permitted=['account','meter','from','to','quantity','reference','dimensions'];for(const k of Object.keys(mapping))if(!permitted.includes(k))throw Error(`Unknown mapping key ${k}`);
  const rows=parseCsv(input);if(!rows.length)throw Error('CSV has no usage rows');
  for(const col of Object.values(mapping))if(!(col in rows[0]))throw Error(`CSV column missing: ${col}`);
  return tx(db,async()=>{
   const digest=hash(input);const prev=await db.query("select id,row_count from import_batches where source='amberflo' and sha256=$1",[digest]);if(prev.length)return [{result:'already imported',rows:prev[0].row_count}];
   const [batch]=await db.query("insert into import_batches(source,sha256,filename,mapping,row_count) values('amberflo',$1,$2,$3,$4) returning id",[digest,path.basename(extra),JSON.stringify(mapping),rows.length]);
   let imported=0,duplicates=0;
   for(const row of rows){
    const a=await resolve(db,'accounts',row[mapping.account]),m=await resolve(db,'meters',row[mapping.meter]);await lock(db,a.id);
    const sourceRef=row[mapping.reference].trim();if(!sourceRef)throw Error('Every row needs a stable reference');
    const out=await insertUsage(db,{account_id:a.id,meter_id:m.id,period_start:instant(row[mapping.from]),period_end:instant(row[mapping.to]),quantity:decimal(row[mapping.quantity]),dimensions:obj(mapping.dimensions?row[mapping.dimensions]:'{}'),source:'amberflo',source_ref:sourceRef,batch_id:batch.id,raw_record:row});
    if(out.result==='imported')imported++;else duplicates++;
   }
   return [{result:f['dry-run']?'dry run, rolled back':'imported',rows:rows.length,imported,duplicates,sha256:digest}];
  },Boolean(f['dry-run']));
 }
 if(cmd==='export')return tx(db,async()=>{
  const dir=privateFolder('exports',need(f,'out'));if(fs.existsSync(dir))throw Error('Export folder already exists');
  const names=['accounts','meters','rate_cards','import_batches','usage_records','voids','issues','notes','statements','approvals','audit_log','schema_migrations'];const records={};
  for(const t of names)records[t]=await db.query(`select * from ${t} order by ${t==='schema_migrations'?'name':'id'}`);
  fs.mkdirSync(dir,{recursive:true,mode:0o700});const data=JSON.stringify({format:'usage-metering-export-v1',exported_at:new Date().toISOString(),records},null,2)+'\n';
  fs.writeFileSync(path.join(dir,'records.json'),data,{mode:0o600,flag:'wx'});fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({file:'records.json',sha256:hash(data),counts:Object.fromEntries(names.map(t=>[t,records[t].length]))},null,2)+'\n',{mode:0o600,flag:'wx'});
  return [{folder:dir,sha256:hash(data)}];
 });
 if(cmd==='weekly-review'){
  const sections=[];for(const c of ['monthly-charges','attention','owner-workload'])sections.push({title:c.replaceAll('-',' '),html:table(await db.query(reads[c]))});
  return [{file:writeOut('drafts','weekly-review-'+randomUUID(),page({title:'Weekly usage and charge review',subtitle:'Draft for the operator. No invoices issued and nothing sent.',sections}))}];
 }
 if(cmd==='draft-usage-letter'){
  const a=await resolve(db,'accounts',ref),m=month(need(f,'month'));
  const rows=await db.query('select account,meter,month,units,charge_cents,currency from monthly_charges where account_id=$1 and month=$2 order by meter',[a.id,m]);
  if(!rows.length)throw Error('No records for that month');
  return [{file:writeOut('drafts','usage-letter-'+randomUUID(),page({title:'Usage explanation for review',subtitle:`${a.name}: ${m}. Draft only. Charges exclude tax and are not a payment request.`,sections:[{title:'Recorded consumption',html:table(rows)},{title:'Review notes',html:table(await db.query('select actor,body,created_at from notes where account_id=$1 order by created_at',[a.id]))}]}))}];
 }
 throw Error(`Unknown command ${cmd}. Use help.`);
}
export function format(rows){if(!rows.length)return '  (none)';const clean=rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,k.endsWith('_cents')?(v===null?'unpriced':(Number(v)/100).toFixed(2)):v instanceof Date?v.toISOString():v&&typeof v==='object'?JSON.stringify(v):v])));return textTable(clean,Object.keys(clean[0]).map(k=>({key:k,label:k.replace(/_cents$/,'').replaceAll('_',' ')})));}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const rows=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(rows,null,2):format(rows));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
