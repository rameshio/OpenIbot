import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {createEngine} from '../desktop/engine';
import {initialState} from '../desktop/store';
import {toolEffect} from '../desktop/engine-effects';
import {effectDecision} from '../desktop/effects';
import {normalizeConnectorTool,confirmedConnectorClass} from '../desktop/connector-effects';
import type {Connector,RuntimeService} from '../shared/types';

test('legacy saved catalogs gain a definition binding only after explicit user confirmation',async t=>{
 const dataDir=await mkdtemp(path.join(os.tmpdir(),'ibot-legacy-classification-')),state=initialState();
 state.connectors=[{id:'legacy',name:'Legacy',url:'https://fixture.invalid/mcp',enabled:false,hasToken:false,botIds:[],tools:[{name:'inspect',description:'Saved legacy tool',inputSchema:{type:'object'}}],toolEffects:{inspect:'read'}}];
 await writeFile(path.join(dataDir,'state.json'),JSON.stringify({state,secrets:{}}));
 const engine=createEngine({dataDir,runtime:{} as RuntimeService,emit:()=>{},scheduler:false,encrypt:s=>s,decrypt:s=>s});t.after(()=>engine.shutdown());
 let connector=engine.getState().connectors[0];assert.equal(confirmedConnectorClass(connector,connector.tools[0]),undefined);
 await engine.invoke('connector.classify',{id:'legacy',name:'inspect',effectClass:'read'});connector=engine.getState().connectors[0];assert(connector.tools[0].definitionHash,'The UI needs the host definition hash after legacy confirmation');assert.equal(confirmedConnectorClass(connector,connector.tools[0]),'read');
});

test('read-only server hints are suggestions; unconfirmed tools ask even under wildcard allow',()=>{
 const state=initialState();state.settings.autoReview=false;state.settings.rules=[{id:'allow',action:'*',policy:'allow'}];
 const tool=normalizeConnectorTool({name:'inspect',description:'Inspect records',inputSchema:{type:'object'},annotations:{readOnlyHint:true,destructiveHint:false},effectClass:'read'});
 const connector:Connector={id:'c',name:'Fixture',url:'https://fixture.invalid/mcp',enabled:true,hasToken:false,botIds:[],tools:[tool]};state.connectors.push(connector);
 const effect=toolEffect({id:'call',name:'connector_call',arguments:{connectorId:'c',name:'inspect',arguments:{}}},state.bots[0],{id:'run',chatId:'chat'},state);
 assert.equal(tool.suggestedClass,'read');assert.equal(effect.class,'send');assert.equal(effectDecision(effect,state.settings),'ask');
 state.settings.rules.push({id:'block',action:'write',policy:'block'});assert.equal(effectDecision(effect,state.settings),'deny');
 connector.toolEffects={inspect:'read'};assert.equal(confirmedConnectorClass(connector,tool),undefined,'Legacy classes without definition binding need confirmation');
});

test('an output schema change also voids a confirmed class',()=>{
 const tool=normalizeConnectorTool({name:'inspect',description:'Inspect',inputSchema:{type:'object'},outputSchema:{type:'object',properties:{result:{type:'string'}}}});
 const connector:Connector={id:'c',name:'Fixture',url:'https://fixture.invalid',enabled:true,hasToken:false,botIds:[],tools:[tool],toolEffects:{inspect:'read'},toolEffectHashes:{inspect:tool.definitionHash!}};
 const changed=normalizeConnectorTool({name:'inspect',description:'Inspect',inputSchema:{type:'object'},outputSchema:{type:'object',properties:{result:{type:'number'}}}});
 assert.equal(confirmedConnectorClass(connector,changed),undefined);
});

test('explicit classes are bound to connector/name/schema/description and new tools return to ask',async t=>{
 let version=1,description='Inspect records',name='inspect',extra=false,duplicate=false,toolCalls=0;
 const server=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk.toString();if(req.method!=='POST'){res.writeHead(405);res.end();return;}const m=JSON.parse(body);if(m.id===undefined){res.writeHead(202);res.end();return;}const result=m.method==='initialize'?{protocolVersion:m.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'Fixture',version:'1'}}:m.method==='tools/list'?{tools:[{name,description,inputSchema:{type:'object',description:String(version)},annotations:{readOnlyHint:true}},...(extra?[{name:'new_tool',description:'New',inputSchema:{type:'object'},annotations:{readOnlyHint:true}}]:[]),...(duplicate?[{name,description:'Ambiguous duplicate',inputSchema:{type:'object'}}]:[])]}:(toolCalls++,{content:[]});res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({jsonrpc:'2.0',id:m.id,result}));});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.closeAllConnections();server.close();});
 const runtime={} as RuntimeService;const engine=createEngine({dataDir:await mkdtemp(path.join(os.tmpdir(),'ibot-classification-')),runtime,emit:()=>{},scheduler:false,encrypt:s=>s,decrypt:s=>s});t.after(()=>engine.shutdown());
 const connector=await engine.invoke('connector.save',{name:'Fixture',url:`http://127.0.0.1:${(server.address() as {port:number}).port}/mcp`}) as Connector;
 const current=()=>engine.getState().connectors[0];
 await engine.invoke('connector.test',{id:connector.id});const hash=current().tools[0].definitionHash;
 await engine.invoke('connector.classify',{id:connector.id,name:'inspect',effectClass:'read',definitionHash:hash});
 await engine.invoke('connector.test',{id:connector.id});assert.equal(confirmedConnectorClass(current(),current().tools[0]),'read');
 assert.equal(current().toolEffectHashes?.inspect,hash);assert.equal(toolCalls,0,'Classification never calls a tool');
 version++;await engine.invoke('connector.test',{id:connector.id});assert.equal(confirmedConnectorClass(current(),current().tools[0]),undefined);
 await assert.rejects(engine.invoke('connector.classify',{id:connector.id,name:'inspect',effectClass:'read',definitionHash:hash}),/changed/i);
 for(const change of [()=>{description='Different purpose';},()=>{name='renamed';}]){
  await engine.invoke('connector.classify',{id:connector.id,name,effectClass:'write',definitionHash:current().tools[0].definitionHash});change();await engine.invoke('connector.test',{id:connector.id});assert.equal(confirmedConnectorClass(current(),current().tools[0]),undefined);
 }
 extra=true;await engine.invoke('connector.test',{id:connector.id});const tool=current().tools.find(t=>t.name==='new_tool')!;assert.equal(confirmedConnectorClass(current(),tool),undefined);
 const state=engine.getState(),effect=toolEffect({id:'call',name:'connector_call',arguments:{connectorId:connector.id,name:'new_tool',arguments:{}}},state.bots[0],{id:'run',chatId:'chat'},state);assert.equal(effectDecision(effect,state.settings),'ask');assert.equal(toolCalls,0);
 await engine.invoke('connector.classify',{id:connector.id,name,effectClass:'read',definitionHash:current().tools[0].definitionHash});duplicate=true;
 await assert.rejects(engine.invoke('connector.test',{id:connector.id}),/unique/i);assert.equal(confirmedConnectorClass(current(),current().tools[0]),undefined,'An ambiguous catalog must revoke cached authority');
});
