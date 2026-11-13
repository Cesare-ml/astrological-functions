import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AstrologyError, normalize360, locateLongitudeInHouses,
} from '../src/index.mjs';

// The immediately preceding representable positive binary64 number.
// Before 0° zodiac the previous representable normalized angle is the
// largest binary64 number below 360°, not a tiny negative input.
function beforeCusp(cusp) {
  if (cusp === 0) return 359.99999999999994;
  const bits = new DataView(new ArrayBuffer(8));
  bits.setFloat64(0,cusp,false);
  bits.setBigUint64(0,bits.getBigUint64(0,false)-1n,false);
  return bits.getFloat64(0,false);
}
const cuspsFrom = first => Array.from({length:12},(_,i)=>
  normalize360(first + i * 30));

test('the longitude directly before the first cusp always belongs to house 12',()=>{
  for(const first of [0.1,1,30,90,345,359.99999999999994]){
    const cusps=cuspsFrom(first);
    const below=beforeCusp(cusps[0]);
    const found=locateLongitudeInHouses(below,cusps);
    assert.equal(found.house,12,`first cusp ${first}`);
    assert.equal(found.endDeg,cusps[0]);
    assert.ok(found.distanceFromCuspDeg>=0);
    assert.ok(Object.isFrozen(found));
    assert.equal(locateLongitudeInHouses(cusps[0],cusps).house,1);
  }
});

test('every exact cusp and its immediately preceding binary64 neighbor retain distinct ownership',()=>{
  for(const first of [0.1,1,30,90,345,359.99999999999994]){
    const cusps=cuspsFrom(first);
    for(let i=0;i<12;i++){
      const below=beforeCusp(cusps[i]);
      assert.equal(locateLongitudeInHouses(below,cusps).house,i===0?12:i,
        `before cusp ${i+1} in chart ${first}`);
      assert.equal(locateLongitudeInHouses(cusps[i],cusps).house,i+1,
        `exact cusp ${i+1} in chart ${first}`);
      assert.equal(locateLongitudeInHouses(
        normalize360(cusps[i]+1e-6),cusps).house,i+1,
        `after cusp ${i+1} in chart ${first}`);
    }
  }
});

test('near-Aries Pisces longitude belongs to the ending interval, never snaps forward',()=>{
  const cusps=cuspsFrom(0);
  const below360=359.99999999999994;
  assert.equal(normalize360(below360),below360);
  assert.equal(locateLongitudeInHouses(below360,cusps).house,12);
  assert.equal(locateLongitudeInHouses(360,cusps).house,1);
  assert.equal(locateLongitudeInHouses(0,cusps).house,1);
  assert.equal(locateLongitudeInHouses(-360,cusps).house,1);
});

test('sub-ULP cusp sides remain distinct without a fuzzy proximity tolerance',()=>{
  const cusps=cuspsFrom(30);
  const below=29.999999999999996;
  assert.equal(locateLongitudeInHouses(below,cusps).house,12);
  assert.equal(locateLongitudeInHouses(30,cusps).house,1);
  assert.equal(locateLongitudeInHouses(30.000000000000004,cusps).house,1);
  assert.equal(locateLongitudeInHouses(59.99999999999999,cusps).house,1);
  assert.equal(locateLongitudeInHouses(60,cusps).house,2);
});

test('wrapped and non-wrapped output distances stay nonnegative and snapshots immutable',()=>{
  for(const [longitude,cusps,expectedHouse,expectedDistance] of [
    [0,[345,15,45,75,105,135,165,195,225,255,285,315],1,15],
    [350,[345,15,45,75,105,135,165,195,225,255,285,315],1,5],
    [330,[345,15,45,75,105,135,165,195,225,255,285,315],12,15],
    [30,cuspsFrom(30),1,0],
  ]){
    const result=locateLongitudeInHouses(longitude,cusps);
    assert.equal(result.house,expectedHouse);
    assert.equal(result.distanceFromCuspDeg,expectedDistance);
    assert.ok(Object.isFrozen(result));
  }
});

test('invalid cusp geometry and nonfinite points remain rejected',()=>{
  for(const invalid of [[],Array(12).fill(0),Array(12),
    [...cuspsFrom(30).slice(0,11),NaN]]){
    assert.throws(()=>locateLongitudeInHouses(30,invalid),
      e=>e instanceof AstrologyError && e.code==='INVALID_CUSPS');
  }
  assert.throws(()=>locateLongitudeInHouses(NaN,cuspsFrom(30)),
    e=>e instanceof AstrologyError && e.code==='INVALID_ANGLE');
});
