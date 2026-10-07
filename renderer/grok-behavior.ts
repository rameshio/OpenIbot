import type {AvatarExpression, AvatarShape, BotStatus} from '../shared/types';
import {grokPoses, type GrokEye, type GrokPose} from './grok-poses';
export const grokPose = (id:string):GrokPose => grokPoses.find(p=>p.id===id)??grokPoses[0];
export const grokActivity:Record<BotStatus,string> = {idle:'glance',thinking:'up',working:'working',waiting:'alert',error:'bang',done:'happy'};
const faces:Record<AvatarExpression,string> = {neutral:'glance',attentive:'widebody',surprised:'wide',excited:'happy',happy:'happy',laughing:'happy',angry:'squint',sad:'sad',scared:'wide',suspicious:'squint',confused:'dizzy',curious:'up',proud:'wink',shy:'look',unimpressed:'squint',sleepy:'sleepy'};
const shapes:Record<AvatarShape,string> = {orbit:'circle',pebble:'egg',capsule:'widebody',prism:'square',bloom:'circle',sprout:'square',triangle:'triangle',drop:'drop'};
function fitEye(shape:AvatarShape,eye?:GrokEye):GrokEye|undefined {
 if(!eye||!['triangle','drop'].includes(shape))return eye;
 // Keep moving eyes inside pointed silhouettes, including the high resting gaze.
 return {...eye,l:`${24+parseFloat(eye.l)*.5}%`,t:`${30+parseFloat(eye.t)*.45}%`,w:`${parseFloat(eye.w)*.65}%`,h:`${parseFloat(eye.h)*.7}%`};
}
/** Resting identity persists; activity overrides it while a task needs it. */
export function grokRest(shape:AvatarShape, expression:AvatarExpression='neutral'):GrokPose {
 const base=grokPose(faces[expression]),body={...grokPose(shapes[shape]).body};
 if(shape==='prism'){body.radius='20%';body.clip='polygon(26% 0%, 76% 4%, 100% 30%, 94% 81%, 69% 100%, 20% 94%, 0% 65%, 5% 24%)';}
 if(shape==='bloom'){body.radius='36% 36% 42% 42% / 32% 32% 58% 58%';body.w=240;body.h=190;}
 if(shape==='sprout'){body.radius='45% 45% 28% 28%';body.rot=5;}
 const L=base.L?{...base.L}:undefined,R=base.R?{...base.R}:undefined;
 if(L&&R){
  if(expression==='excited'){L.h='30%';R.h='32%';}
  if(expression==='laughing'){L.h='7%';R.h='7%';}
  if(expression==='angry'){L.rot=22;R.rot=-22;}
  if(expression==='scared'){L.w='13%';R.w='13%';L.h='30%';R.h='30%';}
  if(expression==='suspicious'){R.h='17%';R.rot=-12;}
  if(expression==='unimpressed'){L.rot=0;R.rot=0;L.t='38%';R.t='38%';}
 }
 return {...base,id:expression,body,L:fitEye(shape,L),R:fitEye(shape,R),eyes:true,smile:expression==='laughing',spark:false};
}

/** A reaction changes the face and activity decoration, never the saved silhouette. */
export function grokReaction(shape:AvatarShape,expression:AvatarExpression|undefined,pose:string):GrokPose {
 const identity=grokRest(shape,expression),reaction=grokPose(pose);
 const face=pose==='alert'?grokPose('wide'):pose==='bang'?grokPose('sad'):reaction;
 return {...reaction,body:{...identity.body,motion:reaction.body.motion},eyes:true,L:face.L?fitEye(shape,face.L):identity.L,R:face.R?fitEye(shape,face.R):identity.R,brow:face.brow,mark:undefined,
  // The reference smile is a face detail, not a reason to replace the body.
  smile:reaction.smile};
}
