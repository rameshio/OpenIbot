import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ConnectorToolClasses} from '../renderer/ConnectorToolClasses';
import type {Connector} from '../shared/types';

test('classification view distinguishes suggestion, missing confirmation and explicit user controls',()=>{
 const connector:Connector={id:'c',name:'Fixture',url:'https://fixture.invalid',hasToken:false,enabled:true,botIds:[],tools:[{name:'inspect',description:'Inspect records',inputSchema:{type:'object'},suggestedClass:'read',definitionHash:'hash'}]};
 const html=renderToStaticMarkup(createElement(ConnectorToolClasses,{connector,invoke:async()=>undefined as any}));
 for(const text of ['inspect','Suggested class','read','Needs your confirmation','Confirm class','Select a class'])assert(html.includes(text),text);
 assert(html.includes('Refresh tools'));
 assert(!html.includes('Confirmed class: read'));
 const confirmed=renderToStaticMarkup(createElement(ConnectorToolClasses,{connector:{...connector,toolEffects:{inspect:'read'},toolEffectHashes:{inspect:'hash'}},invoke:async()=>undefined as any}));assert(confirmed.includes('Confirmed class: read'));
 const changed=renderToStaticMarkup(createElement(ConnectorToolClasses,{connector:{...connector,catalogEvents:[{id:'event',summary:'Connector catalog changed; confirmations revoked.',createdAt:'2026-10-01T12:00:00Z'}]},invoke:async()=>undefined as any}));assert(changed.includes('<summary>Activity</summary>'));assert(changed.includes('Connector catalog changed; confirmations revoked.'));
});
