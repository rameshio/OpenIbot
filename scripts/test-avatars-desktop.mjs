import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('.'),output=path.join(root,'artifacts','avatars');await fs.mkdir(output,{recursive:true});
const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'ibot-avatar-ui-'));
const env={...process.env,IBOT_DATA_DIR:dataDir,IBOT_TEST:'1'};delete env.ELECTRON_RUN_AS_NODE;
let app;const errors=[];
const launch=async()=>{app=await electron.launch({...(process.env.IBOT_TEST_EXECUTABLE?{executablePath:process.env.IBOT_TEST_EXECUTABLE,args:[]}:{args:[root]}),env});const page=await app.firstWindow();await app.evaluate(({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];win.setOpacity(0);win.showInactive();win.webContents.setBackgroundThrottling(false);});page.on('pageerror',error=>errors.push(error.message));await page.getByRole('heading',{name:'What would you like to get done?'}).waitFor();return page;};
const profile='.bot-profile .bot-avatar',drawing=profile+' .bot-drawing';
const stateOf=page=>page.evaluate(()=>window.ibot.invoke('state.get'));
const patch=(page,values)=>page.evaluate(values=>window.ibot.invoke('bot.update',{id:'chief',...values}),values);
const settings=(page,values)=>page.evaluate(settings=>window.ibot.invoke('settings.update',{settings}),values);
const geometry=page=>page.locator(drawing).innerHTML();
async function send(page,state){await app.evaluate(({BrowserWindow},state)=>BrowserWindow.getAllWindows()[0].webContents.send('ibot:state',state),state);await page.waitForFunction(({status,motion})=>document.querySelector('.bot-profile .bot-avatar')?.dataset.status===status&&document.documentElement.dataset.motion===motion,{status:state.bots[0].status,motion:state.settings.motion});}
async function board(page,title,items,name){
 await page.evaluate(({title,items})=>{
  const board=document.createElement('section');board.id='avatar-test-board';board.style.cssText='position:fixed;inset:43px 0 0;z-index:1000;padding:42px 56px;background:var(--bg);overflow:auto';
  const heading=document.createElement('h1');heading.textContent=title;heading.style.cssText='font:32px Georgia;margin-bottom:10px';board.append(heading);
  const subtitle=document.createElement('p');subtitle.textContent='I Bot · Built-in expressions and motion';subtitle.style.cssText='color:var(--muted);margin-bottom:30px';board.append(subtitle);
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:16px';
  for(const [index,item] of items.entries()) {const card=document.createElement('article');card.style.cssText='display:flex;align-items:center;gap:18px;background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:16px 24px';const figure=document.createElement('div');figure.innerHTML=item.html.replaceAll(/(_r_[\w-]+|«[^»]+»)/g,`$1-board-${index}`);const avatar=figure.querySelector('.bot-avatar');avatar.style.setProperty('--bot-size','72px');const label=document.createElement('strong');label.textContent=item.name;label.style.cssText='font-size:13px;font-weight:500';card.append(figure,label);grid.append(card);}board.append(grid);document.body.append(board);
 },{title,items});
 await page.screenshot({path:path.join(output,name+'.png')});await page.locator('#avatar-test-board').evaluate(el=>el.remove());
}
try{
 let page=await launch();await settings(page,{motion:'off',theme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.motion==='off');
 const palette=await page.evaluate(()=>{const css=getComputedStyle(document.documentElement);return ['--bg','--panel','--sidebar-bg','--accent'].map(p=>css.getPropertyValue(p).trim());});assert.deepEqual(palette,['#080808','#141414','#101010','#e6e6e6']);
 await page.screenshot({path:path.join(output,'premium-black-desktop.png')});
 await page.getByRole('button',{name:"Customize Chief's avatar",exact:true}).click();
 const expressions=await page.getByLabel('Bot expression',{exact:true}).locator('option').evaluateAll(options=>options.map(o=>({id:o.value,name:o.textContent})));
 assert.equal(expressions.length,16);const faces=[],unique=new Set();
 for(const expression of expressions){await page.getByLabel('Bot expression',{exact:true}).selectOption(expression.id);await page.waitForFunction(id=>document.querySelector('.bot-profile .bot-avatar')?.dataset.expression===id,expression.id);await page.waitForTimeout(60);const face=await geometry(page);unique.add(face.match(/class="bot-face"[\s\S]*?<\/g>/)?.[0]);faces.push({name:expression.name,html:await page.locator(profile).evaluate(el=>el.outerHTML)});}
 assert.equal(unique.size,16);await board(page,'Sixteen small personalities.',faces,'expressions');
 await page.getByLabel('Bot expression',{exact:true}).selectOption('curious');await patch(page,{color:'#0a0a0c'});assert.equal(await page.locator(profile).evaluate(el=>getComputedStyle(el).getPropertyValue('--bot-eye')),'#f5f5f5');
 const shapes=[];for(const name of ['Orbit','Drift','Dash','Facet','Bloom','Sprig','Peak','Dew']){await page.getByRole('button',{name:`Shape ${name}`,exact:true}).click();await page.waitForTimeout(60);shapes.push({name,html:await page.locator(profile).evaluate(el=>el.outerHTML)});}await board(page,'A shape of their own.',shapes,'ink-shapes');
 await patch(page,{avatar:'orbit',color:'#edae6a'});await page.screenshot({path:path.join(output,'inline-expressions.png')});
 await page.getByRole('button',{name:'Close appearance editor',exact:true}).click();
 const fixture=await stateOf(page);fixture.settings.motion='full';const statuses=['idle','thinking','working','waiting','error','done'];const activity=[];
 for(const status of statuses){fixture.bots[0].status=status;await send(page,fixture);await page.waitForTimeout(status==='done'?900:450);activity.push({name:status==='error'?'Blocked':status[0].toUpperCase()+status.slice(1),html:await page.locator(profile).evaluate(el=>el.outerHTML)});if(['idle','thinking','working'].includes(status)){const first=await geometry(page);await page.waitForTimeout(250);assert((await geometry(page))!==first,`${status} animates`);}if(status==='waiting')assert.equal(await page.locator(profile+' .bot-notification').count(),1);}
 await board(page,'Presence, at a glance.',activity,'activity');
 await page.waitForTimeout(2300);assert.equal(await page.locator(profile+' .bot-particles circle').count(),0,'Completion settles instead of celebrating forever');assert.equal(await page.locator(profile).getAttribute('data-expression'),'curious');
 fixture.bots[0].status='idle';fixture.bots[0].completedAt=new Date().toISOString();await send(page,fixture);await page.waitForTimeout(900);assert(await page.locator(profile+' .bot-particles circle').count()>0,'A completed run still celebrates after the engine returns to idle');await page.waitForTimeout(2300);assert.equal(await page.locator(profile+' .bot-particles circle').count(),0,'The durable completion gesture also settles');
 for(const motion of ['off','reduced']){fixture.settings.motion=motion;fixture.bots[0].status='working';await send(page,fixture);await page.waitForTimeout(200);const first=await geometry(page);await page.waitForTimeout(300);assert.equal(await geometry(page),first,`${motion} stops all geometry animation`);assert.equal(await page.locator(drawing).getAttribute('data-playing'),'false');}
 fixture.settings.motion='full';await send(page,fixture);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.bot-profile .bot-drawing').dataset.playing==='false');const fixed=await geometry(page);await page.waitForTimeout(300);assert.equal(await geometry(page),fixed,'OS reduced motion stops animation');await page.emulateMedia({reducedMotion:'no-preference'});
 fixture.bots[0].status='idle';fixture.settings.motion='off';await send(page,fixture);
 const uploaded='data:image/png;base64,'+(await fs.readFile(path.join(root,'assets','icon.png'))).toString('base64');await patch(page,{avatarImage:uploaded});assert.equal(await page.locator(profile+' .bot-custom-image').count(),1);assert.equal(await page.locator(drawing).count(),0,'Uploaded artwork is not covered with generated eyes');await patch(page,{avatarImage:''});
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(960,640));await page.getByRole('button',{name:"Customize Chief's avatar",exact:true}).click();await page.getByLabel('Bot expression',{exact:true}).selectOption('happy');await page.getByLabel('Bot expression',{exact:true}).scrollIntoViewIfNeeded();
 assert(await page.getByLabel('Bot expression',{exact:true}).isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);await page.screenshot({path:path.join(output,'compact-black.png')});
 await settings(page,{theme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');await page.screenshot({path:path.join(output,'light-expressions.png')});
 await app.close();page=await launch();assert.equal((await stateOf(page)).bots[0].expression,'happy','Expression survives restart');
 assert.equal(errors.length,0,errors.join('\n'));console.log(JSON.stringify({passed:true,checks:['neutral black theme','16 distinct expressions','8 silhouettes','ink contrast','real status mapping','blinking and orbit motion','completion settles','off/reduced/OS motion settings','uploaded artwork','inline compact editor','expression restart persistence'],output},null,2));
}catch(error){if(app){const page=await app.firstWindow();console.error(await page.evaluate(()=>({hidden:document.hidden,motion:document.documentElement.dataset.motion,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,profile:document.querySelector('.bot-profile .bot-drawing')?.dataset,box:document.querySelector('.bot-profile .bot-drawing')?.getBoundingClientRect().toJSON()})));}throw error;}finally{await app?.close();}
