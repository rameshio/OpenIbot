import {Plus,Users} from 'lucide-react';
import type {Bot,Chat} from '../shared/types';
import {Avatar} from './Avatar';
export function TeamNavigation({chats,bots,selectedId,onSelect,onCreate}:{chats:Chat[];bots:Bot[];selectedId?:string;onSelect:(id:string)=>void;onCreate:()=>void}){
 return <section aria-label="Teams"><div className="sidebar-label">Teams<button aria-label="Create team chat" onClick={onCreate}><Plus size={13}/></button></div>{chats.map(chat=>{const members=bots.filter(bot=>chat.botIds.includes(bot.id));return <button key={chat.id} className={'sidebar-item '+(selectedId===chat.id?'active':'')} aria-label={`Open team ${chat.title}`} onClick={()=>onSelect(chat.id)}><span className="group-avatar" aria-hidden="true">{members.slice(0,3).map(bot=><Avatar key={bot.id} bot={bot} size={24} quiet/>)}</span><span className="sidebar-item-text"><span className="sidebar-item-title">{chat.title}</span><span className="sidebar-preview">{chat.status==='running'?'Working together':chat.status==='paused'?'Paused':`${members.length} bots · ${members.map(bot=>bot.name).join(', ')}`}</span></span>{chat.status==='running'&&<Users size={13}/>}</button>;})}</section>;
}
