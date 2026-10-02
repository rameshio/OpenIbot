import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Bot} from '../shared/types';

test('main bot navigation has a star and direct rename, replacement and creation controls',async()=>{
 const previous=globalThis.window;globalThis.window={matchMedia:()=>({matches:false})} as unknown as Window & typeof globalThis;
 const {BotNavigation}=await import('../renderer/BotNavigation');globalThis.window=previous;
 const bot:Bot={id:'chief',name:'Coordinator',role:'Team coordinator',instructions:'',memory:'',avatar:'orbit',avatarImage:'data:image/png;base64,AA==',color:'#edae6a',status:'idle',createdAt:'2026-10-01T00:00:00Z'};
 const html=renderToStaticMarkup(createElement(BotNavigation,{bots:[bot,{...bot,id:'r',name:'Researcher'}],mainBotId:'chief',selectedId:'chief',onSelect:()=>{},onEdit:()=>{},onCreate:()=>{},onSetMain:async()=>{}}));
 for(const value of ['Main bot','Main bot: Coordinator','Rename Coordinator','Make Researcher main bot','Create a bot'])assert(html.includes(value),value);
 assert.equal((html.match(/aria-label="Main bot: /g)??[]).length,1);assert(!html.includes('Make Coordinator main bot'));
});
