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

test('deterministic 2500-chart sweep retains predecessor/exact/successor ownership',()=>{
  // No runtime randomness: fixed LCG seed and explicit arithmetic order make
  // this a reproducible stress check over nonuniform 12-cusp systems.
  let seed=0x4f6bcd12;
  const random=()=>{
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  };
  const predecessor=longitude=>{
    if(longitude===0) return 359.99999999999994;
    const bits=new DataView(new ArrayBuffer(8));
    bits.setFloat64(0,longitude,false);
    bits.setBigUint64(0,bits.getBigUint64(0,false)-1n,false);
    return bits.getFloat64(0,false);
  };
  const successor=longitude=>{
    if(longitude===359.99999999999994) return 0;
    const bits=new DataView(new ArrayBuffer(8));
    bits.setFloat64(0,longitude,false);
    bits.setBigUint64(0,bits.getBigUint64(0,false)+1n,false);
    return bits.getFloat64(0,false);
  };
  let checks=0;
  for(let k=0;k<2500;k++){
    const weights=Array.from({length:12},()=>0.5+random()*90);
    const total=weights.reduce((sum,value)=>sum+value,0);
    const first=random()*360;
    const cusps=[first];
    let cursor=first;
    for(let i=1;i<12;i++){
      cursor+=weights[i-1]*360/total;
      cusps.push(normalize360(cursor));
    }
    for(let i=0;i<12;i++){
      const cusp=cusps[i],tests=[
        [predecessor(cusp),i===0?12:i,'predecessor'],
        [cusp,i+1,'exact'],
        [successor(cusp),i+1,'successor'],
      ];
      for(const [longitude,wanted,label] of tests){
        const result=locateLongitudeInHouses(longitude,cusps);
        assert.equal(result.house,wanted,
          `chart ${k}, cusp ${i+1}, ${label}`);
        assert.ok(result.distanceFromCuspDeg>=0);
        checks++;
      }
    }
  }
  assert.equal(checks,90000);
});
