import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLegacyTransitSnapshot } from '../src/transit-legacy-normalizer.mjs';
import { normalizeLegacyTransitSnapshot as viaSubpath } from 'astrological-functions/transits/legacy-normalize';
import { calculateTransitFacts } from '../src/transit-facts.mjs';

const provenance = {engineVersion:'rust-synthetic-1',kernelSetId:'mock-de441',timeModel:'tt-mock'};
const metadata = {...provenance,center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT'};
function chart(datetimeUtc='2000-01-01T12:00:00Z', entries=[['Sun',1],['Moon',181]]) {
  return {contract:'NatalChartResult',contractVersion:'0.1.0-experimental',datetimeUtc,
    zodiac:{type:'TROPICAL'},ephemerisProvenance:{...provenance},
    bodies:Object.fromEntries(entries.map(([name,longitudeDeg])=>[name,{name,longitudeDeg,
      longitudeSpeedDegPerDay:null,ephemerisMetadata:{...metadata}}]))};
}
function fixture() {return {chart:chart(),selectedBodyNames:['Sun','Moon']};}
function failure(edit,code) {const input=fixture();edit(input);
  assert.throws(()=>normalizeLegacyTransitSnapshot(input),e=>e.code===code);}
test('self-import path exports exactly the normalizer',()=>assert.equal(viaSubpath,normalizeLegacyTransitSnapshot));
test('normalizes ordered legacy body selection without computing astronomy',()=>{
  const res=normalizeLegacyTransitSnapshot(fixture());
  assert.equal(res.contract,'TransitSnapshotNormalizationResult');
  assert.equal(res.sourceContract,'NatalChartResult');
  assert.equal(res.status,'SOURCE_ASSERTED_NOT_INDEPENDENTLY_VERIFIED');
  assert.deepEqual(res.selectedBodyNames,['Sun','Moon']);
  assert.deepEqual(res.snapshot.points.map(x=>x.name),['Sun','Moon']);
  assert.equal(res.snapshot.ephemeris.center,'EARTH');
  assert.equal(res.snapshot.zodiac.type,'TROPICAL');
  assert.equal(res.warnings[0].code,'LEGACY_SOURCE_NOT_INDEPENDENTLY_VERIFIED');
});
test('unselected bodies do not change explicitly requested selection',()=>{
  const input=fixture();input.chart.bodies.Jupiter={name:'Jupiter',longitudeDeg:NaN};
  input.selectedBodyNames=['Moon','Sun'];
  const res=normalizeLegacyTransitSnapshot(input);
  assert.deepEqual(res.snapshot.points.map(x=>x.name),['Moon','Sun']);
});
test('source zodiac must be explicit; never guess from tropical-looking longitudes',()=>{
  failure(x=>delete x.chart.zodiac,'MISSING_ZODIAC');
  failure(x=>x.chart.zodiac={type:'SIDEREAL'},'INVALID_ZODIAC');
  failure(x=>x.chart.zodiac={type:'TROPICAL',ayanamsaId:'v1'},'INVALID_ZODIAC');
});
test('named sidereal ayanamsa is preserved without calculating ayanamsa',()=>{
  const input=fixture();input.chart.zodiac={type:'SIDEREAL',ayanamsaId:'LAHIRI-v1'};
  assert.deepEqual(normalizeLegacyTransitSnapshot(input).snapshot.zodiac,input.chart.zodiac);
});
test('all selected bodies must have matching full apparent-of-date metadata',()=>{
  failure(x=>x.chart.bodies.Moon.ephemerisMetadata.frame='J2000','INCOMPATIBLE_EPHEMERIS');
  failure(x=>x.chart.bodies.Sun.ephemerisMetadata.corrections='GEOMETRIC','INCOMPATIBLE_EPHEMERIS');
  failure(x=>x.chart.bodies.Sun.ephemerisMetadata.kernelSetId='other','INCOMPATIBLE_EPHEMERIS');
  failure(x=>delete x.chart.bodies.Moon.ephemerisMetadata,'INCOMPATIBLE_EPHEMERIS');
});
test('missing and incomplete chart provenance fails closed',()=>{
  failure(x=>delete x.chart.ephemerisProvenance,'MISSING_PROVENANCE');
  failure(x=>x.chart.ephemerisProvenance.timeModel='','MISSING_PROVENANCE');
});
test('missing, duplicate, sparse or malformed selections are rejected',()=>{
  failure(x=>x.selectedBodyNames=[],'INVALID_BODIES');
  failure(x=>x.selectedBodyNames=['Mars'],'INVALID_BODIES');
  failure(x=>x.selectedBodyNames=['Sun','Sun'],'INVALID_BODIES');
  failure(x=>x.selectedBodyNames=Array(2),'INVALID_BODIES');
  failure(x=>x.selectedBodyNames=[' Sun'],'INVALID_BODIES');
  failure(x=>x.selectedBodyNames=['__proto__'],'INVALID_BODIES');
});
test('invalid selected bodies cannot bypass compatibility checks',()=>{
  failure(x=>x.chart.bodies.Sun.name='Moon','INVALID_POINT');
  failure(x=>x.chart.bodies.Sun.longitudeDeg=Infinity,'INVALID_POINT');
  failure(x=>x.chart.bodies.Sun.longitudeSpeedDegPerDay='retrograde','INVALID_POINT');
});
test('invalid chart versions and malformed date are refused',()=>{
  failure(x=>x.chart.contract='Wrong','INVALID_CHART');
  failure(x=>x.chart.contractVersion='next','INVALID_CHART');
  failure(x=>x.chart.datetimeUtc='2026-02-30T12:00:00Z','INVALID_UTC');
  failure(x=>x.chart.datetimeUtc='2026-11-12T12:00:00+01:00','INVALID_UTC');
});
test('longitude wrapping and optional speed remain numeric, never motion labels',()=>{
  const input=fixture();input.chart.bodies.Sun.longitudeDeg=-1;
  input.chart.bodies.Sun.longitudeSpeedDegPerDay=-0.2;
  const res=normalizeLegacyTransitSnapshot(input);
  assert.equal(res.snapshot.points[0].longitudeDeg,359);
  assert.equal(res.snapshot.points[0].longitudeSpeedDegPerDay,-0.2);
});
test('output is deeply immutable and detached from mutable source',()=>{
  const input=fixture(),res=normalizeLegacyTransitSnapshot(input);
  input.chart.bodies.Sun.longitudeDeg=200;
  input.chart.ephemerisProvenance.engineVersion='altered';
  input.selectedBodyNames[0]='Jupiter';
  assert.equal(res.snapshot.points[0].longitudeDeg,1);
  assert.equal(res.snapshot.ephemeris.engineVersion,'rust-synthetic-1');
  assert.equal(res.selectedBodyNames[0],'Sun');
  for (const value of [res,res.snapshot,res.snapshot.zodiac,res.snapshot.points,
    res.snapshot.points[0],res.snapshot.ephemeris,res.warnings,res.warnings[0]])
    assert.ok(Object.isFrozen(value));
});
test('canonical engine reproduces common SKY_TO_NATAL aspect geometry after explicit normalization',()=>{
  const natal=normalizeLegacyTransitSnapshot(fixture());
  const sky=normalizeLegacyTransitSnapshot({chart:chart('2026-11-12T19:00:00Z',[['Mars',359]]),
    selectedBodyNames:['Mars']});
  const result=calculateTransitFacts({birthTimeKnown:true,natal:natal.snapshot,sky:sky.snapshot,
    aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:2},
      {id:'opposition',angleDeg:180,maxOrbDeg:2}]});
  assert.deepEqual(result.aspects.map(x=>[x.source.name,x.target.name,x.aspectId]),
    [['Mars','Sun','conjunction'],['Mars','Moon','opposition']]);
  assert.equal(result.direction,'SKY_TO_NATAL');
  assert.equal(result.angles,null);
  assert.equal(result.houseMode,'UNAVAILABLE');
});
test('canonical engine rejects mismatched zodiac and provider provenance, no silent conversion',()=>{
  const natal=normalizeLegacyTransitSnapshot(fixture());
  const other=chart('2026-11-12T19:00:00Z',[['Mars',359]]);
  other.zodiac={type:'SIDEREAL',ayanamsaId:'LAHIRI-v1'};
  let sky=normalizeLegacyTransitSnapshot({chart:other,selectedBodyNames:['Mars']});
  assert.throws(()=>calculateTransitFacts({birthTimeKnown:true,natal:natal.snapshot,sky:sky.snapshot,
    aspectDefinitions:[]}),e=>e.code==='INCOMPATIBLE_ZODIAC');
  other.zodiac={type:'TROPICAL'};
  other.ephemerisProvenance.kernelSetId='different';
  other.bodies.Mars.ephemerisMetadata.kernelSetId='different';
  sky=normalizeLegacyTransitSnapshot({chart:other,selectedBodyNames:['Mars']});
  assert.throws(()=>calculateTransitFacts({birthTimeKnown:true,natal:natal.snapshot,sky:sky.snapshot,
    aspectDefinitions:[]}),e=>e.code==='INCONSISTENT_EPHEMERIS');
});
