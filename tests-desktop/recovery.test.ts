import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../desktop/store';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

test('corrupt primary restores a valid backup and preserves damaged bytes',async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'ibot-recovery-')),store=new Store(folder);
 store.data.state.bots[0].memory='Saved preference';store.save();store.save();
 await writeFile(store.path,'damaged fixture');const restored=new Store(folder);
 assert.equal(restored.data.state.bots[0].memory,'Saved preference');assert(restored.recovery);
 assert.equal(await readFile(restored.recovery!.quarantinePath,'utf8'),'damaged fixture');
 assert.equal(JSON.parse(await readFile(store.path,'utf8')).state.bots[0].memory,'Saved preference');
});
test('invalid primary and backup fail closed without exposing their content',async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'ibot-recovery-invalid-')),store=new Store(folder);
 await writeFile(store.path,'private-fixture');await writeFile(store.path+'.bak','private-backup');
 assert.throws(()=>new Store(folder),error=>error instanceof Error&&!error.message.includes('private-fixture')&&!error.message.includes('private-backup'));
 assert.equal(await readFile(store.path,'utf8'),'private-fixture');
});
test('activity view explains uncertain actions and requires checking the external result',async()=>{
 (globalThis as any).window={matchMedia:()=>({matches:false,addEventListener:()=>{}}),addEventListener:()=>{}};
 const {ActivityPanel}=await import('../renderer/ActivityPanel');
 const html=renderToStaticMarkup(createElement(ActivityPanel,{invoke:async()=>undefined as any,onClose:()=>{}}));
 assert(html.includes('Activity'));assert(html.includes('Check the external result'));assert(html.includes('never automatically replayed'));
});
