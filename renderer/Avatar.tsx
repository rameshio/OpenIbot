import {useContext, type CSSProperties} from 'react';
import type {Bot} from '../shared/types';
import type {StateId} from './avatar-engine/states';
import {activityLabels, eyeColor} from './avatar-behavior';
import {AvatarDrawing} from './AvatarDrawing';
import {GrokDrawing} from './GrokDrawing';
import {ConversationAvatarContext} from './conversation-avatar';

type Identity=Pick<Bot,'avatar'|'color'|'status'|'name'> & Partial<Pick<Bot,'id'|'avatarImage'|'accessory'|'expression'|'completedAt'>>;
export function Avatar({bot,size=40,quiet=false,motion,frozenAt}:{bot:Identity;size?:number;quiet?:boolean;motion?:StateId;frozenAt?:number}) {
 const cues=useContext(ConversationAvatarContext),cue=bot.id?cues[bot.id]:undefined;
 const phase=Array.from(bot.name).reduce((sum,char)=>sum+char.charCodeAt(0),0)%83/10;
 const status=quiet?'idle':bot.status;
 const eyes=eyeColor(bot.color);
 return <span className="bot-avatar" data-renderer={motion?"svg":"grok"} data-shape={bot.avatar} data-custom={bot.avatarImage?'true':undefined} data-accessory={bot.accessory??'none'} data-expression={bot.expression??'neutral'} data-status={status} style={{'--bot-color':bot.color,'--bot-size':size+'px','--bot-eye':eyes,'--bot-outline':eyes==='#f5f5f5'?'#ffffff35':'#00000010'} as CSSProperties} aria-label={`${bot.name} · ${activityLabels[status]}`} title={`${bot.name} · ${activityLabels[status]}`} role="img">
  <span className="bot-float">{bot.avatarImage?<><img className="bot-custom-image" src={bot.avatarImage} alt=""/><span className="custom-activity" aria-hidden="true"/></>:motion?<AvatarDrawing shape={bot.avatar} expression={bot.expression} status={status} completedAt={bot.completedAt} phase={phase} quiet={quiet} motion={motion} frozenAt={frozenAt}/>:<GrokDrawing shape={bot.avatar} expression={bot.expression} status={status} completedAt={bot.completedAt} phase={phase} cue={cue} quiet={quiet||frozenAt!==undefined}/>}
  {bot.accessory&&bot.accessory!=='none'&&<svg className="bot-accessory" viewBox="0 0 100 100" aria-hidden="true">{bot.accessory==='glasses'?<g fill="none" stroke="currentColor" strokeWidth="4"><rect x="24" y="40" width="21" height="17" rx="5"/><rect x="55" y="40" width="21" height="17" rx="5"/><path d="M45 47h10M17 43h7M76 43h7"/></g>:bot.accessory==='headphones'?<g fill="currentColor"><path d="M16 47a34 34 0 0 1 68 0h-5a29 29 0 0 0-58 0z"/><rect x="12" y="42" width="10" height="25" rx="5"/><rect x="78" y="42" width="10" height="25" rx="5"/></g>:bot.accessory==='halo'?<ellipse cx="50" cy="12" rx="26" ry="7" fill="none" stroke="#f3df91" strokeWidth="4"/>:bot.accessory==='cap'?<g fill="currentColor"><path d="M28 29v-9q22-16 44 0v9z"/><path d="M28 27h54q8 7-5 7H28z"/></g>:bot.accessory==='crown'?<path d="M29 27l-5-22 17 12L50 2l9 15L76 5l-5 22z" fill="#efd17e" stroke="#a78643" strokeWidth="2"/>:<g fill="#f3df91"><path d="M12 14l3 8 8 3-8 3-3 8-3-8-8-3 8-3zM86 60l3 7 7 3-7 3-3 7-3-7-7-3 7-3zM81 4l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g>}</svg>}
  </span>
 </span>;
}
