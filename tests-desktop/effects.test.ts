import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createEngine} from '../desktop/engine';
import {initialState} from '../desktop/store';
import {createServer} from 'node:http';
import {argsHash} from '../desktop/effects';
import {toolEffect} from '../desktop/engine-effects';
import {agentTools} from '../desktop/engine-tools';
import {jsonRequest} from '../desktop/providers';
import type {Chat, RuntimeService} from '../shared/types';

const reply=(calls:any[]=[])=>({text:calls.length?'':'Done',calls,inputTokens:0,outputTokens:0});
async function fixture(calls:any[], autoReview=false) {
  const performed:string[]=[];
  const runtime:RuntimeService={status:async()=>({available:true,imageReady:true,message:''}),buildImage:async()=>({available:true,imageReady:true,message:''}),ensure:async botId=>({botId,status:'running'}),inspect:async botId=>({botId,status:'running'}),stop:async()=>{},exec:async()=>{performed.push('exec');return {stdout:'',stderr:'',exitCode:0};},listFiles:async()=>{performed.push('read');return [];},readFile:async()=>{performed.push('read');return 'file';},writeFile:async()=>{performed.push('write');},shareFile:async()=>{performed.push('share');},importFile:async()=>{performed.push('import');},exportFile:async()=>{},screenshot:async()=>{performed.push('read');return '';}};
  let turns=0;
  const options={dataDir:await mkdtemp(path.join(os.tmpdir(),'ibot-effects-')),runtime,emit:()=>{},scheduler:false,encrypt:(s:string)=>s,decrypt:(s:string)=>s,modelClient:async()=>reply(turns++===0?calls:[])};
  const engine=createEngine(options);
  await engine.invoke('settings.update',{autoReview,maxBots:1});
  await engine.invoke('provider.save',{provider:'compatible',model:'fixture',baseUrl:'http://localhost:1234/v1'});
  const chat=await engine.invoke('chat.create',{}) as Chat;
  return {engine,chat,performed,runtime,options};
}
async function waitFor(check:()=>boolean){for(let i=0;i<200;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,5));}assert.fail('Expected authorization state');}
const tool=(name:string,args:Record<string,unknown>)=>({id:crypto.randomUUID(),name,arguments:args});

test('approval presentation exposes authoritative class, purpose, target and current arguments without persisting payload',async t=>{
  const args={path:'report.txt',content:'private-fixture-content',approvalPurpose:'Save the report requested by the user.'};
  const f=await fixture([tool('write_file',args)],true);t.after(()=>f.engine.shutdown());
  await f.engine.invoke('chat.send',{chatId:f.chat.id,content:'Save my report'});await waitFor(()=>f.engine.getState().approvals.some(a=>a.status==='pending'));
  const a=f.engine.getState().approvals.find(a=>a.status==='pending')!;
  assert.equal(a.effect?.class,'write');assert.deepEqual((a as any).presentation.args,args);assert.equal((a as any).presentation.purpose,args.approvalPurpose);assert.equal((a as any).presentation.purposeSource,'model');assert.match((a as any).presentation.target,/report.txt/);
  assert(!(await readFile(path.join(f.options.dataDir,'state.json'),'utf8')).includes('private-fixture-content'));
  await f.engine.invoke('approval.resolve',{id:a.id,approved:false});await f.engine.waitForIdle();
});

test('chat approval reuses exact calls only in its chat and always approval is rejected for writes',async t=>{
  const call=tool('write_file',{path:'report.txt',content:'report'}),f=await fixture([call,call],true);t.after(()=>f.engine.shutdown());
  await f.engine.invoke('chat.send',{chatId:f.chat.id,content:'Save report twice'});await waitFor(()=>f.engine.getState().approvals.some(a=>a.status==='pending'));
  const a=f.engine.getState().approvals.find(a=>a.status==='pending')!;
  await assert.rejects(f.engine.invoke('approval.resolve',{id:a.id,approved:true,alwaysTool:true}),/read/i);
  await f.engine.invoke('approval.resolve',{id:a.id,approved:true,scope:'chat'});await f.engine.waitForIdle();assert.deepEqual(f.performed,['write','write']);assert.equal(f.engine.getState().approvals.length,1);
  let turn=0;f.options.modelClient=async()=>reply(turn++===0?[call]:[]);
  const other=await f.engine.invoke('chat.create',{}) as Chat;await f.engine.invoke('chat.send',{chatId:other.id,content:'Save report'});await waitFor(()=>f.engine.getState().approvals.some(a=>a.status==='pending'));
  assert.equal(f.engine.getState().approvals.at(-1)!.chatId,other.id);await f.engine.invoke('chat.pause',{chatId:other.id});
});

