import {app,BrowserWindow,ipcMain,protocol,net,safeStorage,dialog,shell,Menu,Tray,nativeImage,Notification} from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import {mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createRuntime} from './runtime';
import {createEngine} from './engine';
import type {AppState,Attachment} from '../shared/types';

protocol.registerSchemesAsPrivileged([{scheme:'ibot',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
app.setName('OpenIbot');
app.setAppUserModelId('app.ibot.desktop');
// Keep the existing profile and single-instance lock across the product rename.
const profileDir=process.env.IBOT_DATA_DIR?path.resolve(process.env.IBOT_DATA_DIR):path.join(app.getPath('appData'),'I Bot');
mkdirSync(profileDir,{recursive:true});
app.setPath('userData',profileDir);
app.setPath('sessionData',profileDir);
if(!app.requestSingleInstanceLock()) app.exit(0);
let win:BrowserWindow|null=null;
let tray:Tray|null=null;
let quitting=false;
let shutdownComplete=false;
let shutdownStarted=false;
let engine:Awaited<ReturnType<typeof createEngine>>;
const allowed=new Set(['state.get','bot.create','bot.update','bot.delete','bot.restore','bot.setMain','bot.takeover','memory.list','memory.save','memory.revisions','memory.rollback','memory.delete','activity.get','activity.reconcile','chat.create','chat.send','chat.pause','chat.resume','chat.delete','settings.update','provider.save','provider.test','provider.discover','provider.activate','provider.delete','routine.save','routine.delete','routine.run','skill.save','skill.install','skill.delete','approval.resolve','connector.save','connector.test','connector.classify','connector.delete']);
const desktopCommands=new Set(['runtime.status','runtime.build','workspace.inspect','workspace.start','workspace.stop','workspace.exec','workspace.files','workspace.read','workspace.write','workspace.screenshot','workspace.export','files.pick','files.open','app.info','app.open-data','app.quit','external.open']);
for(const command of ['media.models','media.generate','media.transcribe','media.cancel','connector.authorize'])allowed.add(command);
allowed.add('bot.createBlank');
for(const command of ['avatar.pick','voice.microphone','chat.export'])desktopCommands.add(command);
let microphoneUntil=0;
function normalizeAvatar(data:string) {
  if(data.length>28_000_100||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data))throw new Error('Choose a PNG, JPEG, or WebP image.');
  const image=nativeImage.createFromDataURL(data),size=image.getSize();
  if(image.isEmpty()||!size.width||!size.height||size.width>16000||size.height>16000)throw new Error('This avatar image could not be read.');
  const side=Math.min(size.width,size.height),square=image.crop({x:Math.floor((size.width-side)/2),y:Math.floor((size.height-side)/2),width:side,height:side}).resize({width:256,height:256,quality:'best'});
  return square.toDataURL();
}

function isTrustedUrl(value:string){
  try{const url=new URL(value);return url.protocol==='ibot:'&&url.hostname==='app'||!!process.env.IBOT_DEV_URL&&url.origin==='http://127.0.0.1:5177';}catch{return false;}
}
function validateSender(event:Electron.IpcMainInvokeEvent|Electron.IpcMainEvent){
  if(!win||event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame||!isTrustedUrl(event.senderFrame.url))throw new Error('This action is only available in OpenIbot.');
}
function textArg(args:Record<string,unknown>,key:string,max=10000){const value=args[key];if(typeof value!=='string'||!value||value.length>max)throw new Error(`Invalid ${key}.`);return value;}
let priorState:AppState|undefined;
function sendState(state:AppState){
  if(win&&!win.isDestroyed())win.webContents.send('ibot:state',state);
  if(priorState && state.settings.notifications && win && !win.isFocused() && process.env.IBOT_TEST!=='1' && Notification.isSupported()) {
    const pending=state.approvals.find(item=>item.status==='pending'&&!priorState!.approvals.some(old=>old.id===item.id));
    const finished=state.chats.find(chat=>['idle','error'].includes(chat.status)&&priorState!.chats.some(old=>old.id===chat.id&&old.status==='running'));
    const body=pending?'A bot needs your approval to continue.':finished?`${finished.title}: ${finished.status==='error'?'needs attention':'finished'}.`:'';
    if(body){const notice=new Notification({title:'OpenIbot',body});notice.on('click',showWindow);notice.show();}
  }
  priorState=state;
}
function showWindow(){if(win){win.show();if(win.isMinimized())win.restore();win.focus();}}
app.on('second-instance',showWindow);
app.on('activate',showWindow);

app.whenReady().then(async()=>{
  const dataDir=app.getPath('userData');
  const resourceDir=app.isPackaged?process.resourcesPath:app.getAppPath();
  const runtime=createRuntime({dataDir,resourcesDir:resourceDir,networkHosts:botId=>engine.getState().bots.find(bot=>bot.id===botId)?.networkHosts??[]});
  engine=await createEngine({dataDir,runtime,emit:sendState,
    openExternal:async url=>{await shell.openExternal(url);},normalizeAvatar,
    encrypt:(text:string)=>{if(!safeStorage.isEncryptionAvailable())throw new Error('Windows credential encryption is unavailable.');return safeStorage.encryptString(text).toString('base64');},
    decrypt:(text:string)=>safeStorage.decryptString(Buffer.from(text,'base64')),
  });
  priorState=engine.getState();
  const rendererRoot=path.join(app.getAppPath(),'dist-renderer');
  protocol.handle('ibot',request=>{
    const url=new URL(request.url);if(url.hostname!=='app')return new Response('Not found',{status:404});
    let file:string;
    try{file=path.resolve(rendererRoot,'.'+decodeURIComponent(url.pathname));}catch{return new Response('Bad path',{status:400});}
    if(!file.startsWith(rendererRoot+path.sep))return new Response('Forbidden',{status:403});
    return net.fetch(pathToFileURL(file).toString());
  });
  win=new BrowserWindow({width:1360,height:900,minWidth:960,minHeight:640,show:false,frame:false,backgroundColor:'#0c1413',title:'OpenIbot',icon:path.join(app.getAppPath(),'assets','icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,spellcheck:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(!isTrustedUrl(url))event.preventDefault();});
  win.webContents.on('will-attach-webview',event=>event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((wc,permission,callback,details)=>callback(wc===win?.webContents&&details.isMainFrame&&isTrustedUrl(details.requestingUrl)&&permission==='media'&&Date.now()<microphoneUntil&&'mediaTypes'in details&&details.mediaTypes?.length===1&&details.mediaTypes[0]==='audio'));
  win.webContents.session.setPermissionCheckHandler((wc,permission,_origin,details)=>wc===win?.webContents&&details.isMainFrame&&isTrustedUrl(details.requestingUrl??'')&&permission==='media'&&details.mediaType==='audio'&&Date.now()<microphoneUntil);
  win.on('hide',()=>{microphoneUntil=0;win?.webContents.send('ibot:voice-stop');});
  win.on('close',event=>{if(!quitting&&engine.getState().settings.closeToTray&&tray){event.preventDefault();win?.hide();}});
  win.on('closed',()=>{win=null;});
  win.once('ready-to-show',()=>{if(process.env.IBOT_TEST!=='1')win?.show();});
  Menu.setApplicationMenu(null);
  const icon=nativeImage.createFromPath(path.join(app.getAppPath(),'assets','icon.png'));
  if(!icon.isEmpty()){
    tray=new Tray(icon.resize({width:20,height:20}));tray.setToolTip('OpenIbot — your team is here');
    tray.setContextMenu(Menu.buildFromTemplate([{label:'Open OpenIbot',click:showWindow},{type:'separator'},{label:'Quit OpenIbot',click:()=>{quitting=true;app.quit();}}]));tray.on('double-click',showWindow);
  }
  ipcMain.on('ibot:window',(event,action)=>{validateSender(event);if(action==='minimize')win?.minimize();else if(action==='maximize'){if(win?.isMaximized())win.unmaximize();else win?.maximize();}else if(action==='close')win?.close();});
  ipcMain.handle('ibot:invoke',async(event,command:unknown,input:unknown)=>{
    validateSender(event);
    if(typeof command!=='string'||(!allowed.has(command)&&!desktopCommands.has(command)))throw new Error('Unknown application action.');
    if(input!==undefined&&(!input||typeof input!=='object'||Array.isArray(input)))throw new Error('Invalid action data.');
    // Actor metadata is created after sender validation, never taken from the payload.
    const invocation={actor:'user' as const,command,args:(input??{}) as Record<string,unknown>};
    const args=invocation.args;
    if(JSON.stringify(args).length>4_000_000)throw new Error('Action data is too large.');
    if(command==='voice.microphone'){microphoneUntil=Date.now()+15_000;return true;}
    if(command==='avatar.pick'){
      const result=await dialog.showOpenDialog(win!,{title:'Choose a bot avatar',properties:['openFile'],filters:[{name:'Images',extensions:['png','jpg','jpeg','webp']}]});if(result.canceled||!result.filePaths[0])return null;
      const source=result.filePaths[0],stat=await fs.stat(source);if(!stat.isFile()||stat.size>10*1024*1024)throw new Error('Choose an image smaller than 10 MB.');
      const extension=path.extname(source).toLowerCase(),mime=extension==='.webp'?'image/webp':['.jpg','.jpeg'].includes(extension)?'image/jpeg':'image/png';
      return {image:normalizeAvatar(`data:${mime};base64,${(await fs.readFile(source)).toString('base64')}`)};
    }
    if((command==='bot.update'||command==='bot.create')&&args.avatarImage)args.avatarImage=normalizeAvatar(textArg(args,'avatarImage',400_000));
    if(command==='chat.export'){
      const state=engine.getState(),chat=state.chats.find(item=>item.id===args.chatId);if(!chat)throw new Error('Conversation not found.');
      const result=await dialog.showSaveDialog(win!,{title:'Export conversation',defaultPath:chat.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'').slice(0,80)+'.md',filters:[{name:'Markdown',extensions:['md']}]});if(result.canceled||!result.filePath)return false;
      const body=state.messages.filter(item=>item.chatId===chat.id).map(item=>`## ${item.role==='user'?'You':state.bots.find(bot=>bot.id===item.botId)?.name??'OpenIbot'} · ${new Date(item.createdAt).toLocaleString()}\n\n${item.content}\n${item.attachments?.map(file=>`\nAttachment: ${file.name}`).join('')??''}`).join('\n\n');
      await fs.writeFile(result.filePath,`# ${chat.title}\n\n${body}\n`,'utf8');return true;
    }
    if(command.startsWith('workspace.')){
      const botId=textArg(args,'botId',100);
      if(!engine.getState().bots.some(bot=>bot.id===botId))throw new Error('Bot not found.');
      if(command==='workspace.start')return runtime.ensure(botId);
      if(command==='workspace.inspect')return runtime.inspect(botId);
      if(command==='workspace.stop')return runtime.stop(botId);
      if(command==='workspace.exec')return runtime.exec(botId,textArg(args,'command',50000));
      if(command==='workspace.files')return runtime.listFiles(botId,typeof args.path==='string'?args.path:undefined);
      if(command==='workspace.read')return runtime.readFile(botId,textArg(args,'path',400));
      if(command==='workspace.write'){const content=typeof args.content==='string'?args.content:'';await runtime.writeFile(botId,textArg(args,'path',400),content);return true;}
      if(command==='workspace.screenshot')return runtime.screenshot(botId);
      if(command==='workspace.export'){
        const file=textArg(args,'path',400);const result=await dialog.showSaveDialog(win!,{defaultPath:path.basename(file)});if(result.canceled||!result.filePath)return false;await runtime.exportFile(botId,file,result.filePath);return true;
      }
    }
    if(command==='runtime.status')return runtime.status();
    if(command==='runtime.build')return runtime.buildImage(line=>{if(win&&!win.isDestroyed())win.webContents.send('ibot:runtime-log',line);});
    if(command==='files.pick'){
      const result=await dialog.showOpenDialog(win!,{properties:['openFile','multiSelections']});if(result.canceled)return [];
      const imports=path.join(dataDir,'imports');await fs.mkdir(imports,{recursive:true});
      const output:Attachment[]=[];
      for(const source of result.filePaths.slice(0,10)){const stat=await fs.stat(source);if(!stat.isFile()||stat.size>25*1024*1024)throw new Error('Choose files smaller than 25 MB.');const id=randomUUID();const name=path.basename(source);const destination=path.join(imports,id+'-'+name);await fs.copyFile(source,destination);output.push({id,name,path:destination,size:stat.size});}
      return output;
    }
    if(command==='files.open'){
      const candidate=path.resolve(textArg(args,'path',4000));const imports=path.join(dataDir,'imports');
      if(!candidate.startsWith(imports+path.sep))throw new Error('Only attached local files can be opened.');
      const resolved=await fs.realpath(candidate);if(!resolved.startsWith(imports+path.sep))throw new Error('Invalid attachment.');
      const err=await shell.openPath(resolved);if(err)throw new Error(err);return true;
    }
    if(command==='external.open'){const url=new URL(textArg(args,'url',4000));if(!['https:','http:'].includes(url.protocol))throw new Error('Only web links can be opened.');await shell.openExternal(url.toString());return true;}
    if(command==='app.open-data'){await shell.openPath(dataDir);return true;}
    if(command==='app.info')return {version:app.getVersion(),dataDir,packaged:app.isPackaged,platform:process.platform};
    if(command==='app.quit'){quitting=true;app.quit();return true;}
    if(command==='chat.send'&&Array.isArray(args.attachments)){
      const imports=path.join(dataDir,'imports');
      for(const attachment of args.attachments as Attachment[]){if(!attachment||typeof attachment.path!=='string'||!path.resolve(attachment.path).startsWith(imports+path.sep))throw new Error('Attach files using the file picker.');}
    }
    return engine.invoke(command,args,{actor:invocation.actor});
  });
  if(process.env.IBOT_DEV_URL){if(process.env.IBOT_DEV_URL!=='http://127.0.0.1:5177')throw new Error('Invalid development server.');await win.loadURL(process.env.IBOT_DEV_URL);}else await win.loadURL('ibot://app/index.html');
}).catch(error=>{console.error(error);dialog.showErrorBox('OpenIbot could not start',error instanceof Error?error.message:String(error));quitting=true;app.quit();});
app.on('before-quit',event=>{quitting=true;if(engine&&!shutdownComplete){event.preventDefault();if(!shutdownStarted){shutdownStarted=true;Promise.resolve(engine.shutdown()).finally(()=>{shutdownComplete=true;app.quit();});}}});
app.on('window-all-closed',()=>{if(!tray||quitting||!engine?.getState().settings.closeToTray)app.quit();});
