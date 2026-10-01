import type {AvatarExpression, AvatarShape, BotStatus} from '../shared/types';
import {EXPRESSION_BY_ID, type ExpressionId} from './avatar-engine/expressions';
import {SHAPE_BY_ID, type ShapeId} from './avatar-engine/skins';
import type {StateId} from './avatar-engine/states';

const expressions: Record<AvatarExpression,ExpressionId> = {neutral:'neutre',attentive:'attentif',surprised:'surpris',excited:'excite',happy:'heureux',laughing:'hilare',angry:'colere',sad:'triste',scared:'effraye',suspicious:'mefiant',confused:'confus',curious:'curieux',proud:'fier',shy:'timide',unimpressed:'blase',sleepy:'somnolent'};
const shapes: Record<AvatarShape,ShapeId> = {orbit:'cercle',pebble:'galet',capsule:'capsule',prism:'hexagone',bloom:'nuage',sprout:'squircle',triangle:'triangle',drop:'goutte'};
export const expressionFor = (expression?: AvatarExpression)=>EXPRESSION_BY_ID.get(expressions[expression??'neutral'])??EXPRESSION_BY_ID.get('neutre')!;
export const shapeFor = (shape: AvatarShape)=>SHAPE_BY_ID.get(shapes[shape])?.radii??null;
export const activityFor: Record<BotStatus,StateId> = {idle:'idle',thinking:'thinking',working:'orbit',waiting:'notify',error:'alert',done:'burst'};
export const activityLabels: Record<BotStatus,string> = {idle:'At rest',thinking:'Thinking',working:'Working',waiting:'Needs your attention',error:'Blocked',done:'Done'};

/** Dark eyes on light bodies, light eyes on ink/dark custom colors. */
export function eyeColor(color:string) {
 const rgb=/^#[\da-f]{6}$/i.test(color)?[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255):[1,1,1];
 const [r,g,b]=rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const luminance=.2126*r+.7152*g+.0722*b;
 return luminance<.18?'#f5f5f5':'#141414';
}
