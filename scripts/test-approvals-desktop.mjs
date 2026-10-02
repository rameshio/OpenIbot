import {_electron as electron} from 'playwright';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve('.'),dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'ibot-approval-ui-'));
const output=path.join(root,'artifacts','approvals');await fs.mkdir(output,{recursive:true});
let schema=1,calls=0,connectorId;const mcpMethods=[];
const server=createServer(async(req,res)=>{
 let body='';for await(const chunk of req)body+=chunk.toString();
 const json=value=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(value));};
 if(req.method!=='POST'){res.writeHead(405);res.end();return;}
 const value=JSON.parse(body);
 if(req.url==='/mcp'){
  mcpMethods.push(value.method);
  if(value.id===undefined){res.writeHead(202);res.end();return;}
  const result=value.method==='initialize'?{protocolVersion:value.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'Approval fixture',version:'1'}}:value.method==='tools/list'?{tools:[{name:'inspect',description:'Inspect records',inputSchema:{type:'object',description:String(schema)},annotations:{readOnlyHint:true}},{name:'paid_job',description:'Run a paid job',inputSchema:{type:'object'}}]}:(calls++,{content:[{type:'text',text:'Verified fixture result'}]});
  return json({jsonrpc:'2.0',id:value.id,result});
 }
 if(req.url==='/v1/chat/completions'){
  if(value.messages.some(m=>m.role==='tool'))return json({choices:[{message:{role:'assistant',content:'Fixture complete.'}}]});
  const paid=value.messages.some(m=>m.role==='user'&&m.content.includes('paid job'));
  const args={connectorId,name:paid?'paid_job':'inspect',arguments:{query:paid?'paid fixture':'records'},approvalPurpose:paid?'Run the paid job requested by the user.':'Inspect records for the report you requested.'};
  return json({choices:[{message:{role:'assistant',content:' \n ',tool_calls:Array.from({length:paid?1:2},(_,i)=>({id:`call-${i}`,type:'function',function:{name:'connector_call',arguments:JSON.stringify(args)}}))}}]});
 }
 res.writeHead(404);res.end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