test('saved read confirmation survives restart, issues exact grants, and changed connector schema revokes it',async t=>{
  let schema=1,called=0;const server=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk.toString();if(req.method!=='POST'){res.writeHead(405);res.end();return;}const m=JSON.parse(body);if(m.id===undefined){res.writeHead(202);res.end();return;}const result=m.method==='initialize'?{protocolVersion:m.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'Fixture',version:'1'}}:m.method==='tools/list'?{tools:[{name:'inspect',description:'Inspection',inputSchema:{type:'object',description:String(schema)}}]}:(called++,{content:[{type:'text',text:'Result'}]});res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({jsonrpc:'2.0',id:m.id,result}));});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.closeAllConnections();server.close();});
  const calls:any[]=[],f=await fixture(calls,true);t.after(()=>f.engine.shutdown());const connector=await f.engine.invoke('connector.save',{name:'Fixture',url:`http://127.0.0.1:${(server.address() as {port:number}).port}/mcp`}) as {id:string};
  await f.engine.invoke('connector.test',{id:connector.id});await f.engine.invoke('connector.classify',{id:connector.id,name:'inspect',effectClass:'read'});
  calls.push(tool('connector_call',{connectorId:connector.id,name:'inspect',arguments:{query:'one'}}));await f.engine.invoke('chat.send',{chatId:f.chat.id,content:'Inspect'});await waitFor(()=>f.engine.getState().approvals.some(a=>a.status==='pending'));
  await f.engine.invoke('approval.resolve',{id:f.engine.getState().approvals.find(a=>a.status==='pending')!.id,approved:true,alwaysTool:true});await f.engine.waitForIdle();assert.equal(called,1);await f.engine.shutdown();
  let turn=0;const engine=createEngine({...f.options,modelClient:async()=>reply(turn++===0?[tool('connector_call',{connectorId:connector.id,name:'inspect',arguments:{query:'two'}})]:[])});t.after(()=>engine.shutdown());await engine.invoke('chat.send',{chatId:f.chat.id,content:'Inspect again'});await engine.waitForIdle();assert.equal(called,2);assert.equal(engine.getState().approvals.at(-1)!.grant?.scope,'until');
  schema++;await engine.invoke('connector.test',{id:connector.id});await engine.invoke('connector.classify',{id:connector.id,name:'inspect',effectClass:'read'});turn=0;
  await engine.invoke('chat.send',{chatId:f.chat.id,content:'Inspect changed tool'});await waitFor(()=>engine.getState().approvals.some(a=>a.status==='pending'));assert.equal(called,2);await engine.invoke('chat.pause',{chatId:f.chat.id});
  await engine.invoke('settings.update',{rules:[{id:'block',action:'read',policy:'block'}]});turn=0;await engine.invoke('chat.send',{chatId:f.chat.id,content:'Inspect under block'});await engine.waitForIdle();assert.equal(called,2,'Saved read confirmation cannot override a block rule');
});

test('write and persist blocks cover file, memory, skill and schedule tools',async t=>{
  for(const [name,args,action] of [
    ['write_file',{path:'report.txt',content:'report'},'write'],
    ['save_memory',{memory:'preference'},'persist'],
    ['save_skill',{name:'Procedure',description:'A procedure',instructions:'Check output'},'persist'],
    ['schedule_routine',{name:'Report',prompt:'Report',time:'09:00',days:[1],timezone:'UTC'},'persist'],
  ] as const){
    const {engine,chat,performed}=await fixture([tool(name,args)]);t.after(()=>engine.shutdown());
    await engine.invoke('settings.update',{rules:[{id:'block',action,policy:'block'}]});
    await engine.invoke('chat.send',{chatId:chat.id,content:'Perform the fixture operation'});await engine.waitForIdle();
    assert.equal(performed.length,0,`${name} must not reach the runtime`);
    assert.equal(engine.getState().bots[0].memory,'');assert.equal(engine.getState().routines.length,0);
    assert.equal(engine.getState().skills.filter(s=>s.source!=='builtin').length,0);
    assert(engine.getState().messages.some(m=>/Blocked/.test(m.content)),`${name} must report policy denial`);
  }
});

