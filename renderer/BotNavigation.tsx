import {MoreHorizontal,Pencil,Plus,Star} from 'lucide-react';
import type {Bot} from '../shared/types';
import {Avatar} from './Avatar';

interface Props {bots:Bot[];mainBotId:string;selectedId?:string;onSelect:(bot:Bot)=>void;onEdit:(bot:Bot)=>void;onCreate:()=>void;onSetMain:(bot:Bot)=>Promise<void>;}
const status:Record<Bot['status'],string>={idle:'Ready when you are',thinking:'Thinking…',working:'Working on it',waiting:'Needs your attention',done:'Work completed',error:'Needs attention'};
export function BotNavigation({bots,mainBotId,selectedId,onSelect,onEdit,onCreate,onSetMain}:Props){
 const main=bots.find(bot=>bot.id===mainBotId);
 const row=(bot:Bot,primary=false)=><div className={'bot-navigation-row'+(primary?' main-bot-card':'')} key={bot.id}>
  <button className={'sidebar-item '+(selectedId===bot.id?'active':'')} onClick={()=>onSelect(bot)}><Avatar bot={bot} size={primary?48:40}/><span className="sidebar-item-text"><span className="sidebar-item-title">{bot.name}{primary&&<Star size={13} className="main-bot-star" aria-label={`Main bot: ${bot.name}`}/>}</span><span className="sidebar-preview">{primary?'Main bot · '+status[bot.status]:status[bot.status]}</span></span>{bot.status==='waiting'&&<span className="attention-dot"/>}</button>
  <details className="bot-navigation-menu"><summary aria-label={`Options for ${bot.name}`}><MoreHorizontal size={16}/></summary><div><button onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');onEdit(bot);}}><Pencil size={14}/>Rename {bot.name}</button>{!primary&&<button onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');void onSetMain(bot);}}><Star size={14}/>Make {bot.name} main bot</button>}<button onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');onCreate();}}><Plus size={14}/>Create new bot</button></div></details>
 </div>;
 return <>{main&&<><div className="sidebar-label">Main bot</div>{row(main,true)}</>}<div className="sidebar-label">Your bots<button aria-label="Create a bot" onClick={onCreate}><Plus size={13}/></button></div>{bots.filter(bot=>bot.id!==mainBotId).map(bot=>row(bot))}</>;
}
