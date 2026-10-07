import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve('.'),dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'ibot-bots-ui-'));
const output=path.join(root,'artifacts','bots');await fs.mkdir(output,{recursive:true});
const env={...process.env,IBOT_DATA_DIR:dataDir,IBOT_TEST:'1'};delete env.ELECTRON_RUN_AS_NODE;delete env.IBOT_DEV_URL;
let app;const errors=[];let deletionUnavailable=false;
const launch=async()=>{app=await electron.launch({...(process.env.IBOT_TEST_EXECUTABLE?{executablePath:process.env.IBOT_TEST_EXECUTABLE,args:[]}:{args:[root]}),env,timeout:60000});const page=await app.firstWindow();await app.evaluate(({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];win.setOpacity(0);win.showInactive();});page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));await page.getByRole('textbox',{name:'Message your bot'}).waitFor();return page;};
try{
 let page=await launch();await page.getByLabel('Main bot: Chief',{exact:true}).waitFor();
 await page.getByLabel('Options for Chief',{exact:true}).click();await page.getByRole('button',{name:'Rename Chief',exact:true}).click();
 await page.getByRole('textbox',{name:'Name',exact:true}).fill('Coordinator');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByLabel('Main bot: Coordinator',{exact:true}).waitFor();
 await page.getByLabel('Options for Coordinator',{exact:true}).click();await page.getByRole('button',{name:'Create new bot',exact:true}).click();
 await page.locator('.messages').getByText("I'm ready to help. What would you like me to help you with?",{exact:true}).waitFor();assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.getByRole('button',{name:'Research a topic',exact:true}).count(),0);
 await page.getByRole('button',{name:'Toggle bot details',exact:true}).click();await page.getByRole('button',{name:'Bot settings',exact:true}).click();await page.getByRole('textbox',{name:'Name',exact:true}).fill('Researcher');await page.getByRole('textbox',{name:'Role',exact:true}).fill('Find and verify sources');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('heading',{name:'Researcher',level:1,exact:true}).waitFor();
 await page.getByLabel('Options for Researcher',{exact:true}).click();await page.getByRole('button',{name:'Make Researcher main bot',exact:true}).click();await page.getByLabel('Main bot: Researcher',{exact:true}).waitFor();assert.equal(await page.getByLabel('Main bot: Coordinator',{exact:true}).count(),0);
 await page.getByRole('button',{name:'New chat',exact:true}).click();await page.getByRole('textbox',{name:'Message your bot'}).waitFor();assert.equal(await page.getByRole('textbox',{name:'Message your bot'}).getAttribute('placeholder'),'Message Researcher…');
 await page.getByLabel('Options for Researcher',{exact:true}).click();await page.getByRole('button',{name:'Rename Researcher',exact:true}).click();await page.getByRole('textbox',{name:'Name',exact:true}).fill('Atlas');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByLabel('Main bot: Atlas',{exact:true}).waitFor();
 await page.evaluate(async()=>{for(let i=0;i<24;i++)await window.ibot.invoke('chat.create',{title:`Conversation ${i+1}`,botIds:[]});});
 const main=page.getByRole('button',{name:'Open main bot Atlas',exact:true});await main.waitFor();
 assert.equal(await page.locator('.sidebar-scroll .main-bot-card').count(),0,'Main bot is outside the scrolling conversations');
 const before=await main.boundingBox();await page.locator('.sidebar-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight;});assert.deepEqual(await main.boundingBox(),before,'Main bot stays pinned while conversations scroll');
 await page.getByRole('button',{name:'Search bots and groups',exact:true}).click();await page.getByLabel('Search bots',{exact:true}).fill('no matching conversations');assert(await main.isVisible(),'Search never hides the main bot');await page.getByLabel('Search bots',{exact:true}).fill('');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(960,640));assert(await main.isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false,'Pinned main tile fits a compact window');
 await page.screenshot({path:path.join(output,'main-bot.png'),animations:'disabled'});
 await app.close();app=null;page=await launch();await page.getByLabel('Main bot: Atlas',{exact:true}).waitFor();
 assert.equal(await page.getByRole('textbox',{name:'Message your bot'}).getAttribute('placeholder'),'Message Atlas…');
 const state=await page.evaluate(()=>window.ibot.invoke('state.get'));assert.equal(state.bots.length,2);assert.equal(state.bots.find(bot=>bot.id===state.mainBotId).name,'Atlas');assert.equal(state.bots.find(bot=>bot.id==='chief').name,'Coordinator');assert.deepEqual(errors,[]);
 const victim=await page.evaluate(async()=>{const bot=await window.ibot.invoke('bot.create',{name:'Delete fixture',role:'Temporary specialist'});await window.ibot.invoke('chat.create',{title:'Victim solo chat',botIds:[bot.id]});await window.ibot.invoke('chat.create',{title:'Victim team chat',botIds:['chief',bot.id]});return bot;});
 await page.locator('.bot-navigation-row').filter({hasText:'Delete fixture'}).getByRole('button').first().click();
 await page.getByLabel('Options for Delete fixture',{exact:true}).click();await page.getByRole('button',{name:'Delete Delete fixture',exact:true}).click();await page.getByRole('dialog',{name:'Delete Delete fixture?',exact:true}).waitFor();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert((await page.evaluate(()=>window.ibot.invoke('state.get'))).bots.some(b=>b.id===victim.id));
 await page.getByLabel('Options for Delete fixture',{exact:true}).click();await page.getByRole('button',{name:'Delete Delete fixture',exact:true}).click();await page.getByRole('button',{name:'Delete bot',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('[role=dialog]')||document.querySelector('[role=dialog] [role=alert]'),null,{timeout:45000});
 if(await page.getByRole('dialog').count()){
  const error=await page.getByRole('dialog').getByRole('alert').innerText(),runtime=await page.evaluate(()=>window.ibot.invoke('runtime.status'));
  assert.equal(runtime.available,false,'Only a known unavailable runtime can skip the successful removal check');assert(/docker/i.test(error));
  const kept=await page.evaluate(()=>window.ibot.invoke('state.get'));assert(kept.bots.some(bot=>bot.id===victim.id));assert(!kept.archivedBots?.some(bot=>bot.id===victim.id));
  await page.getByRole('button',{name:'Cancel',exact:true}).click();deletionUnavailable=true;
 }else{
  await page.getByLabel('Options for Delete fixture',{exact:true}).waitFor({state:'hidden'});assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.getByRole('textbox',{name:'Message your bot'}).getAttribute('placeholder'),'Message Atlas…');await page.getByRole('button',{name:'Open team Victim team chat',exact:true}).waitFor({state:'hidden'});
  const removed=await page.evaluate(()=>window.ibot.invoke('state.get'));assert(removed.archivedBots.some(b=>b.id===victim.id));assert(removed.chats.some(c=>c.title==='Victim solo chat'));assert(removed.chats.some(c=>c.title==='Victim team chat'));
 }
 await page.getByLabel('Options for Atlas',{exact:true}).click();await page.getByRole('button',{name:'Delete Atlas',exact:true}).click();assert(await page.getByRole('button',{name:'Delete bot',exact:true}).isDisabled());await page.getByText(/This is your main bot/).waitFor();await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await app.close();app=null;page=await launch();const persisted=await page.evaluate(()=>window.ibot.invoke('state.get'));if(deletionUnavailable){assert(persisted.bots.some(b=>b.id===victim.id));}else{assert(!persisted.bots.some(b=>b.id===victim.id));assert(persisted.archivedBots.some(b=>b.id===victim.id));}assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,checks:['Chief starts starred','rename Chief','create bot from main bot menu','replace main bot','exactly one main star','new chat defaults to main bot','rename selected main bot','restart preserves names and main selection','no renderer errors','delete menu and cancel preserve bot','main bot protection explained',...(deletionUnavailable?['unavailable runtime reports error and preserves bot']:['delete archives selected bot and returns to main','removed group hidden and history retained','deletion persists after restart'])],skipped:deletionUnavailable?['Successful computer stop/archive/group-filtering/persistence requires Docker Desktop in Linux-container mode.']:[]}));
}finally{if(app)await app.close();}
