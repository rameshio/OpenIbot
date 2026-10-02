import {_electron as electron} from 'playwright';
import {mkdtemp,readFile,writeFile,mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('.'),dataDir=await mkdtemp(path.join(os.tmpdir(),'ibot-activity-ui-')),env={...process.env,IBOT_DATA_DIR:dataDir,IBOT_TEST:'1'};delete env.ELECTRON_RUN_AS_NODE;delete env.IBOT_DEV_URL;let app;
async function launch(){app=await electron.launch({...(process.env.IBOT_TEST_EXECUTABLE?{executablePath:process.env.IBOT_TEST_EXECUTABLE,args:[]}:{args:[root]}),env,timeout:60000});const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.getByRole('heading',{name:'What would you like to get done?'}).waitFor();return page;}
try{
 let page=await launch();const bot=await page.evaluate(()=>window.ibot.invoke('bot.create',{name:'Researcher',role:'Research'}));
 const solo=await page.evaluate(id=>window.ibot.invoke('chat.create',{title:'Individual brief',botIds:[id]}),bot.id);
 const team=await page.evaluate(id=>window.ibot.invoke('chat.create',{title:'Launch team',botIds:['chief',id]}),bot.id);
 await app.close();app=null;
 const stored=JSON.parse(await readFile(path.join(dataDir,'state.json'),'utf8'));stored.state.messages.push({id:'fixture-reply',chatId:solo.id,botId:bot.id,role:'assistant',content:'Finished the sourced brief.',createdAt:new Date().toISOString()});await writeFile(path.join(dataDir,'state.json'),JSON.stringify(stored));
 page=await launch();const sidebar=page.locator('.sidebar');await sidebar.getByText('Finished the sourced brief.',{exact:true}).waitFor();assert.equal(await sidebar.getByText('Conversations',{exact:true}).count(),0);
 await sidebar.getByRole('button',{name:'Open team Launch team',exact:true}).click();await page.getByRole('heading',{name:'Launch team',exact:true}).waitFor();
 await sidebar.locator('.bot-navigation-row').filter({hasText:'Researcher'}).getByRole('button').first().click();await page.getByRole('heading',{name:'Individual brief',exact:true}).waitFor();
 const search=sidebar.getByRole('textbox',{name:'Search bots',exact:true});await search.fill('Launch');await sidebar.getByRole('button',{name:'Open team Launch team',exact:true}).waitFor();assert.equal(await sidebar.getByText('No bots found.',{exact:true}).count(),0);await search.fill('');
 const state=await page.evaluate(()=>window.ibot.invoke('state.get'));assert.deepEqual(state.chats.map(c=>c.id).sort(),[solo.id,team.id].sort());assert.equal(state.messages.length,1);
 await mkdir(path.join(root,'artifacts','bot-activity'),{recursive:true});await page.screenshot({path:path.join(root,'artifacts','bot-activity','sidebar.png')});
 console.log(JSON.stringify({passed:true,checks:['latest bot reply preview','no Conversations section','team navigation','individual navigation','team search','saved history preserved']}));
}finally{if(app)await app.close();}
