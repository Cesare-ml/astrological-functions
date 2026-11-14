import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTransitFacts } from '../src/transit-facts.mjs';
import { calculateTransitFacts as viaSubpath } from 'astrological-functions/transits';

const ephemeris = Object.freeze({center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT',
  engineVersion:'rust-mock-v0',kernelSetId:'fixture-de441',timeModel:'TT-from-UTC-fixture'});
function fixture() {
  return {
    birthTimeKnown:true,
    natal:{datetimeUtc:'2000-01-01T12:00:00Z',zodiac:{type:'TROPICAL'},ephemeris:{...ephemeris},
      points:[{name:'Sun',longitudeDeg:1},{name:'Moon',longitudeDeg:181}]},
    sky:{datetimeUtc:'2026-11-12T19:00:00Z',zodiac:{type:'TROPICAL'},ephemeris:{...ephemeris},
      points:[{name:'Mars',longitudeDeg:359,longitudeSpeedDegPerDay:-0.3}]},
    aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:2},{id:'opposition',angleDeg:180,maxOrbDeg:2}]
  };
}
const invalid = (change, code) => {
  const input=fixture(); change(input);
  assert.throws(()=>calculateTransitFacts(input), e=>e.code===code);
};

test('transits are SKY_TO_NATAL, including wrap/orb boundary and no inferred angles',()=>{
  const r=calculateTransitFacts(fixture());
  assert.equal(r.contractVersion,'0.1.0-experimental');
  assert.equal(r.direction,'SKY_TO_NATAL');
  assert.equal(r.aspects.length,2);
  assert.equal(r.aspects[0].source.name,'Mars');
  assert.equal(r.aspects[0].target.name,'Sun');
  assert.equal(r.aspects[0].absoluteOrbDeg,2);
  assert.equal(r.aspects[1].aspectId,'opposition');
  assert.equal(r.aspects[1].target.name,'Moon');
  assert.equal(r.houseMode,'UNAVAILABLE');
  assert.equal(r.angles,null);
  assert.equal(r.sky.points[0].longitudeSpeedDegPerDay,-0.3);
  assert.equal(r.interpretation,'FACTS_ONLY');
});
test('public subpath import resolves to same runtime export',()=>assert.equal(viaSubpath,calculateTransitFacts));
test('caller data is snapshot-frozen and does not mutate',()=>{
  const input=fixture(); const r=calculateTransitFacts(input);
  input.sky.points[0].name='Saturn'; input.sky.points[0].longitudeDeg=99;
  input.aspectDefinitions[0].maxOrbDeg=90; input.natal.ephemeris.engineVersion='modified';
  assert.equal(r.sky.points[0].name,'Mars');
  assert.equal(r.sky.points[0].longitudeDeg,359);
  assert.equal(r.aspectDefinitions[0].maxOrbDeg,2);
  assert.equal(r.natal.ephemeris.engineVersion,'rust-mock-v0');
  assert.ok(Object.isFrozen(r.aspects[0]));
  assert.ok(Object.isFrozen(r.sky.points[0]));
});
test('empty configured rule list yields zero facts, no default aspects',()=>{
  const a=fixture(); a.aspectDefinitions=[];
  assert.equal(calculateTransitFacts(a).aspects.length,0);
});
test('fractional seconds and leap day work; impossible dates and timezone offsets fail',()=>{
  const a=fixture(); a.sky.datetimeUtc='2024-02-29T23:59:59.123Z';
  assert.equal(calculateTransitFacts(a).sky.datetimeUtc,a.sky.datetimeUtc);
  invalid(x=>x.sky.datetimeUtc='2026-02-30T12:00:00Z','INVALID_UTC');
  invalid(x=>x.natal.datetimeUtc='2000-01-01T12:00:00+01:00','INVALID_UTC');
  invalid(x=>x.sky.datetimeUtc='2026-11-12','INVALID_UTC');
});
test('explicit known birth instant required',()=>{
  invalid(x=>x.birthTimeKnown=false,'BIRTH_TIME_REQUIRED');
  invalid(x=>delete x.birthTimeKnown,'BIRTH_TIME_REQUIRED');
});
test('zodiac mismatch and unversioned sidereal requests fail',()=>{
  invalid(x=>x.sky.zodiac={type:'SIDEREAL',ayanamsaId:'LAHIRI-v1'},'INCOMPATIBLE_ZODIAC');
  invalid(x=>x.sky.zodiac={type:'SIDEREAL'},'INVALID_ZODIAC');
  invalid(x=>x.natal.zodiac={type:'TROPICAL',ayanamsaId:'x'},'INVALID_ZODIAC');
  const a=fixture(); a.natal.zodiac=a.sky.zodiac={type:'SIDEREAL',ayanamsaId:'LAHIRI-v1'};
  assert.equal(calculateTransitFacts(a).sky.zodiac.ayanamsaId,'LAHIRI-v1');
});
test('missing, geometric or mixed engine/kernel/time metadata fail closed',()=>{
  invalid(x=>x.sky.ephemeris.frame='J2000','INCOMPATIBLE_EPHEMERIS');
  invalid(x=>x.sky.ephemeris.corrections='GEOMETRIC','INCOMPATIBLE_EPHEMERIS');
  invalid(x=>delete x.sky.ephemeris.kernelSetId,'INCOMPATIBLE_EPHEMERIS');
  for(const field of ['engineVersion','kernelSetId','timeModel'])
    invalid(x=>x.sky.ephemeris[field]+='changed','INCONSISTENT_EPHEMERIS');
});
test('invalid point arrays, duplicate IDs, sparse arrays and non-body points fail',()=>{
  invalid(x=>x.sky.points=[], 'INVALID_POINTS');
  invalid(x=>x.natal.points.push({...x.natal.points[0]}),'INVALID_POINTS');
  invalid(x=>{x.sky.points=Array(2);x.sky.points[0]={name:'Sun',longitudeDeg:0};},'INVALID_POINTS');
  invalid(x=>x.sky.points[0].type='angle','INVALID_POINTS');
  invalid(x=>x.sky.points[0].longitudeDeg=Infinity,'INVALID_POINTS');
  invalid(x=>x.sky.points[0].longitudeSpeedDegPerDay='retrograde','INVALID_POINTS');
});
test('invalid aspect definitions fail without hidden defaults',()=>{
  invalid(x=>delete x.aspectDefinitions,'INVALID_ASPECT');
  invalid(x=>x.aspectDefinitions.push({...x.aspectDefinitions[0]}),'INVALID_ASPECT');
  invalid(x=>x.aspectDefinitions=Array(1),'INVALID_ASPECT');
  invalid(x=>x.aspectDefinitions[0].angleDeg=-1,'INVALID_ASPECT');
  invalid(x=>x.aspectDefinitions[0].maxOrbDeg=181,'INVALID_ASPECT');
});
test('circular normalization and strict direction are deterministic',()=>{
  const a=fixture(); a.sky.points[0].longitudeDeg=-1;
  const r=calculateTransitFacts(a);
  assert.equal(r.sky.points[0].longitudeDeg,359);
  assert.equal(r.aspects[0].direction,'SKY_TO_NATAL');
});
