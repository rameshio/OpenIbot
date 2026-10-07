import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {MemoryStore} from '../desktop/memory.ts';

/** Synthetic retrieval checks; no model calls, private profiles or external benchmark data. */
export async function evaluateMemory(Store=MemoryStore){
 const scenarios=[
  ['extraction',m=>m.save(note('Preferences','Favorite fruit is banana.')),m=>m.retrieve(query('fruit')),r=>r.text.includes('banana')],
  ['multiple-notes',m=>{m.save(note('ProjectAlpha','ProjectAlpha deadline is Friday.'));m.save(note('ProjectAlpha','ProjectAlpha owner is Mira.'));},m=>m.retrieve(query('ProjectAlpha')),r=>r.text.includes('Friday')&&r.text.includes('Mira')],
  ['knowledge-update',(m,time)=>{const n=m.save(note('Office','Office is Austin.'));time.set('2026-02-01');m.save({...n,content:'Office is Chicago.'});},m=>m.retrieve(query('Office')),r=>r.text.includes('Chicago')&&!r.text.includes('Austin')],
  ['historical-revision',(m,time)=>{const n=m.save(note('Office','Office is Austin.'));time.set('2026-02-01');m.save({...n,content:'Office is Chicago.'});},m=>m.retrieve({...query('Office'),asOf:'2026-01-15T00:00:00Z'}),r=>r.text.includes('Austin')&&!r.text.includes('Chicago')],
  ['missing-evidence',m=>m.save(note('Travel','Prefer trains.')),m=>m.retrieve(query('astronaut')),r=>r.text===''],
  ['long-note',m=>m.save(note('Manual','General manual text. '.repeat(300)+'Turbine serial ALPHA-7392. '+'General manual text. '.repeat(300))),m=>m.retrieve(query('Turbine serial')),r=>r.text.includes('ALPHA-7392')],
  ['scope-isolation',m=>m.save({...note('Private','Private constellation detail.'),owner:'other'}),m=>m.retrieve(query('constellation')),r=>r.text===''],
  ['invalid-budget',m=>m.save(note('Budget','Budget planning notes.')),m=>m.retrieve({...query('Budget'),budget:NaN}),r=>r.text===''],
  ['workflow-evidence',m=>m.save(note('Export workflow','When export is disabled, set a date range before exporting CSV.')),m=>m.retrieve(query('export disabled')),r=>r.text.includes('date range')],
  ['unsupported-premise',m=>m.save(note('Spreadsheet','Spreadsheet supports CSV imports.')),m=>m.retrieve(query('Salesforce synchronization')),r=>r.text===''],
 ];
 const results=[];
 for(const [name,prepare,retrieve,check] of scenarios){const folder=await mkdtemp(path.join(os.tmpdir(),'ibot-memory-eval-'));let now=new Date('2026-01-01T00:00:00Z'),store;
  try{store=new Store(folder,()=>now);prepare(store,{set:date=>{now=new Date(date+'T00:00:00Z');}});const result=retrieve(store);results.push({name,pass:check(result)&&result.text.length<=2200,characters:result.text.length});}
  finally{store?.close();if(path.dirname(path.resolve(folder))!==path.resolve(os.tmpdir())||!path.basename(folder).startsWith('ibot-memory-eval-'))throw new Error('Unexpected evaluation directory; refusing cleanup.');await rm(folder,{recursive:true,force:true});}
 }
 return {kind:'synthetic-retrieval-regression',passed:results.filter(r=>r.pass).length,total:results.length,results};
}
const note=(topic,content)=>({scope:'bot',owner:'chief',topic,content,origin:'user'});
const query=query=>({botId:'chief',query,budget:2200});
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){void evaluateMemory().then(result=>{console.log(JSON.stringify(result,null,2));if(result.passed!==result.total)process.exitCode=1;}).catch(()=>{console.error('Memory evaluation failed.');process.exitCode=1;});}
