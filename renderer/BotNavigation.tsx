import {MoreHorizontal,Pencil,Plus,Star,Trash2} from 'lucide-react';
import type {Bot} from '../shared/types';
import {Avatar} from './Avatar';

interface Props {bots:Bot[];mainBotId:string;selectedId?:string;onSelect:(bot:Bot)=>void;onEdit:(bot:Bot)=>void;onCreate:()=>void;onDelete:(bot:Bot)=>void;onSetMain:(bot:Bot)=>Promise<void>;section?:'all'|'main'|'others';previews?:Record<string,string>;}
const status:Record<Bot['status'],string>={idle:'Ready when you are',thinking:'Thinking…',working:'Working on it',waiting:'Needs your attention',done:'Work completed',error:'Needs attention'};
export function BotNavigation({bots,mainBotId,selectedId,onSelect,onEdit,onCreate,onDelete,onSetMain,section='all',previews={}}:Props){
 const main=bots.find(bot=>bot.id===mainBotId);
 const row=(bot:Bot,primary=false)=><div className={'bot-navigation-row'+(primary?' main-bot-card':'')} key={bot.id}>
  <button className={'sidebar-item '+(selectedId===bot.id?'active':'')} aria-label={primary?`Open main bot ${bot.name}`:undefined} onClick={()=>onSelect(bot)}>{primary?<span className="main-bot-avatar"><Avatar bot={bot} size={64}/><span className="main-bot-badge"><Star size={12} aria-label={`Main bot: ${bot.name}`}/></span></span>:<Avatar bot={bot} size={32}/>}<span className="sidebar-item-text"><span className="sidebar-item-title">{bot.name}</span>{!primary&&<span className="sidebar-preview">{previews[bot.id]??status[bot.status]}</span>}</span>{bot.status==='waiting'&&<span className="attention-dot"/>}</button>
  <details className="bot-navigation-menu"><summary aria-label={`Options for ${bot.name}`}><MoreHorizontal size={16}/></summary><div><button onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');onEdit(bot);}}><Pencil size={14}/>Rename {bot.name}</button>{!primary&&<button onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');void onSetMain(bot);}}><Star size={14}/>Make {bot.name} main bot</button>}<button onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');onCreate();}}><Plus size={14}/>Create new bot</button><button className="bot-delete-menu-item" onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');onDelete(bot);}}><Trash2 size={14}/>Delete {bot.name}</button></div></details>
 </div>;
 return <>{section!=='others'&&main&&row(main,true)}{section!=='main'&&<>{bots.filter(bot=>bot.id!==mainBotId).map(bot=>row(bot))}</>}</>;
}
