import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCrossAspects } from '../src/index.mjs';

const base = () => ({
  direction: 'SKY_TO_NATAL',
  sourcePoints: [{ name: 'Sun', longitudeDeg: 0 }],
  targetPoints: [{ name: 'Moon', longitudeDeg: 0 }],
  aspectDefinitions: [{ id: 'conjunction', angleDeg: 0, maxOrbDeg: 0 }],
});
const rejects = (input, code) => assert.throws(() => calculateCrossAspects(input), { code });

test('source longitude getter is read once for validation and matching', () => {
  let calls=0;
  const source = {name:'Sun', get longitudeDeg(){return ++calls===1?0:90}};
  const matches=calculateCrossAspects({...base(),sourcePoints:[source]});
  assert.equal(calls,1);assert.equal(matches.length,1);
  assert.equal(matches[0].source.longitudeDeg,0);
});
test('point name and type are both sampled once', () => {
  let names=0,types=0;
  const point={get name(){return ++names===1?'Sun':'Mars';},
    get type(){return ++types===1?'angle':42;},longitudeDeg:0};
  const matches=calculateCrossAspects({...base(),sourcePoints:[point]});
  assert.deepEqual([names,types],[1,1]);assert.equal(matches[0].source.name,'Sun');
  assert.equal(matches[0].source.type,'angle');assert.equal(Object.isFrozen(matches[0].source),true);
});
test('invalid first point longitude is never replaced by a later valid read',()=>{
  let calls=0;
  rejects({...base(),sourcePoints:[{name:'Sun',get longitudeDeg(){return ++calls===1?NaN:0}}]},'INVALID_POINT');
  assert.equal(calls,1);
});
test('target longitude getter is read once',()=>{
  let calls=0;
  const out=calculateCrossAspects({...base(),targetPoints:[{name:'Moon',get longitudeDeg(){return ++calls===1?0:180}}]});
  assert.equal(calls,1);assert.equal(out[0].target.longitudeDeg,0);
});
test('aspect identifier, angle and maximum orb are read once',()=>{
  let ids=0,angles=0,orbs=0;
  const definition={get id(){return ++ids===1?'conjunction':'square';},
    get angleDeg(){return ++angles===1?0:90;},
    get maxOrbDeg(){return ++orbs===1?0:-1;}};
  const out=calculateCrossAspects({...base(),aspectDefinitions:[definition]});
  assert.deepEqual([ids,angles,orbs],[1,1,1]);
  assert.equal(out[0].aspectId,'conjunction');assert.equal(out[0].configuredMaxOrbDeg,0);
});
test('duplicate first-read rule identifiers cannot change during validation',()=>{
  let calls=0;
  const first={get id(){return ++calls===1?'conjunction':'square';},angleDeg:0,maxOrbDeg:1};
  rejects({...base(),aspectDefinitions:[first,{id:'conjunction',angleDeg:90,maxOrbDeg:1}]},'INVALID_ASPECT');
  assert.equal(calls,1);
});
test('invalid first rule angle fails before a subsequent corrected read',()=>{
  let calls=0;
  rejects({...base(),aspectDefinitions:[{id:'conjunction',get angleDeg(){return ++calls===1?Infinity:0;},maxOrbDeg:0}]},'INVALID_ASPECT');
  assert.equal(calls,1);
});
for(const key of ['sourcePoints','targetPoints','aspectDefinitions']){
  test('forged iterator cannot replace invalid stored '+key,()=>{
    const opts=base();
    opts[key]=[key==='aspectDefinitions'
      ? {id:'bad',angleDeg:200,maxOrbDeg:0} : {name:'INVALID',longitudeDeg:NaN}];
    let calls=0;
    opts[key][Symbol.iterator]=function*(){calls++;yield key==='aspectDefinitions'
      ? {id:'conjunction',angleDeg:0,maxOrbDeg:0} : {name:'Fake',longitudeDeg:0};};
    rejects(opts,key==='aspectDefinitions'?'INVALID_ASPECT':'INVALID_POINT');
    assert.equal(calls,0);
  });
}
test('dense arrays work even when their iterator throws',()=>{
  const opts=base();
  for(const key of ['sourcePoints','targetPoints','aspectDefinitions'])
    opts[key][Symbol.iterator]=()=>{throw Error('iterator must not run');};
  const out=calculateCrossAspects(opts);
  assert.equal(out.length,1);assert.equal(out[0].source.name,'Sun');
});
test('inherited-only slots are rejected on all three input arrays',()=>{
  for(const key of ['sourcePoints','targetPoints','aspectDefinitions']){
    const opts=base(), entries=Array(1), proto=Object.create(Array.prototype);
    proto[0]=opts[key][0];Object.setPrototypeOf(entries,proto);opts[key]=entries;
    rejects(opts,key==='aspectDefinitions'?'INVALID_ASPECT':'INVALID_POINT');
  }
});
test('a caller getter can mutate its array without changing the emitted point',()=>{
  const opts=base(),entries=opts.sourcePoints;
  Object.defineProperty(entries,0,{configurable:true,enumerable:true,get(){
    Object.defineProperty(entries,0,{value:{name:'changed',longitudeDeg:90},
      writable:true,configurable:true,enumerable:true});
    return {name:'Sun',longitudeDeg:0};
  }});
  const out=calculateCrossAspects(opts);
  assert.equal(out.length,1);assert.equal(out[0].source.name,'Sun');
  assert.equal(entries[0].name,'changed');
});
