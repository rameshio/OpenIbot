import {useEffect, useRef, useState, useSyncExternalStore, type CSSProperties} from 'react';
import type {AvatarExpression, AvatarShape, BotStatus} from '../shared/types';
import {motionSnapshot, watchMotion} from './avatar-clock';
import {grokActivity, grokPose, grokReaction, grokRest} from './grok-behavior';
import type {GrokEye} from './grok-poses';
import type {ConversationCue} from './conversation-avatar';
const percent=(value:number)=>`${value/3}%`;
const eyeStyle=(eye?:GrokEye, blink=false):CSSProperties=>eye?{left:eye.l,top:blink?'33%':eye.t,width:eye.w,height:blink?'5%':eye.h,transform:`rotate(${eye.rot}deg)`}:{};
export function GrokDrawing({shape='orbit',expression,status='idle',completedAt,quiet=false,pose,phase=0,cue}:{shape?:AvatarShape;expression?:AvatarExpression;status?:BotStatus;completedAt?:string;quiet?:boolean;pose?:string;phase?:number;cue?:ConversationCue}) {
 const preference=useSyncExternalStore(watchMotion,motionSnapshot);
 const root=useRef<HTMLSpanElement>(null),previous=useRef({status,completedAt});
 const [visible,setVisible]=useState(false),[blink,setBlink]=useState(false),[celebrating,setCelebrating]=useState(false);
 const [expiredCue,setExpiredCue]=useState('');
 useEffect(()=>{if(!cue?.expiresAt)return;const key=cue.key;const timer=setTimeout(()=>setExpiredCue(key),Math.max(0,cue.expiresAt-Date.now()));return()=>clearTimeout(timer);},[cue?.key,cue?.expiresAt]);
 const conversational=!quiet&&cue&&cue.key!==expiredCue?cue.pose:undefined;
 const playing=!quiet&&visible&&preference==='full';
 useEffect(()=>{const observer=new IntersectionObserver(entries=>setVisible(!!entries[0]?.isIntersecting),{rootMargin:'20px'});if(root.current)observer.observe(root.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{
  const changed=status==='done'&&previous.current.status!=='done'||!!completedAt&&completedAt!==previous.current.completedAt&&['idle','done'].includes(status);
  previous.current={status,completedAt};
  if(changed&&!quiet)setCelebrating(true);
  if(!['idle','done'].includes(status))setCelebrating(false);
 },[status,completedAt,quiet]);
 useEffect(()=>{if(!celebrating)return;const timer=setTimeout(()=>setCelebrating(false),2700);return()=>clearTimeout(timer);},[celebrating]);
 useEffect(()=>{
  if(!playing||pose||!['idle','done'].includes(status)){setBlink(false);return;}
  let close:ReturnType<typeof setTimeout>,open:ReturnType<typeof setTimeout>;
  const schedule=()=>{close=setTimeout(()=>{setBlink(true);open=setTimeout(()=>{setBlink(false);schedule();},180);},3800+phase*120);};
  schedule();return()=>{clearTimeout(close);clearTimeout(open);};
 },[playing,pose,status,phase]);
 const reaction=quiet?undefined:!['idle','done'].includes(status)?grokActivity[status]:conversational??(celebrating?'happy':undefined);
 const item=pose?grokPose(pose):reaction?grokReaction(shape,expression,reaction):grokRest(shape,expression);
 const b=item.body;
 return <span ref={root} className="bot-drawing grok-drawing" aria-hidden="true" data-pose={item.id} data-activity={pose??grokActivity[status]} data-playing={playing}>
  <span className="grok-orbit" data-on={!!item.orbit}><i/><i/></span><span className="grok-spark" data-on={!!item.spark}><i/></span>
  <span className="grok-body" data-motion={b.motion} style={{width:percent(b.w),height:percent(b.h),borderRadius:b.radius,clipPath:b.clip,transform:`translate(${b.x/b.w*100}%, ${b.y/b.h*100}%) rotate(${b.rot}deg)`}}>
   <span className="grok-face" style={{opacity:item.eyes?1:0}}><i className="grok-eye" style={eyeStyle(item.L,blink)}/><i className="grok-eye" style={eyeStyle(item.R,blink)}/></span>
   <span className="grok-smile" data-on={!!item.smile}/><span className="grok-brow" data-on={!!item.brow}/>
  </span><span className="grok-mark" data-on={!!item.mark} style={item.mark?{width:percent(item.mark.w),height:percent(item.mark.h),top:item.mark.top,borderRadius:item.mark.radius}:undefined}/>
  {!pose&&['waiting','error'].includes(status)&&<span className={`grok-attention grok-attention-${status}`}>!</span>}
 </span>;
}