test('file, memory and routine mutations wait for the existing approve/decline UI',async t=>{
  for(const [name,args] of [
    ['write_file',{path:'report.txt',content:'report'}],['save_memory',{memory:'preference'}],
    ['schedule_routine',{name:'Report',prompt:'Report',time:'09:00',days:[1],timezone:'UTC'}],
  ] as const){
    const {engine,chat,performed}=await fixture([tool(name,args)],true);t.after(()=>engine.shutdown());
    await engine.invoke('chat.send',{chatId:chat.id,content:'Perform the fixture operation'});
    await waitFor(()=>engine.getState().approvals.some(a=>a.status==='pending'));
    assert.equal(performed.length,0);assert.equal(engine.getState().bots[0].memory,'');assert.equal(engine.getState().routines.length,0);
    const approval=engine.getState().approvals.find(a=>a.status==='pending')!;
    await engine.invoke('approval.resolve',{id:approval.id,approved:true});await engine.waitForIdle();
    assert.equal(engine.getState().chats[0].status,'idle');
    if(name==='write_file')assert.deepEqual(performed,['write']);
    if(name==='save_memory')assert.equal(engine.getState().bots[0].memory,'preference');
    if(name==='schedule_routine')assert.equal(engine.getState().routines.length,1);
  }
});

test('changing policy immediately voids a pending approval and its resolver',async t=>{
  const {engine,chat,performed}=await fixture([tool('run_shell',{command:'echo fixture'})],true);t.after(()=>engine.shutdown());
  await engine.invoke('chat.send',{chatId:chat.id,content:'Run the fixture command'});
  await waitFor(()=>engine.getState().approvals.length>0);const pending=engine.getState().approvals[0];
  await engine.invoke('settings.update',{rules:[{id:'block',action:'execute',policy:'block'}]});
  await assert.rejects(engine.invoke('approval.resolve',{id:pending.id,approved:true}),/no longer pending/);
  await engine.waitForIdle();assert.deepEqual(performed,[]);assert.equal(engine.getState().approvals[0].status,'denied');
});

test('execute rules cover shell, browser and computer, with legacy categories retained',async t=>{
  for(const [name,args] of [['run_shell',{command:'echo fixture'}],['browser_open',{url:'https://example.com'}],['computer',{action:'key',text:'Enter'}]] as const){
    const {engine,chat,performed}=await fixture([tool(name,args)]);t.after(()=>engine.shutdown());
    await engine.invoke('settings.update',{rules:[{id:'allow',action:'*',policy:'allow'},{id:'block',action:'execute',policy:'block'}]});
    await engine.invoke('chat.send',{chatId:chat.id,content:'Perform the fixture operation'});await engine.waitForIdle();assert.deepEqual(performed,[]);
  }
});

test('policy is checked again after provisioning and before the runtime call',async t=>{
  const {engine,chat,performed,runtime}=await fixture([tool('run_shell',{command:'echo fixture'})],true);t.after(()=>engine.shutdown());
  runtime.ensure=async botId=>{await engine.invoke('settings.update',{rules:[{id:'block',action:'shell',policy:'block'}]});return {botId,status:'running'};};
  await engine.invoke('chat.send',{chatId:chat.id,content:'Run the fixture command'});await waitFor(()=>engine.getState().approvals.length>0);
  await engine.invoke('approval.resolve',{id:engine.getState().approvals[0].id,approved:true});await engine.waitForIdle();assert.deepEqual(performed,[]);
});

test('unknown agent tools are denied even under a wildcard allow',async t=>{
  const {engine,chat}=await fixture([tool('settings.update',{autoReview:false})]);t.after(()=>engine.shutdown());
  await engine.invoke('settings.update',{rules:[{id:'allow',action:'*',policy:'allow'}]});
  await engine.invoke('chat.send',{chatId:chat.id,content:'Perform the fixture operation'});await engine.waitForIdle();
  assert(engine.getState().messages.some(m=>/Unclassified effect/.test(m.content)));
});

