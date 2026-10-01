import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {avatarExpressions, avatarShapes} from '../shared/identity';
import {activityFor, expressionFor, eyeColor, shapeFor} from '../renderer/avatar-behavior';
import {BotEngine} from '../renderer/avatar-engine/engine';
import {liveliness} from '../renderer/avatar-engine/face';
import {STATES} from '../renderer/avatar-engine/states';
import {createEngine} from '../desktop/engine';
import type {RuntimeService} from '../shared/types';

test('every reference expression and silhouette produces finite, replayable frames through all 15 motions',()=>{
 assert.equal(avatarExpressions.length,16);assert.equal(avatarShapes.length,8);assert.equal(STATES.length,15);
 const faces=new Set<string>(),bodies=new Set<string>();
 for(const face of avatarExpressions){const engine=new BotEngine(100,'idle',shapeFor('orbit'),expressionFor(face.id));faces.add(JSON.stringify(engine.sample(1.2).eyes));}
 for(const shape of avatarShapes){const engine=new BotEngine(100,'idle',shapeFor(shape.id),expressionFor('neutral'));bodies.add(engine.sample(1.2).bodyPath);}
 assert.equal(faces.size,16,'Every chosen expression is visually distinct');assert.equal(bodies.size,8,'Every silhouette is visually distinct');
 for(const shape of avatarShapes)for(const face of avatarExpressions)for(const state of STATES){
  const engine=new BotEngine(100,state.id,shapeFor(shape.id),expressionFor(face.id));
  for(const at of [0,.5,1.2,3.4]){const frame=engine.sample(at),encoded=JSON.stringify(frame);assert(!/NaN|Infinity|null/.test(encoded.replace(/"(?:notif|notch)":null/g,'')),`${shape.id}/${face.id}/${state.id} at ${at} is finite`);assert.deepEqual(engine.sample(at),frame,'Frames are replayable');}
 }
});
test('runtime statuses map to activity, and ink avatars keep visible eyes',()=>{
 assert.deepEqual(activityFor,{idle:'idle',thinking:'thinking',working:'orbit',waiting:'notify',error:'alert',done:'burst'});
 assert.equal(eyeColor('#0a0a0c'),'#f5f5f5');assert.equal(eyeColor('#f1efe9'),'#141414');assert.equal(eyeColor('#edae6a'),'#141414');
 assert.equal(liveliness(1.2).lid,1);assert(liveliness(1.481).lid<.01,'Eyes close during the blink');assert.equal(liveliness(1.6).lid,1,'Eyes reopen');
 assert(liveliness(1801.481).lid<.01,'Blinking continues during long desktop sessions');
});
test('expressions save, survive restart, reject invalid edits atomically, and reset without changing identity or memory',async t=>{
 const dataDir=await mkdtemp(path.join(os.tmpdir(),'ibot-avatar-'));
 const options={dataDir,runtime:{} as RuntimeService,emit:()=>{},scheduler:false,encrypt:(s:string)=>s,decrypt:(s:string)=>s};
 const engine=createEngine(options);t.after(()=>engine.shutdown());
 await engine.invoke('bot.update',{id:'chief',expression:'curious',memory:'Remember the plan.'});
 await assert.rejects(engine.invoke('bot.update',{id:'chief',expression:'invented',color:'#abcdef'}),/expression/);
 const before=engine.getState().bots[0];assert.equal(before.expression,'curious');assert.equal(before.color,'#edae6a');
 await engine.shutdown();const restored=createEngine(options);t.after(()=>restored.shutdown());assert.equal(restored.getState().bots[0].expression,'curious');
 await restored.invoke('bot.update',{id:'chief',resetAppearance:true});const after=restored.getState().bots[0];assert.equal(after.expression,'neutral');assert.equal(after.name,before.name);assert.equal(after.memory,before.memory);
});
