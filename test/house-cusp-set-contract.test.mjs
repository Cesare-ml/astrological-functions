import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHouseCuspSet } from '../src/index.mjs';

const cusps = [345,15,45,75,105,135,165,195,225,255,285,315];
const input = {
  houseSystem:'VEHLOW', calculationProfile:'CANONICAL_V1', cusps,
  metadata:{houseSystem:'VEHLOW',placementMethod:'CUSP_INTERVAL'}
};
test('accepts externally supplied forward cusps with matching system',()=>{
  const result=validateHouseCuspSet(input);
  assert.deepEqual(result.cusps,cusps);
  assert.equal(Object.isFrozen(result.cusps),true);
  assert.equal(Object.isFrozen(result.metadata),true);
  cusps[0]=0;
  assert.equal(result.cusps[0],345);
  cusps[0]=345;
});
test('legacy alias resolves only with explicit profile',()=>{
  const result=validateHouseCuspSet({...input,houseSystem:'egizia',calculationProfile:'VIRGOSTARS_LEGACY_V1'});
  assert.equal(result.houseSystem,'VEHLOW');
  assert.throws(()=>validateHouseCuspSet({...input,houseSystem:'egizia'}),e=>e.code==='INVALID_HOUSE_SYSTEM');
});
test('rejects mismatched declared house method or system',()=>{
  assert.throws(()=>validateHouseCuspSet({...input,metadata:{houseSystem:'PLACIDUS',placementMethod:'CUSP_INTERVAL'}}),
    e=>e.code==='INCOMPATIBLE_HOUSE_SYSTEM');
  assert.throws(()=>validateHouseCuspSet({...input,metadata:{houseSystem:'VEHLOW',placementMethod:'LEGACY_HOUSES_POS'}}),
    e=>e.code==='UNSUPPORTED_HOUSE_PLACEMENT');
});
test('rejects malformed metadata and invalid cusp geometry',()=>{
  assert.throws(()=>validateHouseCuspSet({...input,metadata:null}),e=>e.code==='INVALID_HOUSE_METADATA');
  assert.throws(()=>validateHouseCuspSet({...input,cusps:[...cusps.slice(0,11),NaN]}),e=>e.code==='INVALID_CUSPS');
  assert.throws(()=>validateHouseCuspSet({...input,cusps:Array(12).fill(0)}),e=>e.code==='INVALID_CUSPS');
});
