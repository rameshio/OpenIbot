import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createEngine} from '../desktop/engine';
import {agentTools} from '../desktop/engine-tools';
import {toolEffect} from '../desktop/engine-effects';
import type {Bot,Chat,RuntimeService} from '../shared/types';
import {teamChats} from '../renderer/bot-activity';

async function fixture(t:any){
 const calls:any[]=[];let turn=0;const options={dataDir:await mkdtemp(path.join(os.tmpdir(),'ibot-management-')),runtime:{stop:async()=>{}} as unknown as RuntimeService,scheduler:false,emit:()=>{},encrypt:(v:string)=>v,decrypt:(v:string)=>v,modelClient:async()=>({text:turn++%2===0?'':'Done',calls:turn%2===1?calls:[],inputTokens:0,outputTokens:0})};
 const engine=createEngine(options);t.after(()=>engine.shutdown());const bot=await engine.invoke('bot.create',{name:'Specialist',role:'Research'}) as Bot;
 await engine.invoke('settings.update',{autoReview:false,maxBots:1});await engine.invoke('provider.save',{provider:'compatible',baseUrl:'http://localhost:1234/v1',model:'fixture'});const chat=await engine.invoke('chat.create',{}) as Chat;
 return {engine,bot,chat,calls,options,send:()=>engine.invoke('chat.send',{chatId:chat.id,content:'Manage my bots'})};
}
const call=(name:string,args:Record<string,unknown>)=>({id:crypto.randomUUID(),name,arguments:args});

test('delete all with normal verifier capacity leaves only the main bot and hides archived teams',async t=>{
 const f=await fixture(t);await f.engine.invoke('settings.update',{maxBots:8});
 const verifier=await f.engine.invoke('bot.create',{name:'Tony',role:'Verifier'}) as Bot;
 const team=await f.engine.invoke('chat.create',{title:'Help me organize',botIds:['chief',f.bot.id,verifier.id]}) as Chat;
 f.calls.push(call('delete_bots',{all:true}));await f.engine.invoke('chat.send',{chatId:team.id,content:'Delete all bots'});await f.engine.waitForIdle();
 const state=f.engine.getState();assert.deepEqual(state.bots.map(b=>b.id),['chief']);
 assert.equal(state.chats.find(c=>c.id===team.id)?.status,'idle');
 assert.deepEqual(teamChats(state.chats,state.bots,''),[]);
 assert.deepEqual(state.chats.find(c=>c.id===team.id)?.botIds,['chief',f.bot.id,verifier.id],'Archived participant references and history remain recoverable');
 const reply=state.messages.filter(m=>m.chatId===team.id&&m.role==='assistant').at(-1)!.content;
 assert.match(reply,/Specialist/);assert.match(reply,/Tony/);assert.match(reply,/Verified against saved bot state/);
 assert(!state.messages.some(m=>m.content.includes('checking the result before delivery')));
 await f.engine.shutdown();const restarted=createEngine(f.options);t.after(()=>restarted.shutdown());
 assert.deepEqual(restarted.getState().bots.map(b=>b.id),['chief']);
 assert.deepEqual(teamChats(restarted.getState().chats,restarted.getState().bots,''),[]);
});

test('repeated empty delete all does not create a new verifier',async t=>{
 const f=await fixture(t);await f.engine.invoke('settings.update',{maxBots:8});
 f.calls.push(call('delete_bots',{all:true}));await f.send();await f.engine.waitForIdle();await f.send();await f.engine.waitForIdle();
 assert.deepEqual(f.engine.getState().bots.map(b=>b.id),['chief']);
 assert.match(f.engine.getState().messages.filter(m=>m.role==='assistant').at(-1)!.content,/No specialist bots needed removal/);
});

