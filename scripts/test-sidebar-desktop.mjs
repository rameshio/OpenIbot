import {_electron as electron} from 'playwright';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('.'),dataDir=await mkdtemp(path.join(os.tmpdir(),'ibot-sidebar-ui-')),env={...process.env,IBOT_DATA_DIR:dataDir,IBOT_TEST:'1'};delete env.ELECTRON_RUN_AS_NODE;delete env.IBOT_DEV_URL;let app;
try{
 app=await electron.launch({...(process.env.IBOT_TEST_EXECUTABLE?{executablePath:process.env.IBOT_TEST_EXECUTABLE,args:[]}:{args:[root]}),env,timeout:60000});const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.getByRole('heading',{name:'What would you like to get done?'}).waitFor();
 const chat=await page.evaluate(()=>window.ibot.invoke('chat.create',{title:'Preserved chat history',botIds:['chief']}));await page.evaluate(()=>window.ibot.invoke('bot.create',{name:'Researcher',role:'Research'}));
 const sidebar=page.locator('.sidebar');await sidebar.getByText('Researcher',{exact:true}).waitFor();assert.equal(await sidebar.getByText('Conversations',{exact:true}).count(),0);
 const search=sidebar.getByRole('textbox',{name:'Search bots',exact:true});await search.fill('Researcher');assert(await sidebar.getByText('Researcher',{exact:true}).isVisible());await search.fill('Missing bot');await sidebar.getByText('No bots found.',{exact:true}).waitFor();await search.fill('');
 await sidebar.getByRole('button',{name:'Open main bot Chief',exact:true}).click();await page.getByRole('heading',{name:'Preserved chat history',exact:true}).waitFor();
 const state=await page.evaluate(()=>window.ibot.invoke('state.get'));assert.equal(state.chats.length,1);assert.equal(state.chats[0].id,chat.id);assert.equal(state.bots.length,2);
 console.log(JSON.stringify({passed:true,checks:['no Conversations section','bot-only search','bot navigation opens saved chat','saved chats preserved']}));
}finally{if(app)await app.close();}
