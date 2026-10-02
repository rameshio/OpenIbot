import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import os from 'node:os';
import path from 'node:path';
import {ActionJournal} from '../desktop/action-journal';
import type {Effect} from '../shared/types';
const effect:Effect={id:'connector.call',transport:'connector',class:'send',actor:'agent',actorId:'chief',chatId:'chat',taskId:'task',target:'https://example.com/?token=fixture-private-value',args:{token:'fixture-private-value'},dataScope:[]};

test('journal writes intent before execution, stores hashes only and keeps audit events append-only',async t=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'ibot-journal-')),journal=new ActionJournal(folder);t.after(()=>journal.close());
 const id=journal.begin(effect);assert.equal(journal.actions()[0].state,'dispatched');journal.finish(id,'succeeded');assert.equal(journal.actions()[0].state,'succeeded');
 journal.decision(effect,'ask');
 const db=new DatabaseSync(journal.path);t.after(()=>db.close());assert.throws(()=>db.exec('DELETE FROM events'),/append-only/);assert.throws(()=>db.exec("UPDATE events SET kind='changed'"),/append-only/);
 for(const suffix of ['', '-wal']){const bytes=await readFile(journal.path+suffix).catch(()=>Buffer.from(''));assert(!bytes.toString().includes('fixture-private-value'),'Credentials/arguments never reach journal storage');}
});

test('forced process exit leaves an uncertain action that requires explicit reconciliation',async t=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'ibot-journal-crash-'));
 const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {ActionJournal} from './desktop/action-journal.ts';const j=new ActionJournal(process.argv[1]);j.begin(JSON.parse(process.argv[2]));process.exit(19);",folder,JSON.stringify(effect)],{cwd:process.cwd(),windowsHide:true});assert.equal(child.status,19);
 const recovered=new ActionJournal(folder);t.after(()=>recovered.close());const action=recovered.actions()[0];assert.equal(action.state,'uncertain');assert(recovered.hasUncertain('chat'));recovered.reconcile(action.id);assert(!recovered.hasUncertain('chat'));assert.equal(recovered.actions()[0].state,'reconciled');assert.throws(()=>recovered.reconcile('missing'));
});

test('a newer journal schema is preserved and cannot be silently downgraded',async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'ibot-journal-version-')),journal=new ActionJournal(folder);journal.close();const db=new DatabaseSync(journal.path);db.exec('PRAGMA user_version=2');db.close();
 assert.throws(()=>new ActionJournal(folder),/newer/);const preserved=new DatabaseSync(journal.path);assert.equal(preserved.prepare('PRAGMA user_version').get()?.user_version,2);preserved.close();
});
