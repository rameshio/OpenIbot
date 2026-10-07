import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import type {Effect,ActionRecord} from '../shared/types';
import {argsHash,effectClasses} from './effects';

/** Trusted host metadata only: never arguments, payloads, errors or URL strings. */
export class ActionJournal {
 readonly path:string;private db:DatabaseSync;private closed=false;
 constructor(folder:string){
  mkdirSync(folder,{recursive:true,mode:0o700});this.path=path.join(folder,'action-journal.sqlite');this.db=new DatabaseSync(this.path);
  const version=Number(this.db.prepare('PRAGMA user_version').get()?.user_version);if(version>1){this.db.close();throw new Error('Action journal version is newer than this application. Preserve it and use a compatible application.');}
  this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS routes(seq INTEGER PRIMARY KEY, chatId TEXT NOT NULL, runId TEXT NOT NULL, botId TEXT NOT NULL, skillIds TEXT NOT NULL, reason TEXT NOT NULL, inputHash TEXT NOT NULL, createdAt TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS actions(seq INTEGER PRIMARY KEY, id TEXT UNIQUE NOT NULL, chatId TEXT NOT NULL, taskId TEXT NOT NULL, actorId TEXT NOT NULL, effectId TEXT NOT NULL, effectClass TEXT NOT NULL, transport TEXT NOT NULL, targetHash TEXT NOT NULL, argsHash TEXT NOT NULL, state TEXT NOT NULL, createdAt TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY, kind TEXT NOT NULL, actionId TEXT NOT NULL, createdAt TEXT NOT NULL);
   CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'Audit events are append-only'); END;
   CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'Audit events are append-only'); END;`);
  this.db.exec('PRAGMA user_version=1; BEGIN IMMEDIATE');try{for(const row of this.db.prepare("SELECT id FROM actions WHERE state='dispatched'").all()){this.db.prepare("UPDATE actions SET state='uncertain' WHERE id=?").run(row.id);this.event('recovered.uncertain',String(row.id));}this.db.exec('COMMIT');}catch(error){this.db.exec('ROLLBACK');this.db.close();throw error;}
 }
 private event(kind:string,id:string){this.db.prepare('INSERT INTO events(kind,actionId,createdAt) VALUES(?,?,?)').run(kind,id,new Date().toISOString());}
 begin(effect:Effect){
  const id=randomUUID(),identifier=(value:unknown)=>typeof value==='string'&&/^[a-z0-9_.:-]{1,100}$/i.test(value)?value:argsHash(value);
  this.db.exec('BEGIN IMMEDIATE');try{
   this.db.prepare('INSERT INTO actions(id,chatId,taskId,actorId,effectId,effectClass,transport,targetHash,argsHash,state,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,identifier(effect.chatId??''),identifier(effect.taskId??''),identifier(effect.actorId??effect.actor),effect.class?identifier(effect.id):'unclassified',effect.class&&effectClasses.includes(effect.class)?effect.class:'unclassified',identifier(effect.transport),argsHash(effect.target),argsHash(effect.args),'dispatched',new Date().toISOString());
   this.event('action.dispatched',id);this.db.exec('COMMIT');return id;
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 finish(id:string,state:'succeeded'|'failed'){
  this.db.exec('BEGIN IMMEDIATE');try{this.db.prepare("UPDATE actions SET state=? WHERE id=? AND state='dispatched'").run(state,id);this.event(`action.${state}`,id);this.db.exec('COMMIT');}catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 decision(effect:Effect,decision:'allow'|'deny'|'ask'){this.event(`policy.${decision}`,argsHash({id:effect.id,target:effect.target,args:effect.args}));}
 route(chatId:string,runId:string,botId:string,skillIds:string[],reason:string,content:string){this.db.prepare('INSERT INTO routes(chatId,runId,botId,skillIds,reason,inputHash,createdAt) VALUES(?,?,?,?,?,?,?)').run(chatId,runId,botId,JSON.stringify(skillIds),reason,argsHash(content),new Date().toISOString());this.event(`route.${reason}`,runId);}
 routes(){return this.db.prepare('SELECT * FROM routes ORDER BY seq DESC LIMIT 200').all();}
 hasUncertain(chatId:string){return !!this.db.prepare("SELECT id FROM actions WHERE chatId=? AND state='uncertain' LIMIT 1").get(chatId);}
 reconcile(id:string){
  this.db.exec('BEGIN IMMEDIATE');try{const result=this.db.prepare("UPDATE actions SET state='reconciled' WHERE id=? AND state='uncertain'").run(id);if(!result.changes)throw new Error('Uncertain action not found.');this.event('user.reconciled',id);this.db.exec('COMMIT');}catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 actions():ActionRecord[]{return this.db.prepare('SELECT id,chatId,taskId,actorId,effectId,effectClass,transport,targetHash,argsHash,state,createdAt FROM actions ORDER BY seq DESC LIMIT 200').all() as unknown as ActionRecord[];}
 events(){return this.db.prepare('SELECT seq,kind,actionId,createdAt FROM events ORDER BY seq DESC LIMIT 200').all();}
 close(){if(!this.closed){this.closed=true;this.db.close();}}
}
