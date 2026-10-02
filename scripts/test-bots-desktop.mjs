import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve('.'),dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'ibot-bots-ui-'));
const output=path.join(root,'artifacts','bots');await fs.mkdir(output,{recursive:true});
const env={...process.env,IBOT_DATA_DIR:dataDir,IBOT_TEST:'1'};delete env.ELECTRON_RUN_AS_NODE;delete env.IBOT_DEV_URL;
let app;const errors=[];
const launch=async()=>{app=await electron.launch({args:[root],env,timeout:60000});const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));await page.getByRole('heading',{name:'What would you like to get done?'}).waitFor();return page;};
try{
 let page=await launch();await page.getByLabel('Main bot: Chief',{exact:true}).waitFor();
 await page.getByLabel('Options for Chief',{exact:true}).click();await page.getByRole('button',{name:'Rename Chief',exact:true}).click();
 await page.getByRole('textbox',{name:'Name',exact:true}).fill('Coordinator');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByLabel('Main bot: Coordinator',{exact:true}).waitFor();
 await page.getByLabel('Options for Coordinator',{exact:true}).click();await page.getByRole('button',{name:'Create new bot',exact:true}).click();
 await page.getByRole('textbox',{name:'Name',exact:true}).fill('Researcher');await page.getByRole('textbox',{name:'Role',exact:true}).fill('Find and verify sources');await page.getByRole('button',{name:'Create bot',exact:true}).click();await page.getByRole('heading',{name:'What should Researcher work on?'}).waitFor();
 await page.getByLabel('Options for Researcher',{exact:true}).click();await page.getByRole('button',{name:'Make Researcher main bot',exact:true}).click();await page.getByLabel('Main bot: Researcher',{exact:true}).waitFor();assert.equal(await page.getByLabel('Main bot: Coordinator',{exact:true}).count(),0);
 await page.getByRole('button',{name:'New chat',exact:true}).click();await page.getByRole('textbox',{name:'Message your bot'}).waitFor();assert.equal(await page.getByRole('textbox',{name:'Message your bot'}).getAttribute('placeholder'),'Message Researcher…');
 await page.getByLabel('Options for Researcher',{exact:true}).click();await page.getByRole('button',{name:'Rename Researcher',exact:true}).click();await page.getByRole('textbox',{name:'Name',exact:true}).fill('Atlas');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByLabel('Main bot: Atlas',{exact:true}).waitFor();
 await page.screenshot({path:path.join(output,'main-bot.png'),animations:'disabled'});
 await app.close();app=null;page=await launch();await page.getByLabel('Main bot: Atlas',{exact:true}).waitFor();
 assert.equal(await page.getByRole('textbox',{name:'Message your bot'}).getAttribute('placeholder'),'Message Atlas…');
 const state=await page.evaluate(()=>window.ibot.invoke('state.get'));assert.equal(state.bots.length,2);assert.equal(state.bots.find(bot=>bot.id===state.mainBotId).name,'Atlas');assert.equal(state.bots.find(bot=>bot.id==='chief').name,'Coordinator');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,checks:['Chief starts starred','rename Chief','create bot from main bot menu','replace main bot','exactly one main star','new chat defaults to main bot','rename selected main bot','restart preserves names and main selection','no renderer errors']}));
}finally{if(app)await app.close();}
