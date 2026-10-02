import test from 'node:test';
import assert from 'node:assert/strict';
import {routeMessage} from '../desktop/routing';
import {initialState} from '../desktop/store';
test('explicit bot and skill references override the default deterministically',()=>{
 const state=initialState();state.bots.push({...state.bots[0],id:'research',name:'Researcher'});state.skills[0].installed=true;
 const route=routeMessage('@Researcher /"Research with sources" Find evidence',state,'chief');assert.equal(route.botId,'research');assert.deepEqual(route.skillIds,['skill-research']);assert.equal(route.reason,'explicit-bot');
 assert.equal(routeMessage('Please research this',state,'chief').botId,'chief');assert.throws(()=>routeMessage('@missing Work',state,'chief'),/Unknown bot/);
 state.bots.push({...state.bots[0],id:'duplicate',name:'Researcher'});assert.throws(()=>routeMessage('@Researcher Work',state,'chief'),/Ambiguous/);
});
test('uninstalled or out-of-scope skills cannot be activated by a slash reference',()=>{
 const state=initialState();assert.throws(()=>routeMessage('/"Research with sources" Work',state,'chief'),/available/);state.skills[0].installed=true;state.skills[0].botIds=['other'];assert.throws(()=>routeMessage('/"Research with sources" Work',state,'chief'),/available/);
});
