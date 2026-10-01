import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createEngine} from '../desktop/engine';
import type {ModelClient, ModelResult, ToolCall} from '../desktop/providers';
import type {Bot, Chat, RuntimeService} from '../shared/types';

const result=(text:string,calls:ToolCall[]=[]):ModelResult=>({text,calls,inputTokens:10,outputTokens:5});
const call=(name:string,args:Record<string,unknown>):ToolCall=>({id:crypto.randomUUID(),name,arguments:args});
function fakeRuntime(){
  const commands:string[]=[];
  const files=new Map<string,string>();
  const runtime:RuntimeService={
    status:async()=>({available:true,imageReady:true,message:'Test runtime'}),
    buildImage:async()=>({available:true,imageReady:true,message:'Test runtime'}),
    ensure:async botId=>({botId,status:'running'}),inspect:async botId=>({botId,status:'running'}),stop:async()=>{},
    exec:async(botId,command)=>{commands.push(botId+':'+command);return {stdout:'verified',stderr:'',exitCode:0};},
    listFiles:async()=>[],readFile:async(botId,file)=>files.get(botId+file)||'',
    writeFile:async(botId,file,text)=>{files.set(botId+file,text);},
    shareFile:async(from,file,to,target)=>{files.set(to+target,files.get(from+file)||'');},
    importFile:async()=>{},exportFile:async()=>{},screenshot:async()=>'',
  };
  return {runtime,commands,files};
}
async function setup(modelClient:ModelClient,now?:()=>Date){
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'ibot-engine-test-'));
  const fake=fakeRuntime();
  const options={dataDir,runtime:fake.runtime,modelClient,scheduler:false,now,emit:()=>{},encrypt:(s:string)=>Buffer.from(s).toString('base64'),decrypt:(s:string)=>Buffer.from(s,'base64').toString()};
  const engine=createEngine(options);
  await engine.invoke('provider.save',{provider:'compatible',model:'test-model',baseUrl:'http://localhost:1234/v1'});
  return {engine,options,...fake};
}
async function waitUntil(check:()=>boolean){for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}assert.fail('Expected state did not arrive');}

test('real orchestration routes handoffs, workspace ownership, memory and verification',async t=>{
  let chiefTurns=0;
  const {engine,options,files}=await setup(async request=>{
    if(request.system.startsWith('You are Researcher'))return result('Evidence collected.',[...(request.messages.some(m=>m.role==='tool')?[]:[call('write_file',{path:'/workspace/evidence.md',content:'Actual test evidence'})])]);
    if(request.system.startsWith('You are Verifier'))return result('PASS: the supplied file evidence contains Actual test evidence.');
    chiefTurns++;
    if(chiefTurns===1)return result('',[call('create_bot',{name:'Researcher',role:'Find evidence'})]);
    if(chiefTurns===2){const bot=engine.getState().bots.find(b=>b.name==='Researcher')!;return result('',[call('delegate',{botId:bot.id,task:'Write the evidence file.'})]);}
    if(chiefTurns===3)return result('',[call('save_memory',{memory:'Prefer cited briefings.'})]);
    return result('Prepared the evidence; independent verification reported PASS.');
  });
  t.after(()=>engine.shutdown());
  const chat=await engine.invoke('chat.create',{}) as Chat;
  await engine.invoke('chat.send',{chatId:chat.id,content:'Research this and save evidence.'});
  await engine.waitForIdle();
  const state=engine.getState(),researcher=state.bots.find(b=>b.name==='Researcher')!;
  assert.equal(state.chats[0].status,'idle');
  assert(state.bots[0].completedAt&&Number.isFinite(Date.parse(state.bots[0].completedAt)),'A successful run retains its completion signal after the chat stops running');
  assert.equal(files.get(researcher.id+'/workspace/evidence.md'),'Actual test evidence');
  assert.equal(files.has('chief/workspace/evidence.md'),false);
  assert(state.messages.some(m=>m.content.includes('returned their result to Chief')));
  assert(state.messages.some(m=>m.botId!==researcher.id&&m.content.startsWith('PASS:')));
  assert.equal(state.bots[0].memory,'Prefer cited briefings.');
  assert(state.usage.length>=7);
  await engine.shutdown();
  const restored=createEngine(options);t.after(()=>restored.shutdown());
  assert.equal(restored.getState().bots[0].memory,'Prefer cited briefings.');
  assert.equal(restored.getState().messages.length,state.messages.length);
});

