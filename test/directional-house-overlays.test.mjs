import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDirectionalHouseOverlays } from '../src/directional-house-overlays.mjs';

const provenance = Object.freeze({engineVersion:'synthetic',kernelSetId:'synthetic-v1',timeModel:'synthetic-UTC'});
const cuspListA = Object.freeze([0,30,60,90,120,150,180,210,240,270,300,330]);
const cuspListB = Object.freeze([345,15,45,75,105,135,165,195,225,255,285,315]);
const natal = (datetimeUtc, longitudeDeg, name) => Object.freeze({
  contract:'NatalChartResult', contractVersion:'0.1.0-experimental',
  datetimeUtc, latitudeDeg:44.8, longitudeDegEast:11.9,
  ephemerisProvenance:provenance,
  bodies:Object.freeze({[name]:Object.freeze({name,longitudeDeg})}),
});
const chartA = natal('2026-01-01T12:00:00Z', 15, 'Mars');
const chartB = natal('2026-02-01T12:00:00Z', 359, 'Sun');
const setFor = (chart, cusps) => ({
  houseSystem:'VEHLOW', calculationProfile:'CANONICAL_V1', cusps,
  metadata:{houseSystem:'VEHLOW',placementMethod:'CUSP_INTERVAL',
    datetimeUtc:chart.datetimeUtc, latitudeDeg:chart.latitudeDeg,
    longitudeDegEast:chart.longitudeDegEast,ephemerisProvenance:provenance},
});
const cuspSetA = setFor(chartA,cuspListA);
const cuspSetB = setFor(chartB,cuspListB);
const input = {chartA,chartB,birthTimeKnownA:true,birthTimeKnownB:true,cuspSetA,cuspSetB};

test('A_TO_B places source Mars exactly on B house 2 cusp', () => {
  const result=calculateDirectionalHouseOverlays({...input,direction:'A_TO_B'});
  assert.equal(result.sourceChart,'A');
  assert.equal(result.targetChart,'B');
  assert.equal(result.sourceDatetimeUtc,chartA.datetimeUtc);
  assert.equal(result.targetDatetimeUtc,chartB.datetimeUtc);
  assert.equal(result.placements.length,1);
  assert.equal(result.placements[0].bodyName,'Mars');
  assert.equal(result.placements[0].house,2);
  assert.equal(result.placements[0].distanceFromCuspDeg,0);
  assert.equal(result.targetCuspMetadata.datetimeUtc,chartB.datetimeUtc);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.placements));
  assert.ok(Object.isFrozen(result.placements[0]));
  assert.ok(Object.isFrozen(result.sourceEphemerisProvenance));
});

test('B_TO_A swaps source and target, uses A cusps and preserves direction', () => {
  const result=calculateDirectionalHouseOverlays({...input,direction:'B_TO_A'});
  assert.equal(result.sourceChart,'B');
  assert.equal(result.targetChart,'A');
  assert.equal(result.placements[0].bodyName,'Sun');
  assert.equal(result.placements[0].house,12);
  assert.equal(result.targetCuspMetadata.datetimeUtc,chartA.datetimeUtc);
  assert.deepEqual(cuspListA,[0,30,60,90,120,150,180,210,240,270,300,330]);
  assert.deepEqual(cuspListB,[345,15,45,75,105,135,165,195,225,255,285,315]);
});

test('unknown source or target birth time cannot claim precise natal overlays', () => {
  for (const change of [{birthTimeKnownA:false},{birthTimeKnownB:false},{birthTimeKnownA:undefined}]) {
    assert.throws(()=>calculateDirectionalHouseOverlays({...input,...change,direction:'A_TO_B'}),
      error=>error.code==='BIRTH_TIME_REQUIRED');
  }
});

test('incorrect target time, engine or unsupported historical placement fails closed', () => {
  assert.throws(()=>calculateDirectionalHouseOverlays({...input,direction:'A_TO_B',cuspSetB:{
    ...cuspSetB, metadata:{...cuspSetB.metadata,datetimeUtc:chartA.datetimeUtc}}}),
    error=>error.code==='INCOMPATIBLE_HOUSE_CONTEXT');
  assert.throws(()=>calculateDirectionalHouseOverlays({...input,direction:'A_TO_B',cuspSetB:{
    ...cuspSetB, metadata:{...cuspSetB.metadata,ephemerisProvenance:{...provenance,kernelSetId:'other'}}}}),
    error=>error.code==='INCOMPATIBLE_HOUSE_CONTEXT');
  assert.throws(()=>calculateDirectionalHouseOverlays({...input,direction:'A_TO_B',cuspSetB:{
    ...cuspSetB, metadata:{...cuspSetB.metadata,placementMethod:'LEGACY_HOUSES_POS'}}}),
    error=>error.code==='UNSUPPORTED_HOUSE_PLACEMENT');
});

test('invalid directions, chart provenance and source body longitudes are rejected', () => {
  assert.throws(()=>calculateDirectionalHouseOverlays({...input,direction:'SKY_TO_NATAL'}),
    error=>error.code==='INVALID_DIRECTION');
  assert.throws(()=>calculateDirectionalHouseOverlays({...input,direction:'A_TO_B',chartA:{
    ...chartA,ephemerisProvenance:{...provenance,timeModel:null}}}),
    error=>error.code==='INVALID_CHART_PROVENANCE');
  assert.throws(()=>calculateDirectionalHouseOverlays({...input,direction:'A_TO_B',chartA:{
    ...chartA,bodies:{Mars:{name:'Mars',longitudeDeg:Infinity}}}}),
    error=>error.code==='INVALID_POINT');
  assert.throws(()=>calculateDirectionalHouseOverlays({...input,direction:'A_TO_B',chartA:{
    ...chartA,datetimeUtc:'2026-02-30T12:00:00Z'}}),
    error=>error.code==='INVALID_CHART');
  assert.throws(()=>calculateDirectionalHouseOverlays(null),error=>error.code==='INVALID_ARGUMENT');
});

test('source/target kernels may differ when each provenance and target cusp match', () => {
  const alteredChartA={...chartA,ephemerisProvenance:{...provenance,kernelSetId:'independent-A'}};
  const result=calculateDirectionalHouseOverlays({...input,direction:'A_TO_B',chartA:alteredChartA});
  assert.equal(result.sourceEphemerisProvenance.kernelSetId,'independent-A');
  assert.equal(result.targetCuspMetadata.ephemerisProvenance.kernelSetId,'synthetic-v1');
});
