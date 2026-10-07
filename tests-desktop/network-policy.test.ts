import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNetworkHosts} from '../shared/network-policy';
import {createEngine} from '../desktop/engine';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type {RuntimeService} from '../shared/types';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {NetworkPolicy} from '../renderer/NetworkPolicy';
test('network host grants are exact names, normalized, bounded and reject URLs, IPs and wildcards',()=>{
 assert.deepEqual(normalizeNetworkHosts(['Example.COM','example.com','api.example.com']),['example.com','api.example.com']);
 assert.deepEqual(normalizeNetworkHosts([]),[]);
 for(const value of ['*','*.example.com','https://example.com','example.com:443','user@example.com','127.0.0.1','localhost','example.com/path','example.com\nother.com','metadata.google.internal'])assert.throws(()=>normalizeNetworkHosts([value]),value);
 assert.throws(()=>normalizeNetworkHosts(['a'.repeat(256)+'.com']));assert.throws(()=>normalizeNetworkHosts('example.com'));assert.throws(()=>normalizeNetworkHosts(Array(101).fill('example.com')));
});
test('only user network edits persist exact hosts and revoke the existing policy version',async t=>{
 const writes:string[][]=[];const dataDir=await mkdtemp(path.join(os.tmpdir(),'ibot-network-policy-'));
 const options={dataDir,runtime:{setNetworkPolicy:async(_id:string,hosts:string[])=>{writes.push(hosts);}} as unknown as RuntimeService,scheduler:false,emit:()=>{},encrypt:(s:string)=>s,decrypt:(s:string)=>s};
 const engine=createEngine(options);t.after(()=>engine.shutdown());const version=engine.getState().settings.policyVersion;
 await engine.invoke('bot.update',{id:'chief',networkHosts:['Example.COM']});assert.deepEqual(writes,[['example.com']]);assert(engine.getState().settings.policyVersion>version);
 await assert.rejects(engine.invoke('bot.update',{id:'chief',networkHosts:['*']}));assert.deepEqual(engine.getState().bots[0].networkHosts,['example.com']);
 await assert.rejects(engine.invoke('bot.update',{id:'chief',networkHosts:['evil.com']},{actor:'agent'} as any));
 await engine.shutdown();const restored=createEngine(options);t.after(()=>restored.shutdown());assert.deepEqual(restored.getState().bots[0].networkHosts,['example.com']);
 const html=renderToStaticMarkup(createElement(NetworkPolicy,{bot:restored.getState().bots[0],invoke:async()=>undefined as any}));
 for(const text of ['Allowed hosts for Chief','example.com','No hosts are allowed by default','not inspected','Save allowed hosts for Chief'])assert(html.includes(text),text);
});
