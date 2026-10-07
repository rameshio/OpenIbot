import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../desktop/store';
import {botActivity,teamChats} from '../renderer/bot-activity';
import type {Message} from '../shared/types';
test('bot previews use the latest visible individual reply, never another bot or team chat',()=>{
 const s=initialState(),bot=s.bots[0];
 s.chats=[{id:'solo',title:'Solo',botIds:[bot.id],status:'idle',createdAt:'',updatedAt:''},{id:'team',title:'Team',botIds:[bot.id,'other'],status:'idle',createdAt:'',updatedAt:''}];
 const message=(id:string,content:string,createdAt:string,extra:Partial<Message>={}):Message=>({id,chatId:'solo',botId:bot.id,role:'assistant',content,createdAt,...extra});
 s.messages=[message('old','Older','2026-10-01'),message('new','**Finished**\n the brief','2026-10-02'),message('hidden','<!-- tool call -->\u200b','2026-10-03'),message('team','Group reply','2026-10-04',{chatId:'team'}),message('foreign','Wrong bot','2026-10-05',{botId:'other'}),message('user','Request','2026-10-06',{role:'user'})];
 assert.equal(botActivity(bot,s.chats,s.messages),'Finished the brief');
 assert.equal(botActivity({...bot,status:'waiting'},s.chats,s.messages),'Needs your attention');
 assert.equal(botActivity({...bot,status:'working'},s.chats,s.messages),'Working on it');
 assert.equal(botActivity(bot,[],s.messages),'Ready when you are');
});
test('attachment-only replies produce file previews and hidden tool calls do not replace them',()=>{
 const s=initialState(),bot=s.bots[0];s.chats=[{id:'solo',title:'Solo',botIds:[bot.id],status:'idle',createdAt:'',updatedAt:''}];
 s.messages=[{id:'file',chatId:'solo',botId:bot.id,role:'assistant',content:'',createdAt:'2026-10-01',attachments:[{id:'a',name:'brief.pdf',path:'/workspace/brief.pdf',size:100}]}];
 assert.equal(botActivity(bot,s.chats,s.messages),'Shared brief.pdf');
});
test('teams remain accessible, sorted and searchable without exposing individual history',()=>{
 const s=initialState();s.bots.push({...s.bots[0],id:'research',name:'Researcher'});
 s.chats=[{id:'solo',title:'Solo',botIds:['chief'],status:'idle',createdAt:'',updatedAt:'2026-10-03'},{id:'old',title:'Old team',botIds:['chief','research'],status:'idle',createdAt:'',updatedAt:'2026-10-01'},{id:'new',title:'Launch team',botIds:['chief','research'],status:'idle',createdAt:'',updatedAt:'2026-10-02'},{id:'removed',title:'Removed team',botIds:['chief','removed'],status:'idle',createdAt:'',updatedAt:'2026-10-04'}];
 assert.deepEqual(teamChats(s.chats,s.bots,'').map(c=>c.id),['new','old']);
 assert.deepEqual(teamChats(s.chats,s.bots,'launch').map(c=>c.id),['new']);
 assert.equal(teamChats(s.chats,s.bots,'Researcher').length,2);
});
