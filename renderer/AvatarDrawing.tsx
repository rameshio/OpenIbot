import {useEffect, useId, useRef, useState, useSyncExternalStore} from 'react';
import type {AvatarExpression, AvatarShape, BotStatus} from '../shared/types';
import {BotEngine, type BotFrame} from './avatar-engine/engine';
import {NOTIF_BLUE, type DotRender} from './avatar-engine/decor';
import {DEMI_VIEWBOX, RAYON} from './avatar-engine/repere';
import {POSES, type StateId} from './avatar-engine/states';
import {activityFor, expressionFor, shapeFor} from './avatar-behavior';
import {animateAvatar, avatarTime, motionSnapshot, watchMotion} from './avatar-clock';

export function AvatarDrawing({shape,expression,status,completedAt,phase,quiet,motion,frozenAt}:{shape:AvatarShape;expression?:AvatarExpression;status:BotStatus;completedAt?:string;phase:number;quiet:boolean;motion?:StateId;frozenAt?:number}) {
 const uid=useId().replace(/:/g,''),svg=useRef<SVGSVGElement>(null);
 const preference=useSyncExternalStore(watchMotion,motionSnapshot);
 const clock=()=>avatarTime()+phase;
 const engine=useRef<BotEngine|null>(null);
 if(!engine.current){engine.current=new BotEngine(RAYON,motion??(status==='done'?'idle':activityFor[status]),shapeFor(shape),expressionFor(expression));engine.current.reset(engine.current.state,clock()-1);}
 const [frame,setFrame]=useState<BotFrame>(()=>engine.current!.sample(clock()));
 const previous=useRef(status),lastCompletion=useRef(completedAt),celebration=useRef<number|null>(null);
 useEffect(()=>{
  const botEngine=engine.current!,time=clock();
  botEngine.setShape(shapeFor(shape),time);botEngine.setExpression(expressionFor(expression),time);
  if(previous.current!==status){if(status==='done')celebration.current=time;else if(status!=='idle')celebration.current=null;previous.current=status;}
  // A completed run returns to idle immediately; its durable marker keeps the
  // brief completion gesture visible even when React batches those messages.
  if(lastCompletion.current!==completedAt){if(completedAt&&['idle','done'].includes(status))celebration.current=time;lastCompletion.current=completedAt;}
  const state=motion??(celebration.current!==null?'burst':status==='done'?'idle':activityFor[status]);
  botEngine.setState(state,time);
  // Static states keep their meaning when motion is disabled, without a hidden loop.
  if(quiet||frozenAt!==undefined||preference!=='full') {
   const still=new BotEngine(RAYON,state==='burst'?'idle':state,shapeFor(shape),expressionFor(expression));
   setFrame(still.sample(frozenAt??POSES[still.state]));
   return;
  }
  let stop:(()=>void)|undefined;
  const draw=(at:number)=>{
   const t=at+phase;
   if(!motion&&celebration.current!==null&&t-celebration.current>2.7){botEngine.setState('idle',t);celebration.current=null;}
   setFrame(botEngine.sample(t));
  };
  const visibility=new IntersectionObserver(entries=>{if(entries[0]?.isIntersecting){if(!stop)stop=animateAvatar(draw);}else{stop?.();stop=undefined;}},{rootMargin:'20px'});
  if(svg.current)visibility.observe(svg.current);
  setFrame(botEngine.sample(time));
  return()=>{stop?.();visibility.disconnect();};
 },[shape,expression,status,completedAt,phase,quiet,motion,frozenAt,preference]);
 const dots=(items:DotRender[])=>items.map((dot,i)=>{
  const fill=dot.color??(dot.depth===undefined?'var(--bot-color)':`color-mix(in srgb, var(--bot-color) ${Math.round(dot.depth*100)}%, var(--bg))`);
  return dot.d?<path key={i} d={dot.d} transform={`translate(${dot.x} ${dot.y}) rotate(${dot.rot??0})`} opacity={dot.opacity} fill={fill}/>:<circle key={i} cx={dot.x} cy={dot.y} r={dot.r} opacity={dot.opacity} fill={fill}/>;
 });
 return <svg ref={svg} className="bot-drawing" viewBox={`${-DEMI_VIEWBOX} ${-DEMI_VIEWBOX} ${DEMI_VIEWBOX*2} ${DEMI_VIEWBOX*2}`} aria-hidden="true" data-activity={motion??activityFor[status]} data-playing={!quiet&&frozenAt===undefined&&preference==='full'}>
  <defs><mask id={`${uid}-face`} maskUnits="userSpaceOnUse" x={-DEMI_VIEWBOX} y={-DEMI_VIEWBOX} width={DEMI_VIEWBOX*2} height={DEMI_VIEWBOX*2} style={{maskType:'luminance'}}><path d={frame.bodyPath} fill="white"/><g className="bot-face">{frame.eyes.map((eye,i)=><path className="bot-eye" key={i} d={eye.d} transform={eye.matrix} opacity={eye.alpha} fill="black"/>)}</g>{frame.notch&&<circle cx={frame.notch.x} cy={frame.notch.y} r={frame.notch.r} fill="black"/>}</mask>
  {frame.arcs.map(arc=><linearGradient key={arc.id} id={`${uid}-${arc.id}`} gradientUnits="userSpaceOnUse" x1={arc.grad.x1} y1={arc.grad.y1} x2={arc.grad.x2} y2={arc.grad.y2}>{arc.grad.stops.map((color,i)=><stop key={i} offset={i/(arc.grad.stops.length-1)} stopColor={color}/>)}</linearGradient>)}</defs>
  <g className="bot-orbits" fill="none" strokeLinecap="round">{frame.arcs.map(arc=><path key={arc.id} d={arc.back} stroke={`url(#${uid}-${arc.id})`} strokeWidth={arc.width} opacity={arc.opacity}/>)}</g>
  {frame.dotsBehind&&<g className="bot-particles">{dots(frame.dots)}</g>}
  <g opacity={frame.bodyAlpha}><path className="bot-body-path" d={frame.bodyPath} fill="var(--bot-eye)"/><g mask={`url(#${uid}-face)`}><rect x={-DEMI_VIEWBOX} y={-DEMI_VIEWBOX} width={DEMI_VIEWBOX*2} height={DEMI_VIEWBOX*2} fill="var(--bot-color)"/></g><path d={frame.bodyPath} fill="none" stroke="var(--bot-outline)" strokeWidth=".7"/></g>
  {!frame.dotsBehind&&<g className="bot-particles">{dots(frame.dots)}</g>}
  {frame.notif&&<circle className="bot-notification" cx={frame.notif.x} cy={frame.notif.y} r={frame.notif.r} fill={NOTIF_BLUE}/>}
  <g className="bot-orbits bot-orbits-front" fill="none" strokeLinecap="round">{frame.arcs.map(arc=><path key={arc.id} d={arc.front} stroke={`url(#${uid}-${arc.id})`} strokeWidth={arc.width} opacity={arc.opacity}/>)}</g>
 </svg>;
}