test('all raw execute transports recheck policy inside asynchronous runtime dispatch',async t=>{
  for(const [name,args] of [['run_shell',{command:'echo fixture'}],['browser_open',{url:'https://example.com'}],['computer',{action:'key',text:'Enter'}]] as const){
    const {engine,chat,performed,runtime}=await fixture([tool(name,args)]);t.after(()=>engine.shutdown());
    runtime.exec=async(_bot,_command,_signal,beforeEffect)=>{
      await engine.invoke('settings.update',{rules:[{id:'block',action:'execute',policy:'block'}]});
      beforeEffect?.();performed.push('exec');return {stdout:'',stderr:'',exitCode:0};
    };
    await engine.invoke('chat.send',{chatId:chat.id,content:'Perform the fixture operation'});await engine.waitForIdle();
    assert.deepEqual(performed,[],`${name} must retain its guard through runtime awaits`);
  }
});

// Authorization units use the same host-only path as the engine, with a controlled clock.
async function authorizerFixture(){
  const {createEffectAuthorizer}=await import('../desktop/effects');
  const settings=initialState().settings;let clock=Date.parse('2026-10-01T15:00:00Z'),asks=0;
  const auth=createEffectAuthorizer({settings:()=>settings,now:()=>clock,request:async()=>{asks++;return {approved:true,scope:'chat' as const,expiresAt:new Date(clock+1000).toISOString()};}});
  const effect={id:'file.write',transport:'file',class:'write' as const,actor:'agent' as const,actorId:'chief',chatId:'chat',taskId:'task',target:'/workspace/report.txt',args:{content:'one'},dataScope:['bot:chief']};
  return {auth,settings,effect,asks:()=>asks,advance:()=>{clock+=1001;}};
}
test('exact reusable grants bind arguments, actor, transport, target and data scope',async()=>{
  const f=await authorizerFixture();let executed=0;
  for(const effect of [f.effect,{...f.effect,args:{content:'one'}},{...f.effect,args:{content:'two'}},{...f.effect,target:'/workspace/other.txt'},{...f.effect,dataScope:['bot:other']},{...f.effect,actorId:'other'},{...f.effect,transport:'connector'}]){
    const lease=await f.auth.authorizeEffect(effect);await lease.execute(()=>{executed++;});
  }
  assert.equal(executed,7);assert.equal(f.asks(),6);
});
test('expired grants ask again and cannot execute even between approval and dispatch',async()=>{
  const f=await authorizerFixture();const lease=await f.auth.authorizeEffect(f.effect);f.advance();
  await assert.rejects(async()=>lease.execute(()=>assert.fail('Expired dispatch')),/expired/);
  await (await f.auth.authorizeEffect(f.effect)).execute(()=>{});assert.equal(f.asks(),2);
});
test('block beats ask beats allow across semantic classes and transports',async()=>{
  const f=await authorizerFixture();
  for(const transport of ['file','connector','memory','routine','media']){
    f.settings.rules=[{id:'allow',action:'*',policy:'allow'},{id:'ask',action:'write',policy:'ask'},{id:'block',action:'write',policy:'block'}];
    await assert.rejects(f.auth.authorizeEffect({...f.effect,transport}),/Blocked/);
  }
  f.settings.rules=[{id:'allow',action:'*',policy:'allow'},{id:'ask',action:'write',policy:'ask'}];
  await (await f.auth.authorizeEffect(f.effect)).execute(()=>{});assert.equal(f.asks(),1);
});
test('unclassified effects fail closed; typed user effects remain direct',async()=>{
  const f=await authorizerFixture();f.settings.autoReview=false;
  await assert.rejects(f.auth.authorizeEffect({...f.effect,class:undefined} as any),/Unclassified/);
  await assert.rejects(f.auth.authorizeEffect({...f.effect,class:'unknown'} as any),/Unclassified/);
  f.settings.rules=[{id:'block',action:'*',policy:'block'}];
  await (await f.auth.authorizeEffect({...f.effect,actor:'user'})).execute(()=>{});assert.equal(f.asks(),0);
});
test('policy version changes invalidate granted leases even when the new rule allows',async()=>{
  const f=await authorizerFixture();const lease=await f.auth.authorizeEffect(f.effect);
  f.settings.policyVersion++;f.settings.rules=[{id:'allow',action:'*',policy:'allow'}];
  await assert.rejects(async()=>lease.execute(()=>assert.fail('Stale dispatch')),/policy changed/i);
});

