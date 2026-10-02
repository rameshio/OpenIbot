import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {createEngine} from '../desktop/engine';
import type {Connector,Chat,RuntimeService} from '../shared/types';

async function fixture(t:any){
 let version=1;const methods:string[]=[];
 const server=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk.toString();if(req.method!=='POST'){res.writeHead(405);res.end();return;}const m=JSON.parse(body);methods.push(m.method);if(m.id===undefined){res.writeHead(202);res.end();return;}const result=m.method==='initialize'?{protocolVersion:m.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'Fixture',version:'1'}}:m.method==='tools/list'?{tools:[{name:'inspect',description:'Inspect records',inputSchema:{type:'object',description:String(version)},annotations:{readOnlyHint:true}}]}:{content:[{type:'text',text:'Result'}]};res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({jsonrpc:'2.0',id:m.id,result}));});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.closeAllConnections();server.close();});
 const dataDir=await mkdtemp(path.join(os.tmpdir(),'ibot-connector-lifecycle-')),options={dataDir,runtime:{} as RuntimeService,emit:()=>{},scheduler:false,encrypt:(s:string)=>s,decrypt:(s:string)=>s};
 const engine=createEngine(options);t.after(()=>engine.shutdown());const connector=await engine.invoke('connector.save',{name:'Fixture',url:`http://127.0.0.1:${(server.address() as {port:number}).port}/mcp`}) as Connector;
 return {engine,connector,options,methods,change:()=>version++};
}
async function pending(engine:ReturnType<typeof createEngine>){for(let i=0;i<200;i++){if(engine.getState().approvals.some(a=>a.status==='pending'))return;await new Promise(resolve=>setTimeout(resolve,5));}assert.fail('Expected approval');}

test('Refresh tools persists definitions and performs only tools/list without invoking a tool',async t=>{
 const f=await fixture(t);await f.engine.invoke('connector.test',{id:f.connector.id});
 const disk=JSON.parse(await readFile(path.join(f.options.dataDir,'state.json'),'utf8'));
 assert.equal(disk.state.connectors[0].tools[0].name,'inspect');assert(disk.state.connectors[0].tools[0].definitionHash);
 assert.deepEqual(f.methods.filter(m=>m.startsWith('tools/')),['tools/list']);
});

test('session start and first connector call per run relist tools, revoke changed definitions and log activity',{timeout:10000},async t=>{
 const f=await fixture(t);await f.engine.invoke('connector.test',{id:f.connector.id});await f.engine.invoke('connector.classify',{id:f.connector.id,name:'inspect',effectClass:'read'});await f.engine.invoke('settings.update',{autoReview:false,maxBots:1});await f.engine.invoke('provider.save',{provider:'compatible',model:'fixture',baseUrl:'http://localhost:1234/v1'});await f.engine.shutdown();
 let turn=0;const engine=createEngine({...f.options,modelClient:async()=>({text:turn++===0?'':'Done',calls:turn===1?[1,2].map(id=>({id:String(id),name:'connector_call',arguments:{connectorId:f.connector.id,name:'inspect',arguments:{}}})):[],inputTokens:0,outputTokens:0})});t.after(()=>engine.shutdown());
 await (engine as any).ready;
 assert.equal(f.methods.filter(m=>m==='tools/list').length,2,'App session start must refresh cached connectors');
 assert.equal(f.methods.filter(m=>m==='tools/call').length,0);
 const chat=await engine.invoke('chat.create',{}) as Chat;await engine.invoke('chat.send',{chatId:chat.id,content:'Inspect twice'});await engine.waitForIdle();
 assert.equal(f.methods.filter(m=>m==='tools/list').length,3,'First call refreshes once; second call uses that run catalog');assert.equal(f.methods.filter(m=>m==='tools/call').length,2);
 turn=0;f.change();const other=await engine.invoke('chat.create',{}) as Chat;await engine.invoke('chat.send',{chatId:other.id,content:'Inspect changed definition'});await pending(engine);
 assert.equal(f.methods.filter(m=>m==='tools/list').length,4);assert.equal(f.methods.filter(m=>m==='tools/call').length,2,'Changed tool must wait for fresh approval');
 assert.equal(engine.getState().connectors[0].toolEffects?.inspect,undefined);assert(engine.getState().messages.some(m=>m.chatId===other.id&&/catalog changed/i.test(m.content)));
 assert((engine.getState().connectors[0] as any).catalogEvents.some((e:any)=>/catalog changed/i.test(e.summary)));await engine.invoke('chat.pause',{chatId:other.id});
});
