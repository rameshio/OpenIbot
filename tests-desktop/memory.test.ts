import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {MemoryStore} from '../desktop/memory';
test('Markdown memory persists, searches with FTS and isolates bot and chat scopes',async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'ibot-memory-')),memory=new MemoryStore(folder);
 const note=memory.save({scope:'bot',owner:'chief',topic:'Travel',content:'Prefer trains to airplanes',origin:'user'});
 memory.save({scope:'bot',owner:'other',topic:'Private',content:'Private project details',origin:'user'});
 memory.save({scope:'chat',owner:'another-chat',topic:'Chat note',content:'Private session details',origin:'user'});
 assert(memory.retrieve({botId:'chief',chatId:'chat',query:'trains',budget:1000}).text.includes('trains'));assert(!memory.retrieve({botId:'chief',chatId:'chat',query:'private',budget:1000}).text.includes('Private'));
 memory.close();const restored=new MemoryStore(folder);assert.equal(restored.list({botId:'chief',chatId:'chat'})[0].id,note.id);assert((await readFile(note.path,'utf8')).includes('Prefer trains'));restored.close();
});
test('edits supersede facts, rollback creates a revision, deletion removes files and search data',async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'ibot-memory-')),memory=new MemoryStore(folder);
 const note=memory.save({scope:'bot',owner:'chief',topic:'Preferences',content:'Old preference',origin:'user'});
 memory.save({...note,content:'New preference',origin:'agent'});assert.equal(memory.revisions(note.id).length,2);memory.rollback(note.id,0);assert.equal(memory.list({botId:'chief'})[0].content,'Old preference');
 memory.delete(note.id);assert.equal(memory.list({botId:'chief'}).length,0);assert(!memory.retrieve({botId:'chief',query:'preference',budget:1000}).text.includes('preference'));assert(!(await readdir(path.dirname(note.path))).some(name=>name.includes(note.id)));memory.close();
});
test('memory rejects recognizable secrets, reloads manual Markdown edits and respects budgets',async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'ibot-memory-')),memory=new MemoryStore(folder);
 for(const content of ['password: fixture-password','api_key=fixture-token','-----BEGIN PRIVATE KEY-----','one-time code: 123456'])assert.throws(()=>memory.save({scope:'bot',owner:'chief',topic:'Secret',content,origin:'user'}),/secret/i);
 const note=memory.save({scope:'bot',owner:'chief',topic:'Notes',content:'A useful note',origin:'user'});
 const text=await readFile(note.path,'utf8');await writeFile(note.path,text.replace('A useful note','Manually edited note'));assert(memory.retrieve({botId:'chief',query:'edited',budget:1000}).text.includes('Manually edited'));assert(memory.retrieve({botId:'chief',query:'edited',budget:50}).text.length<=50);memory.close();
});