test('once, chat, task and until grants obey their lifecycle boundaries',async()=>{
  const {createEffectAuthorizer}=await import('../desktop/effects');
  for(const scope of ['once','chat','task','until'] as const){
    const settings=initialState().settings;let asks=0;const clock=Date.parse('2026-10-01T15:00:00Z');
    const auth=createEffectAuthorizer({settings:()=>settings,now:()=>clock,request:async()=>{asks++;return {approved:true,scope};}});
    const f=await authorizerFixture();
    for(const effect of [f.effect,f.effect,{...f.effect,taskId:'next-task'},{...f.effect,chatId:'next-chat',taskId:'next-task'}])await (await auth.authorizeEffect(effect)).execute(()=>{});
    assert.equal(asks,{once:4,chat:2,task:3,until:1}[scope]);
  }
});
test('argument key ordering is canonical and an authorization cannot be dispatched twice',async()=>{
  const f=await authorizerFixture();
  const lease=await f.auth.authorizeEffect({...f.effect,args:{a:1,b:2}});lease.execute(()=>{});
  assert.throws(()=>lease.execute(()=>assert.fail('Duplicate dispatch')),/already dispatched/);
  await (await f.auth.authorizeEffect({...f.effect,args:{b:2,a:1}})).execute(()=>{});assert.equal(f.asks(),1);
});
test('policy is rechecked after approval even if its version was not manually bumped',async()=>{
  const {createEffectAuthorizer}=await import('../desktop/effects');const f=await authorizerFixture();
  const auth=createEffectAuthorizer({settings:()=>f.settings,now:()=>Date.now(),request:async()=>{f.settings.rules=[{id:'block',action:'write',policy:'block'}];return {approved:true};}});
  await assert.rejects(auth.authorizeEffect(f.effect),/Blocked/);
});
test('every exposed tool has a host classification or an explicit unclassified connector denial',()=>{
  const state=initialState(),bot=state.bots[0];
  for(const tool of agentTools){
    const effect=toolEffect({id:'fixture',name:tool.name,arguments:{}},bot,{id:'run',chatId:'chat'},state);
    assert.equal(effect.actor,'agent');if(tool.name==='connector_call')assert.equal(effect.class,undefined);else assert(effect.class,`${tool.name} must be classified`);
  }
  const first=argsHash({b:2,a:1});assert.equal(first,argsHash({a:1,b:2}));
});
test('provider retries cannot dispatch after policy revocation',async t=>{
  let received=0,valid=true;const server=createServer((_req,res)=>{received++;res.writeHead(503,{'content-type':'application/json'});res.end('{}');});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.closeAllConnections();server.close();});
  await assert.rejects(jsonRequest(`http://127.0.0.1:${(server.address() as {port:number}).port}`,{},AbortSignal.timeout(5000),()=>{valid=false;},()=>{if(!valid)throw new Error('Policy revoked');}),/Policy revoked/);
  assert.equal(received,1);
});
test('invalid settings changes cannot disable review or replace policy without a version bump',async t=>{
  const {engine}=await fixture([],true);t.after(()=>engine.shutdown());const previous=engine.getState().settings;
  await assert.rejects(engine.invoke('settings.update',{autoReview:false,rules:[{id:'bad',action:'',policy:'allow'}]}));
  await assert.rejects(engine.invoke('settings.update',{autoReview:false,rules:null}));
  assert.equal(engine.getState().settings.autoReview,true);assert.equal(engine.getState().settings.policyVersion,previous.policyVersion);
  await engine.invoke('settings.update',{rules:[]});assert.equal(engine.getState().settings.policyVersion,previous.policyVersion+1);
});
test('file sharing honors read, write, send and upload blocks; user mutations remain direct',async t=>{
  for(const action of ['read','write','send','upload']){
    const f=await fixture([]);t.after(()=>f.engine.shutdown());await f.engine.invoke('settings.update',{maxBots:2});const target=await f.engine.invoke('bot.create',{name:'Other',role:'Other'}) as {id:string};await f.engine.invoke('settings.update',{maxBots:1});
    let turn=0;f.options.modelClient=async()=>reply(turn++===0?[tool('share_file',{path:'report.txt',targetBotId:target.id,targetPath:'report.txt'})]:[]);
    // Reopen with a fresh model dependency while retaining the user-created target.
    await f.engine.shutdown();const engine=createEngine(f.options);t.after(()=>engine.shutdown());
    await engine.invoke('settings.update',{rules:[{id:'block',action,policy:'block'}]});
    await engine.invoke('chat.send',{chatId:f.chat.id,content:'Share the fixture file'});await engine.waitForIdle();assert.deepEqual(f.performed,[]);
    await engine.invoke('bot.update',{id:'chief',memory:'User preference'});assert.equal(engine.getState().bots[0].memory,'User preference');
  }
});
test('per-connector read/write rules, unknown tools and classification changes are enforced',async t=>{
  let toolCalls=0,changes:undefined|(()=>Promise<void>);
  const server=createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk.toString();
    if(req.method!=='POST'){res.writeHead(405);res.end();return;}
    const message=JSON.parse(body);if(message.id===undefined){res.writeHead(202);res.end();return;}
    if(message.method==='initialize'&&changes){const work=changes;changes=undefined;await work();}
    const result=message.method==='initialize'?{protocolVersion:message.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'Fixture',version:'1'}}:message.method==='tools/list'?{tools:[{name:'inspect',description:'Fixture inspection',inputSchema:{type:'object'}},{name:'update',description:'Fixture update',inputSchema:{type:'object'}}]}:(toolCalls++,{content:[{type:'text',text:'Fixture result'}]});
    res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({jsonrpc:'2.0',id:message.id,result}));
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.closeAllConnections();server.close();});
  const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/mcp`;
  for(const name of ['inspect','update']){
    const before=toolCalls;
    const calls:any[]=[];const f=await fixture(calls);t.after(()=>f.engine.shutdown());
    const connector=await f.engine.invoke('connector.save',{name:'Fixture',url}) as {id:string};await f.engine.invoke('connector.test',{id:connector.id});
    calls.push(tool('connector_call',{connectorId:connector.id,name,arguments:{}}));
    await f.engine.invoke('settings.update',{rules:[{id:'allow',action:'*',policy:'allow'}]});
    await f.engine.invoke('chat.send',{chatId:f.chat.id,content:'Use the fixture'});await waitFor(()=>f.engine.getState().approvals.some(a=>a.status==='pending'));assert.equal(toolCalls,before,'Unconfirmed tools must ask before tools/call');
    await f.engine.invoke('approval.resolve',{id:f.engine.getState().approvals.find(a=>a.status==='pending')!.id,approved:false});await f.engine.waitForIdle();assert.equal(toolCalls,before);
    const effectClass=name==='inspect'?'read':'write';await f.engine.invoke('connector.classify',{id:connector.id,name,effectClass});
    await f.engine.invoke('settings.update',{rules:[{id:'block',action:`connector:${connector.id}:${effectClass}`,policy:'block'}]});
    await f.engine.shutdown();
    // Reset fixture model turn state via a fresh injected client, while retaining the saved catalog.
    let turn=0;const runner=createEngine({...f.options,modelClient:async()=>reply(turn++===0?calls:[])});t.after(()=>runner.shutdown());
    await runner.invoke('chat.send',{chatId:f.chat.id,content:'Use the fixture'});await runner.waitForIdle();assert.equal(toolCalls,before);
    // An opposite-class block does not block a read tool, but legacy connector blocks still do.
    turn=0;await runner.invoke('settings.update',{rules:[{id:'allow',action:'*',policy:'allow'},{id:'block',action:`connector:${connector.id}:${effectClass==='read'?'write':'read'}`,policy:'block'}]});
    await runner.invoke('chat.send',{chatId:f.chat.id,content:'Use the fixture'});await runner.waitForIdle();assert.equal(toolCalls,before+1);
    turn=0;await runner.invoke('settings.update',{rules:[{id:'block',action:'connector',policy:'block'}]});await runner.invoke('chat.send',{chatId:f.chat.id,content:'Use the fixture'});await runner.waitForIdle();assert.equal(toolCalls,before+1);
    turn=0;await runner.invoke('settings.update',{rules:[{id:'allow',action:'*',policy:'allow'}]});
    changes=async()=>{await runner.invoke('connector.classify',{id:connector.id,name,effectClass:undefined});};
    await runner.invoke('chat.send',{chatId:f.chat.id,content:'Use the fixture'});await runner.waitForIdle();assert.equal(toolCalls,before+1,'Revocation during MCP initialization must prevent tools/call');
  }
});