const env={...process.env,IBOT_DATA_DIR:dataDir,IBOT_TEST:'1'};delete env.ELECTRON_RUN_AS_NODE;delete env.IBOT_DEV_URL;delete env.IBOT_RUNTIME_INTEGRATION;
let application;const errors=[];
const launch=async()=>{application=await electron.launch({args:[root],env,timeout:60000});const page=await application.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));await page.getByRole('heading',{name:'What would you like to get done?'}).waitFor();return page;};
const send=async(page,text)=>{const previous=await page.evaluate(()=>window.ibot.invoke('state.get').then(s=>s.messages.filter(m=>m.role==='user').at(-1)?.id));await page.getByRole('textbox',{name:'Message your bot'}).fill(text);await page.getByRole('button',{name:'Send message',exact:true}).click();await page.waitForFunction(previous=>window.ibot.invoke('state.get').then(s=>{const latest=s.messages.filter(m=>m.role==='user').at(-1)?.id;return !!latest&&latest!==previous;}),previous);};
const idle=async page=>{for(let attempt=0;attempt<150;attempt++){const done=await page.evaluate(async()=>{const state=await window.ibot.invoke('state.get');return state.chats.every(chat=>chat.status!=='running');});if(done)return;await page.waitForTimeout(100);}assert.fail('Run did not become idle');};
try{
 let page=await launch();await page.evaluate(()=>window.ibot.invoke('settings.update',{maxBots:1}));
 await page.evaluate(base=>window.ibot.invoke('provider.save',{provider:'compatible',model:'approval-fixture',baseUrl:base+'/v1'}),base);
 connectorId=(await page.evaluate(base=>window.ibot.invoke('connector.save',{name:'Records fixture',url:base+'/mcp'}),base)).id;
 await page.evaluate(id=>window.ibot.invoke('connector.test',{id}),connectorId);
 await page.getByRole('button',{name:'App settings',exact:true}).click();await page.getByRole('button',{name:'Connectors',exact:true}).click();
 const classification=page.locator('.settings-section').filter({has:page.getByRole('heading',{name:'Records fixture',exact:true})});assert((await classification.innerText()).includes('Suggested class: read'));assert((await classification.innerText()).includes('Needs your confirmation'));assert.equal(calls,0);
 await classification.getByRole('button',{name:'Refresh tools',exact:true}).click();await classification.getByRole('button',{name:'Refresh tools',exact:true}).waitFor();await page.waitForFunction(()=>window.ibot.invoke('state.get').then(s=>s.connectors[0].catalogEvents?.length>=2));assert.deepEqual(mcpMethods.filter(m=>m.startsWith('tools/')),['tools/list','tools/list']);assert.equal(calls,0);
 await classification.getByRole('combobox',{name:'Effect class for Records fixture / inspect',exact:true}).selectOption('read');assert.equal(calls,0);
 await classification.locator('li').filter({has:page.getByRole('combobox',{name:'Effect class for Records fixture / inspect',exact:true})}).getByRole('button',{name:'Confirm class',exact:true}).click();await classification.getByText('Confirmed class: read',{exact:true}).waitFor();assert.equal(calls,0);
 await page.screenshot({path:path.join(output,'classification-settings.png')});await page.getByRole('button',{name:'Close settings',exact:true}).click();
 await send(page,'Inspect records for my report');let card=page.getByRole('region',{name:'read approval'});await card.waitFor();
 assert((await card.innerText()).includes('Model-generated'));assert((await card.innerText()).includes('Inspect records for the report'));assert((await card.innerText()).includes('Records fixture / inspect'));assert((await card.getByLabel('Raw arguments').innerText()).includes('records'));assert.equal(await page.locator('.message-assistant .message-bubble').count(),0);
 await card.getByRole('button',{name:'Always allow this tool',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'read-card.png'),animations:'disabled'});await card.getByRole('button',{name:'Allow for this chat',exact:true}).click();await idle(page);assert.equal(calls,2);
 await page.keyboard.press('Control+n');await send(page,'Inspect records for my report');card=page.getByRole('region',{name:'read approval'});await card.waitFor();
 page.once('dialog',dialog=>dialog.accept());await card.getByRole('button',{name:'Always allow this tool',exact:true}).click();await idle(page);assert.equal(calls,4);
 await application.close();application=null;page=await launch();await send(page,'Inspect records for my report');await idle(page);assert.equal(calls,6);assert.equal(await page.locator('.approval-card').count(),0);
 schema++;await page.evaluate(id=>window.ibot.invoke('connector.test',{id}),connectorId);await page.evaluate(id=>window.ibot.invoke('connector.classify',{id,name:'inspect',effectClass:'read'}),connectorId);
 await page.keyboard.press('Control+n');await send(page,'Inspect records for my report');card=page.getByRole('region',{name:'read approval'});await card.waitFor();assert.equal(calls,6);await card.getByRole('button',{name:'Decline',exact:true}).click();
 // An identical call cannot ask again after the user declines it in this run.
 await idle(page);await card.waitFor({state:'detached'});
 await page.evaluate(id=>window.ibot.invoke('connector.classify',{id,name:'paid_job',effectClass:'spend'}),connectorId);await page.keyboard.press('Control+n');await send(page,'Run a paid job');card=page.getByRole('region',{name:'spend approval'});await card.waitFor();assert(await card.getByText(/May incur charges/).isVisible());assert.equal(await card.getByRole('button',{name:'Always allow this tool',exact:true}).count(),0);assert(await card.evaluate(element=>element.classList.contains('approval-spend')));await page.screenshot({path:path.join(output,'spend-card.png')});await card.getByRole('button',{name:'Decline',exact:true}).click();await idle(page);assert.equal(calls,6);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,checks:['Refresh tools lists and persists without calling a tool','settings suggestion and explicit confirmation without tool calls','class, model purpose, target and raw arguments','no empty assistant bubble','chat scope stops exact repeat approvals','new chat asks again','confirmed read tool scope','read confirmation survives restart','schema revokes read confirmation','spend highlight and no always option','decline stops connector dispatch']}));
}finally{if(application)await application.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
