import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVerification} from '../desktop/verification';
test('completion requires structured evidence for every passing verification check',()=>{
 for(const value of ['PASS','{}','{"verdict":"pass","checks":[]}','{"verdict":"pass","checks":[{"name":"test","status":"fail","evidence":"failed"}]}'])assert.equal(parseVerification(value).verdict,'unknown');
 assert.equal(parseVerification(JSON.stringify({verdict:'pass',checks:[{name:'test',status:'pass',evidence:'Observed successful result'}]})).verdict,'pass');
});
