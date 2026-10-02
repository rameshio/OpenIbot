import type {Bot,Chat,Message} from '../shared/types';
const status:Record<Bot['status'],string>={idle:'Ready when you are',thinking:'Thinking…',working:'Working on it',waiting:'Needs your attention',done:'Work completed',error:'Needs attention'};
function visibleText(content:string){return content.replace(/<!--[\s\S]*?-->/g,'').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*#`_~]/g,'').replace(/\s+/g,' ').trim();}
/** Match the individual conversation opened by bot navigation; group replies belong to teams. */
export function botActivity(bot:Bot,chats:Chat[],messages:Message[]):string{
 if(['thinking','working','waiting','error'].includes(bot.status))return status[bot.status];
 const individual=new Set(chats.filter(chat=>chat.botIds.length===1&&chat.botIds[0]===bot.id).map(chat=>chat.id));
 const reply=messages.filter(message=>individual.has(message.chatId)&&message.botId===bot.id&&message.role==='assistant'&&(visibleText(message.content)||message.attachments?.length)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
 if(!reply)return status[bot.status];
 return (visibleText(reply.content)||`Shared ${reply.attachments![0].name}`).slice(0,160);
}
export function teamChats(chats:Chat[],bots:Bot[],search:string):Chat[]{
 const active=new Map(bots.map(bot=>[bot.id,bot]));const query=search.trim().toLowerCase();
 return chats.filter(chat=>chat.botIds.length>1&&chat.botIds.every(id=>active.has(id))&&(!query||(chat.title+' '+chat.botIds.map(id=>active.get(id)!.name).join(' ')).toLowerCase().includes(query))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
