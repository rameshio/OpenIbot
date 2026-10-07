import {ArrowUpRight,ChevronDown,FileText,Monitor} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type {Attachment,Bot,Message} from '../shared/types';
import {Avatar} from './Avatar';
const time=(iso:string)=>new Date(iso).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
const invoke=(command:string,args:Record<string,unknown>)=>window.ibot.invoke(command,args);
export function MessageBody({message,bots,onFile}:{message:Message;bots:Bot[];onFile:(file:Attachment)=>void}){
 const visible=message.content.replace(/<!--[\s\S]*?-->/g,'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim();
 if(!visible&&!message.attachments?.length)return null;
 const bot=bots.find(item=>item.id===message.botId);const event=message.role==='event';
 if(event&&message.content.length>180)return <details className="chat-event-detail"><summary><ArrowUpRight size={14}/><span>{message.content.split('\n')[0].slice(0,120)}</span><ChevronDown size={12}/></summary><pre>{message.content}</pre></details>;
 if(event)return <div className="chat-event"><ArrowUpRight size={14}/><span>{message.content}</span><time>{time(message.createdAt)}</time></div>;
 return <article className={'message message-'+message.role}>{message.role!=='user'&&<div className="message-avatar">{bot?<Avatar bot={bot} size={32} quiet/>:<Monitor size={22}/>}</div>}<div className="message-inner"><div className="message-byline"><strong>{message.role==='user'?'You':bot?.name??'OpenIbot'}</strong><time>{time(message.createdAt)}</time></div>{!!visible&&<div className="message-bubble"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{a:({href,children})=><a href={href} onClick={e=>{e.preventDefault();if(href)void invoke('external.open',{url:href});}}>{children}</a>,img:({alt})=><span className="muted">{alt||'Image attachment'}</span>}}>{message.content}</ReactMarkdown></div>}{message.attachments?.map(file=><button className="message-file" key={file.id} onClick={()=>onFile(file)}><FileText size={22}/><span>{file.name}<small>{file.size?(file.size/1024).toFixed(1)+' KB':'Open file'}</small></span><ArrowUpRight size={15}/></button>)}</div></article>;
}
