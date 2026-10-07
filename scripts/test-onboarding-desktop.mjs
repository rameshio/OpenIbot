import {_electron as electron} from 'playwright';
import {createServer} from 'node:http';
import {mkdtemp,mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve('.'),dataDir=await mkdtemp(path.join(os.tmpdir(),'ibot-onboarding-ui-'));
const output=path.join(root,'artifacts','bot-onboarding');await mkdir(output,{recursive:true});
const requests=[];
const server=createServer(async(req,res)=>{
 let body='';for await(const chunk of req)body+=chunk;
 requests.push(JSON.parse(body));res.writeHead(200,{'content-type':'application/json'});
 res.end(JSON.stringify({choices:[{message:{role:'assistant',content:'Let’s organize your job search. What roles are you targeting?'}}],usage:{prompt_tokens:10,completion_tokens:8}}));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const env={...process.env,IBOT_DATA_DIR:dataDir,IBOT_TEST:'1'};delete env.ELECTRON_RUN_AS_NODE;delete env.IBOT_DEV_URL;
let app;const errors=[];
const launch=async()=>{
 app=await electron.launch({...(process.env.IBOT_TEST_EXECUTABLE?{executablePath:process.env.IBOT_TEST_EXECUTABLE,args:[]}:{args:[root]}),env,timeout:60000});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await page.getByRole('textbox',{name:'Message your bot'}).waitFor();return page;
};
const question="I'm ready to help. What would you like me to help you with?";
try{
 let page=await launch();
 assert.equal(await page.locator('.welcome,.suggestion-row').count(),0);
 await page.getByRole('button',{name:'Create a bot',exact:true}).click();await page.locator('.messages').getByText(question,{exact:true}).waitFor();
 assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.locator('.details-rail').count(),0);assert.equal(await page.locator('.sidebar-label').count(),0);assert.equal(await page.locator('.sidebar-header').getByRole('button',{name:'Create a bot',exact:true}).count(),1);await page.getByRole('heading',{name:'New bot',level:1,exact:true}).waitFor();
 const composer=page.getByRole('textbox',{name:'Message your bot'});await composer.waitFor();await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Message your bot');
 assert.equal(await composer.getAttribute('placeholder'),'Message New bot…');
 let state=await page.evaluate(()=>window.ibot.invoke('state.get'));const first=state.bots.find(bot=>bot.name==='New bot');
 assert(first);assert.equal(state.messages.length,1);assert.equal(state.usage.length,0);assert.equal(requests.length,0);
 await page.screenshot({path:path.join(output,'new-bot-conversation.png'),animations:'disabled'});
 await page.evaluate(base=>window.ibot.invoke('provider.save',{provider:'compatible',baseUrl:base,model:'fixture'}),`http://127.0.0.1:${server.address().port}/v1`);
 await composer.fill('Help me organize my job search.');await page.getByRole('button',{name:'Send message',exact:true}).click();
 await page.locator('.messages').getByText('Let’s organize your job search. What roles are you targeting?',{exact:true}).waitFor();
 assert.equal(requests.length,1);assert(requests[0].messages.some(message=>message.content.includes('What would you like me to help you with?')));
 state=await page.evaluate(()=>window.ibot.invoke('state.get'));assert.equal(state.messages.at(-1).botId,first.id);
 await page.getByRole('button',{name:'New chat',exact:true}).click();await page.locator('.recipient-button').click();await page.getByRole('button',{name:'Create new bot',exact:true}).click();
 await page.getByRole('heading',{name:'New bot 2',level:1,exact:true}).waitFor();await page.locator('.messages').getByText(question,{exact:true}).waitFor();
 assert.equal(await page.getByRole('dialog').count(),0);assert.equal(requests.length,1);
 await page.getByLabel('Options for Chief',{exact:true}).click();await page.getByRole('button',{name:'Create new bot',exact:true}).click();
 await page.getByRole('heading',{name:'New bot 3',level:1,exact:true}).waitFor();assert.equal(await page.getByRole('dialog').count(),0);
 await page.evaluate(()=>window.ibot.invoke('settings.update',{maxBots:4}));state=await page.evaluate(()=>window.ibot.invoke('state.get'));
 await page.getByRole('button',{name:'Create a bot',exact:true}).click();await page.getByRole('alert').filter({hasText:'bot limit'}).waitFor();
 const after=await page.evaluate(()=>window.ibot.invoke('state.get'));assert.equal(after.bots.length,state.bots.length);assert.equal(after.chats.length,state.chats.length);
 await app.close();app=null;page=await launch();
 await page.locator('.bot-navigation-row').filter({hasText:'New bot 2'}).getByRole('button').first().click();await page.locator('.messages').getByText(question,{exact:true}).waitFor();
 state=await page.evaluate(()=>window.ibot.invoke('state.get'));assert.equal(state.bots.length,4);assert.equal(state.chats.length,3);assert.equal(state.messages.filter(message=>message.content===question).length,3);assert.equal(requests.length,1);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,checks:['no welcome banner or preset menu','sidebar creates a bot immediately','saved question without a model request','focused composer names the bot','first answer goes to the new bot','recipient menu creates directly','main bot menu creates directly','capacity failure creates no partial chat','welcome and identity persist after restart','no renderer errors'],screenshot:path.join(output,'new-bot-conversation.png')}));
}finally{if(app)await app.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
