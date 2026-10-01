import {contextBridge,ipcRenderer} from 'electron';
import type {AppState,DesktopAPI} from '../shared/types';
const api:DesktopAPI={
  invoke:(command,args)=>ipcRenderer.invoke('ibot:invoke',command,args),
  onState:(callback)=>{const listener=(_event:unknown,state:AppState)=>callback(state);ipcRenderer.on('ibot:state',listener);return()=>ipcRenderer.removeListener('ibot:state',listener);},
  onRuntimeLog:(callback)=>{const listener=(_event:unknown,line:string)=>callback(line);ipcRenderer.on('ibot:runtime-log',listener);return()=>ipcRenderer.removeListener('ibot:runtime-log',listener);},
  onVoiceStop:(callback)=>{const listener=()=>callback();ipcRenderer.on('ibot:voice-stop',listener);return()=>ipcRenderer.removeListener('ibot:voice-stop',listener);},
  window:(action)=>ipcRenderer.send('ibot:window',action),
};
contextBridge.exposeInMainWorld('ibot',api);