test('mixed work after delete all does not automatically recreate a reviewer',async t=>{
 const f=await fixture(t);await f.engine.invoke('settings.update',{maxBots:8});
 f.calls.push(call('delete_bots',{all:true}),call('save_memory',{memory:'Prefer short answers.'}));await f.send();await f.engine.waitForIdle();
 const state=f.engine.getState();assert.deepEqual(state.bots.map(b=>b.id),['chief']);assert.equal(state.bots[0].memory,'Prefer short answers.');
 assert(state.messages.some(m=>m.content.includes('removed bots were not recreated')));
 assert(!state.messages.some(m=>m.content.includes('Verified against saved bot state')),'Mixed work must not receive removal-only verification');
});

test('retained reviewer sees latest request, successful tool results, and authoritative bot state',async t=>{
 const f=await fixture(t);
 for(let i=0;i<10;i++){await f.engine.invoke('chat.send',{chatId:f.chat.id,content:`Old discussion ${i}`});await f.engine.waitForIdle();}
 await f.engine.invoke('settings.update',{maxBots:8});const reviewer=await f.engine.invoke('bot.create',{name:'Audit',role:'Verifier'}) as Bot;
 await f.engine.shutdown();let turn=0,reviewed=false;
 const engine=createEngine({...f.options,modelClient:async request=>{
  if(request.system.startsWith('You are Audit')){
   reviewed=true;const evidence=request.messages[0].content;
   assert(evidence.includes('LATEST REQUEST: remove Specialist and remember my preference'));
   const context=JSON.parse(evidence.split('Conversation and tool results (latest 100 items): ')[1].split('\nSaved bot state: ')[0]);
   assert(context.some((item:any)=>item.calls?.some((tool:any)=>tool.name==='delete_bots')));
   assert(context.some((item:any)=>item.role==='tool'&&JSON.parse(item.content).restorable===true));
   assert(evidence.includes(`"removed":[{"id":"${f.bot.id}"`));
   assert(request.tools.some(tool=>tool.name==='list_bots'));
   return {text:JSON.stringify({verdict:'pass',checks:[{name:'Removal and preference',status:'pass',evidence:'Saved state and current tool results show removal and preference.'}]}),calls:[],inputTokens:0,outputTokens:0};
  }
  return {text:turn++===0?'':'Removed Specialist and saved the preference.',calls:turn===1?[call('delete_bots',{botIds:[f.bot.id]}),call('save_memory',{memory:'Prefer short answers.'})]:[],inputTokens:0,outputTokens:0};
 }});t.after(()=>engine.shutdown());
 await engine.invoke('chat.send',{chatId:f.chat.id,content:'LATEST REQUEST: remove Specialist and remember my preference'});await engine.waitForIdle();
 assert(reviewed);assert.deepEqual(engine.getState().bots.map(b=>b.id),['chief',reviewer.id]);assert.equal(engine.getState().chats.find(c=>c.id===f.chat.id)?.status,'idle');
});
async function pending(engine:ReturnType<typeof createEngine>){for(let i=0;i<200;i++){const a=engine.getState().approvals.find(a=>a.status==='pending');if(a)return a;await new Promise(r=>setTimeout(r,5));}assert.fail('Expected approval');}

test('bot management tools are exposed and edits execute through write authorization',async t=>{
 const f=await fixture(t);for(const name of ['list_bots','update_bot','delete_bots','restore_bot','set_main_bot'])assert(agentTools.some(tool=>tool.name===name),name);
 f.calls.push(call('update_bot',{botId:f.bot.id,name:'Spider-Man',role:'Research specialist',instructions:'Find sources.'}));await f.send();await f.engine.waitForIdle();assert.equal(f.engine.getState().bots.find(b=>b.id===f.bot.id)?.name,'Spider-Man');
 await f.engine.invoke('settings.update',{rules:[{id:'no-write',action:'write',policy:'block'}]});f.calls[0]=call('update_bot',{botId:f.bot.id,name:'Blocked name'});await f.send();await f.engine.waitForIdle();assert.equal(f.engine.getState().bots.find(b=>b.id===f.bot.id)?.name,'Spider-Man');
 for(const [name,effectClass] of [['list_bots','read'],['update_bot','write'],['delete_bots','delete'],['restore_bot','admin'],['set_main_bot','admin']] as const)assert.equal(toolEffect(call(name,{botId:f.bot.id}),f.engine.getState().bots[0],{id:'run',chatId:f.chat.id},f.engine.getState()).class,effectClass);
});

