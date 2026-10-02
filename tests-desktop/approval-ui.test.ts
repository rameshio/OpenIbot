import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ApprovalCard} from '../renderer/ApprovalCard';
import type {Approval,Message,EffectClass} from '../shared/types';

const approval:Approval={id:'a',chatId:'chat',botId:'chief',action:'connector',details:'legacy transport',status:'pending',createdAt:'2026-10-01T12:00:00Z',effect:{id:'connector.call',transport:'connector',class:'read',actor:'agent',actorId:'chief',chatId:'chat',taskId:'task',target:'opaque',dataScope:[],argsHash:'hash'},presentation:{args:{query:'raw query',approvalPurpose:'Inspect records'},purpose:'Inspect records for your report.',purposeSource:'model',target:'Records / inspect (fixture.local)',alwaysEligible:true}};
test('card renders authoritative class, advisory purpose, target, raw arguments and scopes',()=>{
 const html=renderToStaticMarkup(createElement(ApprovalCard,{approval,botName:'Chief',resolve:async()=>{}}));
 for(const text of ['read','Model-generated','Inspect records for your report.','Records / inspect','raw query','Allow once','Allow for this chat','Always allow this tool'])assert(html.includes(text),text);
 assert(!html.includes('legacy transport'));
});
test('always allow is absent for every non-read class and spend is distinct',()=>{
 for(const effectClass of ['write','send','spend','delete','upload','persist','execute','admin'] as EffectClass[]){
  const html=renderToStaticMarkup(createElement(ApprovalCard,{approval:{...approval,effect:{...approval.effect!,class:effectClass}},botName:'Chief',resolve:async()=>{}}));
  assert(!html.includes('Always allow this tool'));if(effectClass==='spend'){assert(html.includes('approval-spend'));assert(html.includes('May incur charges'));}
 }
 const together=renderToStaticMarkup(createElement('div',null,...(['read','spend'] as EffectClass[]).map(effectClass=>createElement(ApprovalCard,{key:effectClass,approval:{...approval,effect:{...approval.effect!,class:effectClass}},botName:'Chief',resolve:async()=>{}}))));
 assert.equal((together.match(/<section /g)??[]).length,2,'Read and spend retain separate cards');assert.equal((together.match(/approval-spend/g)??[]).length,1);assert(together.includes('aria-label="read approval"'));assert(together.includes('aria-label="spend approval"'));
});
test('empty assistant tool-only messages render no article or bubble; attachments remain visible',async()=>{
 // Avatar's browser animation module reads matchMedia on import; effects never run during static rendering.
 const previous=globalThis.window;
 globalThis.window={matchMedia:()=>({matches:false})} as unknown as Window & typeof globalThis;
 const {MessageBody}=await import('../renderer/MessageBody');
 globalThis.window=previous;
 const message:Message={id:'m',chatId:'chat',role:'assistant',content:' \n\t',createdAt:approval.createdAt};
 assert.equal(renderToStaticMarkup(createElement(MessageBody,{message,bots:[],onFile:()=>{}})),'');
 for(const content of ['\u200b\u200d','<!-- tool call only -->'])assert.equal(renderToStaticMarkup(createElement(MessageBody,{message:{...message,content},bots:[],onFile:()=>{}})),'','Invisible text must not render a bubble');
 const html=renderToStaticMarkup(createElement(MessageBody,{message:{...message,attachments:[{id:'f',name:'report.txt',path:'/workspace/report.txt',size:1}]},bots:[],onFile:()=>{}}));
 assert(html.includes('report.txt'));assert(!html.includes('message-bubble'));
});
