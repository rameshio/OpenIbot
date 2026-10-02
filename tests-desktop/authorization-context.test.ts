import test from 'node:test';
import assert from 'node:assert/strict';
import {createEffectAuthorizer} from '../desktop/effects';
import {initialState} from '../desktop/store';
import type {Effect} from '../shared/types';
test('taint entering after authorization voids an earlier write lease at dispatch',async()=>{
 let tainted=false,asks=0;const settings=initialState().settings;settings.rules=[{id:'all',action:'*',policy:'allow'}];
 const authorizer=createEffectAuthorizer({settings:()=>settings,now:()=>Date.now(),untrustedContext:()=>tainted,request:async()=>{asks++;return {approved:true};}});
 const effect:Effect={id:'memory.write',class:'persist',transport:'memory',actor:'agent',actorId:'chief',chatId:'chat',taskId:'task',target:'bot:chief',args:{memory:'Preference'},dataScope:['bot:chief']};
 const lease=await authorizer.authorizeEffect(effect);tainted=true;assert.throws(()=>lease.execute(()=>assert.fail('Must not execute')),/Untrusted content/);
 const next=await authorizer.authorizeEffect(effect);next.execute(()=>{});assert.equal(asks,1);
});
