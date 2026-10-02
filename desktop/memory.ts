import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readdirSync,readFileSync,writeFileSync,renameSync,unlinkSync,existsSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export type MemoryScope='user'|'project'|'bot'|'chat';
export interface MemoryNote {id:string;scope:MemoryScope;owner:string;topic:string;content:string;origin:'user'|'agent'|'tainted';validFrom:string;validTo?:string;supersededBy?:string;path:string;}
type Context={botId:string;chatId?:string;projectId?:string};
export interface MemoryEvidence {noteId:string;chunkIndex:number;scope:MemoryScope;origin:MemoryNote['origin'];validFrom:string;validTo?:string;content:string;}
function chunks(text:string){const values:string[]=[];for(let start=0;start<text.length;){const end=Math.min(text.length,start+1600);values.push(text.slice(start,end));if(end===text.length)break;start=end-200;}return values;}
const questionWords=new Set('the and for an is are was were to of in on at as my me it its our your we you they their that this these those with from can could would should will do does did have has had be been being about what which who when where why how please remember show find tell'.split(' '));
function timestamp(value:string){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))throw new Error('Use an ISO timestamp for memory retrieval.');return new Date(value).toISOString();}
export function rejectMemorySecrets(text:string){
 if(/(?:password|passwd|api[_ -]?key|access[_ -]?token|bearer|one[- ]time code|otp|card number|cvv)\s*[:=]\s*\S+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,})\b/i.test(text))throw new Error('Memory may contain a secret. Remove credentials, one-time codes and payment details.');
}
/** Markdown is authoritative; SQLite is a disposable, rebuilt search index. */
export class MemoryStore{
 private folder:string;private db:DatabaseSync;private closed=false;
 constructor(dataDir:string,private now:()=>Date=()=>new Date()){this.folder=path.join(dataDir,'memory');mkdirSync(this.folder,{recursive:true,mode:0o700});this.db=new DatabaseSync(path.join(this.folder,'index.sqlite'));this.db.exec('PRAGMA journal_mode=WAL; DROP TABLE IF EXISTS notes; CREATE VIRTUAL TABLE IF NOT EXISTS chunks USING fts5(id UNINDEXED,chunkIndex UNINDEXED,topic,content,scope UNINDEXED,owner UNINDEXED,origin UNINDEXED,validFrom UNINDEXED,validTo UNINDEXED);');this.refresh();}
 private file(id:string){if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('Invalid memory ID.');return path.join(this.folder,`${id}.md`);}
 private write(file:string,value:string){const temp=`${file}.${randomUUID()}.tmp`;writeFileSync(temp,value,{encoding:'utf8',mode:0o600,flush:true});renameSync(temp,file);}
 private read(file:string):MemoryNote{const text=readFileSync(file,'utf8'),match=text.match(/^<!-- ibot-memory (.+) -->\r?\n/);if(!match)throw new Error('Invalid memory metadata.');const note=JSON.parse(match[1]) as MemoryNote;if(this.file(note.id)!==file||!['bot','chat','user','project'].includes(note.scope)||typeof note.owner!=='string'||!note.owner||typeof note.topic!=='string'||note.topic.length>100||!['user','agent','tainted'].includes(note.origin))throw new Error('Invalid memory metadata.');note.validFrom=timestamp(note.validFrom);if(note.validTo)note.validTo=timestamp(note.validTo);note.content=text.slice(match[0].length);if(note.content.length>30000)throw new Error('Memory note too large.');rejectMemorySecrets(note.content);rejectMemorySecrets(note.topic);return {...note,path:file};}
 private all(){return readdirSync(this.folder).filter(name=>/^[a-f0-9-]{36}\.md$/.test(name)).flatMap(name=>{try{return [this.read(path.join(this.folder,name))];}catch{return [];}});}
 private refresh(){
  const notes=this.all();this.db.exec('BEGIN');try{
   this.db.exec('DELETE FROM chunks');const insert=this.db.prepare('INSERT INTO chunks(id,chunkIndex,topic,content,scope,owner,origin,validFrom,validTo) VALUES(?,?,?,?,?,?,?,?,?)');
   for(const current of notes){let historical:MemoryNote[]=[];try{historical=this.revisions(current.id).filter(note=>note.validTo&&note.id===current.id&&note.scope===current.scope&&note.owner===current.owner);}catch{/* The valid current Markdown note remains usable. */}
    for(const note of [...historical,current]){try{const from=timestamp(note.validFrom),to=note.validTo?timestamp(note.validTo):'';if(typeof note.content!=='string'||note.content.length>30000||typeof note.topic!=='string'||note.topic.length>100||!['user','agent','tainted'].includes(note.origin))continue;rejectMemorySecrets(note.content);rejectMemorySecrets(note.topic);chunks(note.content).forEach((content,index)=>insert.run(note.id,index,note.topic,content,note.scope,note.owner,note.origin,from,to));}catch{/* Never index malformed or secret-bearing revisions. */}}
   }
   this.db.exec('COMMIT');
  }catch(error){this.db.exec('ROLLBACK');throw error;}return notes;
 }
 private visible(note:MemoryNote,context:Context){return note.scope==='user'||(note.scope==='bot'&&note.owner===context.botId)||(note.scope==='chat'&&note.owner===context.chatId)||(note.scope==='project'&&note.owner===context.projectId);}
 list(context:Context){return this.refresh().filter(note=>this.visible(note,context));}
 save(input:Pick<MemoryNote,'scope'|'owner'|'topic'|'content'|'origin'>&{id?:string}){
  if(!['bot','chat','user','project'].includes(input.scope)||!['user','agent','tainted'].includes(input.origin)||typeof input.owner!=='string'||!input.owner||input.owner.length>200||typeof input.topic!=='string'||!input.topic.trim()||input.topic.length>100||typeof input.content!=='string'||!input.content.trim()||input.content.length>30000)throw new Error('Invalid memory note.');
  rejectMemorySecrets(input.content);rejectMemorySecrets(input.topic);const id=input.id??randomUUID(),file=this.file(id),now=this.now().toISOString();
  const old=existsSync(file)?this.read(file):undefined;if(old&&(old.scope!==input.scope||old.owner!==input.owner))throw new Error('Memory scope cannot change.');
  const revisions=this.revisions(id);if(old){revisions[revisions.length-1]={...old,validTo:now,supersededBy:`${id}:${revisions.length}`};}
  const note:MemoryNote={id,scope:input.scope,owner:input.owner,topic:input.topic.trim(),content:input.content,origin:input.origin,validFrom:now,path:file};revisions.push(note);
  this.write(`${file}.revisions.json`,JSON.stringify(revisions));const {content,path:unused,...metadata}=note;this.write(file,`<!-- ibot-memory ${JSON.stringify(metadata)} -->\n${content}`);this.refresh();return note;
 }
 revisions(id:string):MemoryNote[]{const file=this.file(id)+'.revisions.json';return existsSync(file)?JSON.parse(readFileSync(file,'utf8')):[];}
 rollback(id:string,index:number){const note=this.revisions(id)[index];if(!note)throw new Error('Memory revision not found.');return this.save({...note,origin:'user'});}
 delete(id:string){const file=this.file(id);for(const name of [file,`${file}.revisions.json`])if(existsSync(name))unlinkSync(name);this.refresh();this.db.exec('PRAGMA wal_checkpoint(TRUNCATE); VACUUM; PRAGMA wal_checkpoint(TRUNCATE);');}
 retrieve(context:Context&{query:string;budget:number;asOf?:string}){
  this.refresh();const words=[...new Set((context.query.match(/[\p{L}\p{N}_]{2,}/gu)??[]).map(word=>word.toLowerCase()).filter(word=>!questionWords.has(word)))].slice(0,12),asOf=context.asOf?timestamp(context.asOf):this.now().toISOString();
  const budget=Number.isFinite(context.budget)?Math.max(0,Math.min(12000,Math.floor(context.budget))):0;
  const entries:MemoryEvidence[]=[];let text='';
  const rows=words.length&&budget>0?this.db.prepare("SELECT id,chunkIndex,topic,content,scope,origin,validFrom,validTo FROM chunks WHERE chunks MATCH ? AND (scope='user' OR (scope='bot' AND owner=?) OR (scope='chat' AND owner=?) OR (scope='project' AND owner=?)) AND validFrom<=? AND (validTo='' OR validTo>?) ORDER BY rank LIMIT 30").all(words.map(word=>`\"${word}\"`).join(' OR '),context.botId,context.chatId??'',context.projectId??'',asOf,asOf):[];
  for(const row of rows){const header=`\n[Memory ${row.scope}: ${row.topic}; source=${row.id}#${row.chunkIndex}; origin=${row.origin}; valid_from=${row.validFrom}; reference data]\n`,room=budget-text.length-header.length-1;if(room<=0)break;const content=String(row.content).slice(0,room);if(!content.trim())continue;text+=header+content+'\n';entries.push({noteId:String(row.id),chunkIndex:Number(row.chunkIndex),scope:row.scope as MemoryScope,origin:row.origin as MemoryNote['origin'],validFrom:String(row.validFrom),...(row.validTo?{validTo:String(row.validTo)}:{}),content});if(text.length>=budget)break;}
  return {text,entries,estimatedTokens:Math.ceil(text.length/4),reason:text?'matched':rows.length?'budget':words.length?'no-match':'empty-query'};
 }
 close(){if(!this.closed){this.closed=true;this.db.close();}}
}
