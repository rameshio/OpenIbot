import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateMemory} from '../scripts/eval-memory.mjs';
test('synthetic memory regression gate covers updates, time, abstention, workflow and isolation',async()=>{
 const results=await evaluateMemory();assert.equal(results.passed,results.total,results.results.filter(result=>!result.pass).map(result=>result.name).join(', '));assert.equal(results.total,10);
});
