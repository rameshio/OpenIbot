import {createContext} from 'react';
import type {Bot, Message} from '../shared/types';

export interface ConversationCue {pose:string; key:string; expiresAt?:number}
export const ConversationAvatarContext=createContext<Record<string,ConversationCue>>({});

export function replyPose(message:Message):string {
 if(message.role==='error')return 'sad';
 const text=message.content.trim();
 if(/\b(?:failed|unable to|couldn't|cannot complete|could not complete)\b/i.test(text))return 'sad';
 if(/\b(?:could you|can you clarify|please clarify|which do you|what would you|need more information)\b/i.test(text)||text.endsWith('?'))return 'widebody';
 if(message.attachments?.length)return 'triangle';
 if(/\b(?:completed|finished|done|successfully)\b/i.test(text))return 'happy';
 return 'wink';
}

/** Cues belong to the open conversation, and never change persisted identity. */
export function conversationCues(bots:Bot[],messages:Message[],draft:string,sending:boolean,now=Date.now()):Record<string,ConversationCue> {
 return Object.fromEntries(bots.flatMap(bot=>{
  if(sending)return [[bot.id,{pose:'up',key:'sending'}]];
  if(draft.trim())return [[bot.id,{pose:'widebody',key:'listening'}]];
  const latest=messages.filter(message=>message.role==='user'||message.botId===bot.id&&['assistant','error'].includes(message.role)).at(-1);
  if(!latest)return [];
  const expiresAt=Date.parse(latest.createdAt)+8000;
  if(!Number.isFinite(expiresAt)||expiresAt<=now)return [];
  const pose=latest.role==='user'?'squint':replyPose(latest);
  return [[bot.id,{pose,key:latest.id,expiresAt}]];
 }));
}