test('delete all requires approval, retains the coordinator and preserves recoverable history across restart',async t=>{
 const f=await fixture(t);await f.engine.invoke('routine.save',{botId:f.bot.id,name:'Routine',prompt:'Research',time:'12:00',days:[1],timezone:'UTC'});const old=await f.engine.invoke('chat.create',{botIds:[f.bot.id]}) as Chat;
 await f.engine.invoke('settings.update',{autoReview:true});f.calls.push(call('delete_bots',{all:true,approvalPurpose:'Remove all specialists as requested.'}));await f.send();const a=await pending(f.engine);assert.equal(a.effect?.class,'delete');assert.deepEqual(a.presentation?.args,{all:true,approvalPurpose:'Remove all specialists as requested.',targets:[{id:f.bot.id,name:'Specialist'}]});assert.equal(f.engine.getState().bots.length,2);
 await f.engine.invoke('approval.resolve',{id:a.id,approved:true});await f.engine.waitForIdle();assert.deepEqual(f.engine.getState().bots.map(b=>b.id),['chief']);assert.equal(f.engine.getState().routines[0].enabled,false);assert.deepEqual(f.engine.getState().chats.find(c=>c.id===old.id)?.botIds,[f.bot.id]);
 await f.engine.shutdown();const engine=createEngine(f.options);t.after(()=>engine.shutdown());assert.equal(engine.getState().bots.length,1);assert((engine.getState() as any).archivedBots.some((b:Bot)=>b.id===f.bot.id));await assert.rejects(engine.invoke('chat.send',{chatId:old.id,content:'Continue'}),/removed|Restore/i);
 await engine.invoke('settings.update',{maxBots:8});await engine.invoke('bot.restore',{id:f.bot.id});assert.equal(engine.getState().bots.find(b=>b.id===f.bot.id)?.name,'Specialist');assert.equal(engine.getState().routines[0].enabled,false,'Restoring a bot must not silently restart schedules');
});

test('delete is blocked by policy and invalid bot edits cannot partially apply',async t=>{
 const f=await fixture(t);await f.engine.invoke('settings.update',{rules:[{id:'no-delete',action:'delete',policy:'block'}]});f.calls.push(call('delete_bots',{all:true}));await f.send();await f.engine.waitForIdle();assert.equal(f.engine.getState().bots.length,2);
 await assert.rejects(f.engine.invoke('bot.update',{id:f.bot.id,name:'Changed',role:''}));assert.equal(f.engine.getState().bots.find(b=>b.id===f.bot.id)?.name,'Specialist');
 await assert.rejects(f.engine.invoke('bot.delete',{botIds:['chief']}),/main|coordinator/i);assert.equal(f.engine.getState().bots.length,2);
});

test('bulk removal binds approval to the displayed bot IDs despite later team changes',async t=>{
 const f=await fixture(t);await f.engine.invoke('settings.update',{autoReview:true,maxBots:8});f.calls.push(call('delete_bots',{all:true}));await f.send();const approval=await pending(f.engine);
 const later=await f.engine.invoke('bot.create',{name:'Later bot',role:'Research'}) as Bot;
 assert.deepEqual((approval.presentation?.args as any).targets,[{id:f.bot.id,name:'Specialist'}]);
 await f.engine.invoke('approval.resolve',{id:approval.id,approved:true});await f.engine.waitForIdle();assert(f.engine.getState().bots.some(bot=>bot.id===later.id));assert(!f.engine.getState().bots.some(bot=>bot.id===f.bot.id));
});