test('approval blocks execution, pause cancels it, stale approval cannot execute',async t=>{
  const {engine,commands}=await setup(async()=>result('',[call('run_shell',{command:'echo hello',purpose:'Say hello'})]));
  t.after(()=>engine.shutdown());
  const chat=await engine.invoke('chat.create',{}) as Chat;
  await engine.invoke('chat.send',{chatId:chat.id,content:'Say hello'});
  await waitUntil(()=>engine.getState().approvals.length>0);
  assert.equal(commands.length,0);
  const approval=engine.getState().approvals[0];
  await engine.invoke('chat.pause',{chatId:chat.id});
  assert.equal(engine.getState().chats[0].status,'paused');
  assert.equal(engine.getState().approvals[0].status,'denied');
  await assert.rejects(engine.invoke('approval.resolve',{id:approval.id,approved:true}),/no longer pending/);
  assert.equal(commands.length,0);
});

test('approved tool runs exactly once and blocking rules take precedence',async t=>{
  let turns=0;
  const {engine,commands}=await setup(async()=>++turns===1?result('',[call('run_shell',{command:'echo hello'})]):result('Done'));
  t.after(()=>engine.shutdown());
  await engine.invoke('settings.update',{maxBots:1});
  const chat=await engine.invoke('chat.create',{}) as Chat;
  await engine.invoke('chat.send',{chatId:chat.id,content:'Say hello'});
  await waitUntil(()=>engine.getState().approvals.length>0);
  await engine.invoke('approval.resolve',{id:engine.getState().approvals[0].id,approved:true});
  await engine.waitForIdle();assert.equal(commands.length,1);
  turns=0;
  await engine.invoke('settings.update',{autoReview:false,rules:[{id:'allow',action:'*',policy:'allow'},{id:'block',action:'shell',policy:'block'}]});
  await engine.invoke('chat.send',{chatId:chat.id,content:'Try again'});
  await engine.waitForIdle();assert.equal(commands.length,1);
  assert(engine.getState().messages.some(m=>m.content.includes('Blocked by your shell')));
});

test('routine runs once per scheduled minute and does not catch up on restart',async t=>{
  let current=new Date('2026-09-30T14:59:00Z'),requests=0;
  const {engine,options}=await setup(async()=>{requests++;return result('Routine complete');},()=>current);
  t.after(()=>engine.shutdown());
  await engine.invoke('routine.save',{botId:'chief',name:'Daily report',prompt:'Prepare daily report',time:'15:00',days:[3],timezone:'UTC',enabled:true});
  await engine.tick();assert.equal(requests,0);
  current=new Date('2026-09-30T15:00:10Z');
  await engine.tick();await engine.waitForIdle();await engine.tick();
  assert.equal(requests,1);assert.equal(engine.getState().chats.length,1);
  await engine.shutdown();
  const restored=createEngine(options);t.after(()=>restored.shutdown());
  await restored.tick();assert.equal(requests,1);
});

test('failed runs keep a blocked avatar until a successful retry, without false completion',async t=>{
  let fail=true;
  const {engine}=await setup(async()=>{if(fail)throw new Error('Fixture provider unavailable');return result('Recovered');});t.after(()=>engine.shutdown());
  const chat=await engine.invoke('chat.create',{}) as Chat;
  await engine.invoke('chat.send',{chatId:chat.id,content:'Prepare a report.'});await engine.waitForIdle();
  assert.equal(engine.getState().bots[0].status,'error');assert.equal(engine.getState().bots[0].completedAt,undefined);
  fail=false;await engine.invoke('chat.send',{chatId:chat.id,content:'Try again.'});await engine.waitForIdle();
  assert.equal(engine.getState().bots[0].status,'done');assert(engine.getState().bots[0].completedAt);
});

test('appearance persists and credentials never appear in renderer state or plaintext disk',async t=>{
  const {engine,options}=await setup(async()=>result('Hello'));t.after(()=>engine.shutdown());
  const bot=await engine.invoke('bot.create',{name:'Writer',role:'Write',avatar:'bloom',color:'#123456'}) as Bot;
  assert.equal(bot.avatar,'bloom');assert.equal(bot.color,'#123456');
  await engine.invoke('provider.save',{provider:'openai',model:'configured-model',apiKey:'private-test-credential'});
  assert(!JSON.stringify(engine.getState()).includes('private-test-credential'));
  assert(!(await readFile(path.join(options.dataDir,'state.json'),'utf8')).includes('private-test-credential'));
  await engine.invoke('provider.save',{provider:'compatible',model:'local',baseUrl:'http://localhost:9999/v1'});
  assert.equal(engine.getState().settings.provider.hasKey,false);
});
