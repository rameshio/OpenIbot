import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {generateAvatar,listMediaModels,transcribeAudio,validateAudio} from '../desktop/media';
import {callConnector,signInConnector} from '../desktop/connectors';
import {createEngine} from '../desktop/engine';
import type {RuntimeService,ProviderSettings,Bot,Connector} from '../shared/types';

async function fixture(handler:(req:IncomingMessage,res:ServerResponse,body:string)=>void){const server=createServer(async(req,res)=>{const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(chunk);handler(req,res,Buffer.concat(chunks).toString());});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address() as {port:number};return {url:`http://127.0.0.1:${address.port}`,close:()=>{server.closeAllConnections();return new Promise<void>(r=>server.close(()=>r()));}};}
function json(res:ServerResponse,body:unknown,status=200){res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));}
const settings=(baseUrl:string,provider='openrouter'):ProviderSettings=>({provider,model:'fixture/chat',baseUrl,hasKey:true});
const signal=()=>AbortSignal.timeout(10000);

test('media discovery uses current OpenRouter endpoints and actual modality catalogs',async t=>{
 const urls:string[]=[];const api=await fixture((req,res)=>{urls.push(req.url!);assert.equal(req.headers.authorization,'Bearer fixture-key');json(res,{data:req.url?.startsWith('/images/')?[{id:'fixture/image',name:'Image model'}]:[{id:'fixture/stt',name:'Speech model',architecture:{output_modalities:['transcription']}},{id:'fixture/chat',architecture:{output_modalities:['text']}}]});});t.after(api.close);
 assert.deepEqual(await listMediaModels(settings(api.url),'fixture-key','image',signal()),[{id:'fixture/image',name:'Image model'}]);
 assert.deepEqual(await listMediaModels(settings(api.url),'fixture-key','transcription',signal()),[{id:'fixture/stt',name:'Speech model'}]);
 assert.deepEqual(urls,['/images/models','/models?output_modalities=transcription']);
});
test('transcription sends JSON to OpenRouter and multipart audio to OpenAI and Groq',async t=>{
 const requests:{url:string;headers:IncomingMessage['headers'];body:string}[]=[];const api=await fixture((req,res,body)=>{requests.push({url:req.url!,headers:req.headers,body});json(res,{text:'  Hello from speech.  '});});t.after(api.close);const audio=Buffer.from('explicit-fake-audio-fixture').toString('base64');
 for(const provider of ['openrouter','openai','groq'])assert.deepEqual(await transcribeAudio(settings(api.url,provider),'fixture-key','fixture/whisper',audio,'webm','en-US',signal()),{text:'Hello from speech.'});
 assert(requests.every(r=>r.url==='/audio/transcriptions'&&r.headers.authorization==='Bearer fixture-key'));
 assert.deepEqual(JSON.parse(requests[0].body),{model:'fixture/whisper',input_audio:{data:audio,format:'webm'},response_format:'json',language:'en'});
 for(const r of requests.slice(1)){assert(String(r.headers['content-type']).startsWith('multipart/form-data; boundary='));assert(r.body.includes('filename="voice.webm"'));assert(r.body.includes('explicit-fake-audio-fixture'));assert(r.body.includes('fixture/whisper'));}
 assert.throws(()=>validateAudio('data:audio/webm;base64,x','webm'),/empty or too large/);assert.throws(()=>validateAudio(audio,'svg'),/Unsupported/);
});
test('avatar generation is explicit, uses image APIs, refuses URL/vector outputs and does not retry spending',async t=>{
 const requests:any[]=[];let mode='ok';const api=await fixture((req,res,body)=>{requests.push({url:req.url,body:JSON.parse(body)});if(mode==='error')json(res,{error:'fixture-key secret echoed'},503);else json(res,{data:[mode==='url'?{url:'https://example.test/image.png'}:{b64_json:Buffer.from('fixture-png').toString('base64'),media_type:mode==='svg'?'image/svg+xml':'image/png'}]});});t.after(api.close);
 for(const provider of ['openrouter','openai'])assert((await generateAvatar(settings(api.url,provider),'fixture-key','fixture/image','A curious explorer',signal())).startsWith('data:image/png;base64,'));
 assert.equal(requests[0].url,'/images');assert.equal(requests[0].body.aspect_ratio,'1:1');assert.equal(requests[1].url,'/images/generations');assert.equal(requests[1].body.size,'1024x1024');
 mode='svg';await assert.rejects(generateAvatar(settings(api.url),'fixture-key','fixture/image','A bot',signal()),/raster/);
 mode='url';await assert.rejects(generateAvatar(settings(api.url),'fixture-key','fixture/image','A bot',signal()),/supported avatar/);
 mode='error';const count=requests.length;await assert.rejects(generateAvatar(settings(api.url),'fixture-key','fixture/image','A bot',signal()),e=>e instanceof Error&&e.message.includes('503')&&!e.message.includes('fixture-key'));assert.equal(requests.length,count+1);
});
function rpc(req:IncomingMessage,res:ServerResponse,body:string){if(req.method!=='POST'){res.writeHead(405);res.end();return;}const value=JSON.parse(body);if(value.id===undefined){res.writeHead(202);res.end();return;}let result:unknown;
 if(value.method==='initialize')result={protocolVersion:value.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'Explicit test server',version:'1'}};
 else if(value.method==='tools/list')result=value.params?.cursor?{tools:[{name:'second',description:'Second tool',inputSchema:{type:'object'}}]}:{tools:[{name:'first',description:'First tool',inputSchema:{type:'object'}}],nextCursor:'next'};
 else result={content:[{type:'text',text:'Executed fixture tool'}]};json(res,{jsonrpc:'2.0',id:value.id,result});
}
test('MCP transport negotiates sessions, follows tool pages and calls tools with a bearer token',async t=>{
 const api=await fixture((req,res,body)=>{assert.equal(req.headers.authorization,'Bearer fixture-app-token');rpc(req,res,body);});t.after(api.close);
 const catalog=await callConnector(api.url+'/mcp','fixture-app-token',undefined,()=>{},'tools/list',{},signal());assert.deepEqual((catalog as any).tools.map((tool:any)=>tool.name),['first','second']);
 const result=await callConnector(api.url+'/mcp','fixture-app-token',undefined,()=>{},'tools/call',{name:'first',arguments:{}},signal());assert.equal((result as any).content[0].text,'Executed fixture tool');
});
test('browser OAuth validates state, exchanges PKCE code and reuses scoped tokens',async t=>{
 let url='',registered:any,challenge='',refreshes=0,rejectOnce=false;const api=await fixture((req,res,body)=>{
  if(req.url!.startsWith('/.well-known/oauth-protected-resource'))return json(res,{resource:url+'/mcp',authorization_servers:[url]});
  if(req.url!.startsWith('/.well-known/oauth-authorization-server')||req.url!.startsWith('/.well-known/openid-configuration'))return json(res,{issuer:url,authorization_endpoint:url+'/authorize',token_endpoint:url+'/token',registration_endpoint:url+'/register',response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['none']});
  if(req.url==='/register'){registered=JSON.parse(body);return json(res,{...registered,client_id:'fixture-client',client_id_issued_at:1},201);}
  if(req.url==='/token'){const params=new URLSearchParams(body);if(params.get('grant_type')==='refresh_token')refreshes++;else{assert.equal(params.get('code'),'fixture-code');assert.equal(createHash('sha256').update(params.get('code_verifier')!).digest('base64url'),challenge);assert.equal(params.get('redirect_uri'),registered.redirect_uris[0]);}return json(res,{access_token:'fixture-oauth-token',token_type:'Bearer',refresh_token:'fixture-refresh-token',expires_in:3600});}
  if(req.headers.authorization!=='Bearer fixture-oauth-token'||rejectOnce){rejectOnce=false;res.writeHead(401,{'www-authenticate':`Bearer resource_metadata="${url}/.well-known/oauth-protected-resource/mcp"`});res.end();return;}
  rpc(req,res,body);
 });url=api.url;t.after(api.close);
 const signed=await signInConnector(url+'/mcp',async address=>{const auth=new URL(address);assert.equal(auth.pathname,'/authorize');assert.equal(auth.searchParams.get('code_challenge_method'),'S256');challenge=auth.searchParams.get('code_challenge')!;const callback=new URL(auth.searchParams.get('redirect_uri')!);callback.searchParams.set('code','fixture-code');callback.searchParams.set('state','wrong-state');assert.equal((await fetch(callback)).status,400);callback.searchParams.set('state',auth.searchParams.get('state')!);callback.searchParams.set('iss',url);assert.equal((await fetch(callback)).status,200);},signal());
 assert.equal(signed.tools.length,2);assert.equal(signed.credentials.serverUrl,url+'/mcp');assert.equal(signed.credentials.tokens[url].access_token,'fixture-oauth-token');assert.equal(registered.token_endpoint_auth_method,'none');
 await callConnector(url+'/mcp','',signed.credentials,()=>{},'tools/list',{},signal());assert.equal(refreshes,0);
 rejectOnce=true;let refreshed=false;await callConnector(url+'/mcp','',signed.credentials,()=>{refreshed=true;},'tools/list',{},signal());assert.equal(refreshes,1);assert(refreshed,'Refreshed OAuth credentials are saved');
 await assert.rejects(callConnector(url+'/other','',signed.credentials,()=>{},'tools/list',{},signal()),/new app endpoint/);
 const controller=new AbortController();await assert.rejects(signInConnector(url+'/mcp',async()=>{controller.abort();},controller.signal),/cancelled/);
 const dataDir=await mkdtemp(path.join(os.tmpdir(),'ibot-oauth-store-'));
 const options={dataDir,runtime,emit:()=>{},scheduler:false,encrypt:(s:string)=>Buffer.from(s).toString('base64'),decrypt:(s:string)=>Buffer.from(s,'base64').toString(),openExternal:async(address:string)=>{const auth=new URL(address);challenge=auth.searchParams.get('code_challenge')!;const callback=new URL(auth.searchParams.get('redirect_uri')!);callback.searchParams.set('code','fixture-code');callback.searchParams.set('state',auth.searchParams.get('state')!);callback.searchParams.set('iss',url);await fetch(callback);}};
 const engine=createEngine(options);t.after(()=>engine.shutdown());const connector=await engine.invoke('connector.save',{name:'OAuth fixture',url:url+'/mcp'}) as Connector;
 await engine.invoke('connector.authorize',{id:connector.id,requestId:'fixture-sign-in'});assert.equal(engine.getState().connectors[0].auth,'oauth');assert.equal(engine.getState().connectors[0].tools.length,2);
 const disk=await readFile(path.join(dataDir,'state.json'),'utf8');assert(!disk.includes('fixture-oauth-token')&&!disk.includes('fixture-refresh-token'));assert(!JSON.stringify(engine.getState()).includes('fixture-client'));
 await engine.shutdown();const restored=createEngine(options);t.after(()=>restored.shutdown());await restored.invoke('connector.test',{id:connector.id});
 await restored.invoke('connector.save',{id:connector.id,url:url+'/other'});assert.equal(restored.getState().connectors[0].hasToken,false);assert.equal(restored.getState().connectors[0].tools.length,0);const changed=JSON.parse(await readFile(path.join(dataDir,'state.json'),'utf8'));assert.equal(Object.keys(changed.secrets).length,0,'Changing endpoint clears its OAuth credentials');
});
const runtime={status:async()=>({available:false,imageReady:false,message:'Fixture'}),inspect:async(botId:string)=>({botId,status:'not-created'})} as RuntimeService;
test('appearance and voice settings persist while rejected changes and cancellations leave data intact',async t=>{
 const dataDir=await mkdtemp(path.join(os.tmpdir(),'ibot-options-'));const options={dataDir,runtime,emit:()=>{},scheduler:false,encrypt:(s:string)=>Buffer.from(s).toString('base64'),decrypt:(s:string)=>Buffer.from(s,'base64').toString()};const engine=createEngine(options);t.after(()=>engine.shutdown());
 await engine.invoke('bot.update',{id:'chief',avatar:'drop',accessory:'halo',color:'#123456'});await assert.rejects(engine.invoke('bot.update',{id:'chief',color:'#abcdef',accessory:'unknown'}),/cosmetic/);assert.equal(engine.getState().bots[0].color,'#123456');
 const connection=await engine.invoke('provider.save',{provider:'openai',model:'fixture/chat',apiKey:'fixture-voice-key',baseUrl:'http://127.0.0.1:9999/v1'}) as any;
 await engine.invoke('settings.update',{voice:{connectionId:connection.id,transcriptionModel:'fixture/stt',voiceURI:'Windows fixture',rate:1.25,language:'te',microphoneId:'fixture-device'}});await assert.rejects(engine.invoke('settings.update',{voice:{rate:8}}),/voice speed/);assert.equal(engine.getState().settings.voice?.rate,1.25);
 await engine.shutdown();const restored=createEngine(options);t.after(()=>restored.shutdown());assert.equal(restored.getState().bots[0].avatar,'drop');assert.equal(restored.getState().bots[0].accessory,'halo');assert.equal(restored.getState().settings.voice?.language,'te');
 await restored.invoke('bot.update',{id:'chief',resetAppearance:true});assert.equal(restored.getState().bots[0].avatar,'orbit');assert.equal(restored.getState().bots[0].accessory,'none');
 const disk=await readFile(path.join(dataDir,'state.json'),'utf8');assert(!disk.includes('fixture-voice-key'));
});
