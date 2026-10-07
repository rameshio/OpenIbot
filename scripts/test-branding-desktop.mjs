import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,cp,writeFile,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import os from 'node:os';
import path from 'node:path';

// All profiles, including the legacy default-path check, are disposable.
const root=path.resolve('.'),fixture=await mkdtemp(path.join(os.tmpdir(),'openibot-brand-'));
const appData=path.join(fixture,'appdata'),legacyProfile=path.join(appData,'I Bot');
await mkdir(legacyProfile,{recursive:true});
const requests=[];
const server=createServer(async(req,res)=>{
 for await(const _ of req){}requests.push(req.headers.authorization);
 res.writeHead(200,{'content-type':'application/json'});
 res.end(JSON.stringify({data:[{id:'fixture'}]}));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const env={...process.env,IBOT_TEST:'1'};delete env.ELECTRON_RUN_AS_NODE;delete env.IBOT_DEV_URL;delete env.IBOT_DATA_DIR;
let app;const errors=[];
const launch=async(options)=>{
 app=await electron.launch({...options,timeout:60000});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await page.getByRole('textbox',{name:'Message your bot'}).waitFor();return page;
};
try{
 // Seed a real saved profile with the old executable when supplied.
 let page=await launch({...(process.env.IBOT_OLD_TEST_EXECUTABLE?{executablePath:process.env.IBOT_OLD_TEST_EXECUTABLE,args:[]}:{args:[root]}),env:{...env,IBOT_DATA_DIR:legacyProfile}});
 const seeded=await page.evaluate(async(base)=>{
  const bot=await window.ibot.invoke('bot.create',{name:'Preserved specialist',role:'Branding fixture',memory:'Keep this saved preference.'});
  await window.ibot.invoke('bot.update',{id:bot.id,memory:'Keep this saved preference.'});
  const chat=await window.ibot.invoke('chat.create',{title:'Preserved conversation',botIds:[bot.id]});
  await window.ibot.invoke('provider.save',{provider:'compatible',baseUrl:base,model:'fixture',apiKey:'branding-synthetic-key'});
  return {botId:bot.id,chatId:chat.id};
 },`http://127.0.0.1:${server.address().port}/v1`);
 await app.close();app=null;
 const original=await readFile(path.join(legacyProfile,'state.json'),'utf8');
 assert(!original.includes('branding-synthetic-key'),'Credential is encrypted in the saved profile');

 // Override appData inside a test-only launcher, then let main choose its default.
 // No production path or production test switch is added to the application.
 const bootstrap=path.join(fixture,'bootstrap');await mkdir(bootstrap);
 for(const directory of ['dist-renderer','assets'])await cp(path.join(root,directory),path.join(bootstrap,directory),{recursive:true});
 const entry=path.join(bootstrap,'main.cjs');
 await writeFile(entry,`const {app}=require('electron');app.setPath('appData',${JSON.stringify(appData)});require(${JSON.stringify(path.join(root,'dist-desktop','main.cjs'))});`);
 page=await launch({args:[entry],env});
 const native=await app.evaluate(({app})=>({name:app.getName(),profile:app.getPath('userData'),session:app.getPath('sessionData')}));
 assert.deepEqual(native,{name:'OpenIbot',profile:legacyProfile,session:legacyProfile});
 assert.equal(await page.title(),'OpenIbot');assert.equal(await page.locator('.app-wordmark strong').innerText(),'OpenIbot');
 let state=await page.evaluate(()=>window.ibot.invoke('state.get'));
 assert.equal(state.bots.find(bot=>bot.id===seeded.botId)?.memory,'Keep this saved preference.');
 assert(state.chats.some(chat=>chat.id===seeded.chatId));assert(state.settings.provider.hasKey);
 await page.evaluate(()=>window.ibot.invoke('provider.test'));assert.deepEqual(requests,['Bearer branding-synthetic-key']);
 await page.getByRole('button',{name:'App settings',exact:true}).click();
 await page.getByRole('button',{name:'Updates',exact:true}).click();
 await page.getByRole('heading',{name:'OpenIbot',exact:true}).waitFor();
 await app.close();app=null;

 // Verify explicit IBOT_DATA_DIR still wins in a normal or packaged launch.
 page=await launch({...(process.env.IBOT_TEST_EXECUTABLE?{executablePath:process.env.IBOT_TEST_EXECUTABLE,args:[]}:{args:[root]}),env:{...env,IBOT_DATA_DIR:legacyProfile}});
 assert.equal(await app.evaluate(({app})=>app.getName()),'OpenIbot');assert.equal(await page.title(),'OpenIbot');
 const info=await page.evaluate(()=>window.ibot.invoke('app.info'));assert.equal(info.dataDir,legacyProfile);
 state=await page.evaluate(()=>window.ibot.invoke('state.get'));assert(state.bots.some(bot=>bot.id===seeded.botId));assert(state.chats.some(chat=>chat.id===seeded.chatId));assert(state.settings.provider.hasKey);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,checks:['OpenIbot native and renderer titles','legacy default profile reused','browser session path retained','saved bot and conversation preserved','encrypted credential decrypts after rename','About branding','explicit profile override and packaged name','no renderer errors']}));
}finally{if(app)await app.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
