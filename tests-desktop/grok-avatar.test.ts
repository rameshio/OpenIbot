import {test} from 'node:test';
import assert from 'node:assert/strict';
import {grokPoses, grokPlayOrder} from '../renderer/grok-poses';
import {grokActivity, grokReaction, grokRest} from '../renderer/grok-behavior';
import {avatarExpressions, avatarShapes} from '../shared/identity';
import {conversationCues, replyPose} from '../renderer/conversation-avatar';
import type {Bot, Message} from '../shared/types';

test('reference poses retain all shapes, eyes, decorations and the supplied play order',()=>{
 assert.equal(grokPoses.length,22);
 assert.equal(new Set(grokPoses.map(p=>p.id)).size,22);
 assert.equal(grokPoses.filter(p=>p.group==='shape').length,10);
 for(const id of grokPlayOrder)assert(grokPoses.some(p=>p.id===id));
 for(const pose of grokPoses){assert(pose.body.w>0&&pose.body.h>0);if(pose.eyes)assert(pose.L&&pose.R);}
 assert(grokPoses.find(p=>p.id==='working')?.orbit);
 assert(grokPoses.find(p=>p.id==='dizzy')?.spark);
 assert(grokPoses.find(p=>p.id==='triangle')?.smile);
 assert(grokPoses.find(p=>p.id==='alert')?.mark);
});
test('chat situations drive expressions without changing bot identity',()=>{
 const bot={id:'chief',status:'idle',expression:'neutral'} as Bot;
 const now=Date.now(),message:Message={id:'reply',chatId:'chat',botId:'chief',role:'assistant',content:'Done, the report is completed.',createdAt:new Date(now).toISOString()};
 assert.equal(conversationCues([bot],[],'I am writing',false,now).chief.pose,'widebody');
 assert.equal(conversationCues([bot],[],'',true,now).chief.pose,'up');
 assert.equal(conversationCues([bot],[{...message,role:'user'}],'',false,now).chief.pose,'squint');
 assert.equal(conversationCues([bot],[message],'',false,now).chief.pose,'happy');
 assert.equal(replyPose({...message,content:'Which format would you prefer?'}),'widebody');
 assert.equal(replyPose({...message,role:'error',content:'Connection failed'}),'sad');
 assert.equal(replyPose({...message,content:'Here is your file',attachments:[{id:'file'} as never]}),'triangle');
 assert.deepEqual(conversationCues([bot],[message],'',false,now+8001),{},'Old conversations never replay reactions');
 assert.deepEqual(conversationCues([{...bot,id:'other'}],[message],'',false,now),{},'Other bots do not react to this reply');
 assert.equal(bot.expression,'neutral');assert.equal(bot.status,'idle');
});
test('runtime activity is meaningful and every saved shape and expression remains distinct',()=>{
 assert.deepEqual(grokActivity,{idle:'glance',thinking:'up',working:'working',waiting:'alert',error:'bang',done:'happy'});
 const faces=avatarExpressions.map(face=>{const {L,R}=grokRest('orbit',face.id);return JSON.stringify({L,R});});
 assert.equal(new Set(faces).size,16);
 assert.equal(new Set(avatarShapes.map(shape=>JSON.stringify(grokRest(shape.id).body))).size,8);
 for(const shape of avatarShapes)for(const expression of avatarExpressions){const pose=grokRest(shape.id,expression.id);assert(pose.eyes&&pose.L&&pose.R);assert.equal(pose.id,expression.id);}
});
test('every activity and conversation reaction preserves each saved silhouette',()=>{
 for(const shape of avatarShapes){
  const {motion:ignored,...body}=grokRest(shape.id,'neutral').body;
  for(const pose of [...Object.values(grokActivity),'widebody','squint','triangle','sad','wink']){
   const reaction=grokReaction(shape.id,'neutral',pose),{motion,...actual}=reaction.body;
   assert.deepEqual(actual,body,`${shape.id}/${pose} keeps the identity geometry`);
   assert(reaction.eyes&&reaction.L&&reaction.R,'Activity keeps an expressive face');
   assert.equal(reaction.mark,undefined,'An alert never replaces the avatar with an exclamation stem');
  }
 }
});
