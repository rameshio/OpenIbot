import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createEngine} from '../desktop/engine';
import type {BotConversation,RuntimeService} from '../shared/types';

async function fixture(t:any){
 const requests:any[]=[];
 const options={dataDir:await mkdtemp(path.join(os.tmpdir(),'ibot-onboarding-')),runtime:{} as RuntimeService,scheduler:false,emit:()=>{},encrypt:(v:string)=>v,decrypt:(v:string)=>v,modelClient:async(request:any)=>{requests.push(request);return {text:'I can help with your task.',calls:[],inputTokens:0,outputTokens:0};}};
 const engine=createEngine(options);t.after(()=>engine.shutdown());return {engine,options,requests};
}

test('blank bot opens with a saved question without a provider, generation, or computer',async t=>{
 const f=await fixture(t);const created=await f.engine.invoke('bot.createBlank') as BotConversation;
 assert.equal(created.bot.name,'New bot');assert.equal(created.bot.role,'Personal assistant');assert.deepEqual(created.chat.botIds,[created.bot.id]);
 const state=f.engine.getState();assert.equal(state.bots.length,2);assert.equal(state.chats.length,1);assert.equal(state.messages.length,1);
 assert.equal(state.messages[0].botId,created.bot.id);assert.equal(state.messages[0].role,'assistant');assert.match(state.messages[0].content,/What would you like me to help you with\?/);
 assert.equal(state.chats[0].status,'idle');assert.equal(state.usage.length,0);assert.equal(f.requests.length,0);
 await f.engine.shutdown();const restored=createEngine(f.options);t.after(()=>restored.shutdown());
 assert.deepEqual(restored.getState().messages,state.messages);assert.equal(restored.getState().bots.find(bot=>bot.id===created.bot.id)?.name,'New bot');
});

test('blank bots get distinct names and a failed capacity check leaves no partial chat',async t=>{
 const f=await fixture(t);const first=await f.engine.invoke('bot.createBlank') as BotConversation;const second=await f.engine.invoke('bot.createBlank') as BotConversation;
 assert.equal(first.bot.name,'New bot');assert.equal(second.bot.name,'New bot 2');assert.notEqual(first.chat.id,second.chat.id);
 await f.engine.invoke('settings.update',{maxBots:3});const before=f.engine.getState();
 await assert.rejects(f.engine.invoke('bot.createBlank'),/bot limit/);assert.deepEqual(f.engine.getState(),before);
 await assert.rejects(f.engine.invoke('bot.createBlank',{}, {actor:'agent'} as any),/classified tool dispatcher/);
});

test('the first answer runs as the new bot with the welcome question in its context',async t=>{
 const f=await fixture(t);const created=await f.engine.invoke('bot.createBlank') as BotConversation;
 await f.engine.invoke('provider.save',{provider:'compatible',baseUrl:'http://localhost:1234/v1',model:'fixture'});
 await f.engine.invoke('chat.send',{chatId:created.chat.id,content:'Help me organize my job search.'});await f.engine.waitForIdle();
 assert.equal(f.requests.length,1);assert.match(f.requests[0].system,/You are New bot/);assert(f.requests[0].messages.some((message:any)=>message.role==='user'&&message.content.includes('Help me organize my job search.')));
 const state=f.engine.getState();assert.equal(state.chats[0].title,'Help me organize my job search.');assert.equal(state.messages.at(-1)?.botId,created.bot.id);assert.equal(state.bots.length,2);
});
