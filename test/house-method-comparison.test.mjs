import test from 'node:test';
import assert from 'node:assert/strict';
import { compareWholeSignAndEqualAscendant as compare } from '../src/house-method-comparison.mjs';
const instant = '2026-11-12T21:15:03Z';
const basis = { type: 'TROPICAL' };
const status = 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
const base = { contractVersion: '0.1.0-experimental', datetimeUtc: instant,
  frame: 'ECLIPTIC_OF_DATE', longitudeBasis: basis, ascendantLongitudeDeg: 345,
  provenanceStatus: status };
const make = (ascending = 345) => ({
  birthTimeKnown: true,
  wholeSign: { ...base, contract: 'WholeSignHouseCusps', houseSystem: 'WHOLE_SIGN',
    birthTimeKnown: true, ascendantLongitudeDeg: ascending,
    cuspsDeg: Array.from({length:12}, (_,i) => ((Math.floor((((ascending%360)+360)%360)/30)*30+i*30)%360)) },
  equalAscendant: { ...base, contract: 'EqualHouseCusps', houseSystem: 'EQUAL_ASCENDANT',
    ascendantLongitudeDeg: ascending,
    cuspsDeg: Array.from({length:12}, (_,i) => ((ascending+i*30)%360+360)%360) },
  points: [ { id:'MOON', longitudeDeg:340 }, {id:'SUN', longitudeDeg:355}, {id:'MARS',longitudeDeg:10} ],
});
const code = expected => err => err?.name === 'AstrologyError' && err.code === expected;

test('compares placements across wrap and records changed IDs in input order', () => {
  const r = compare(make());
  assert.deepEqual(r.placements.map(p => [p.id,p.wholeSign.house,p.equalAscendant.house,p.houseChanged]), [
    ['MOON',1,12,true], ['SUN',1,1,false], ['MARS',2,1,true] ]);
  assert.deepEqual(r.changedPointIds,['MOON','MARS']);
  assert.equal(r.contract,'HouseMethodComparison');
  assert.equal(r.provenanceStatus,status);
});
test('ascendant on sign cusp produces identical Whole and Equal cusps', () => {
  const r = compare(make(0));
  assert.deepEqual(r.changedPointIds,[]);
  assert.deepEqual(r.placements.map(p=>p.wholeSign.house),r.placements.map(p=>p.equalAscendant.house));
});
test('negative and multi-turn longitudes, exact boundary ownership', () => {
  const a=make(-15);
  a.points=[{id:'BOUNDARY',longitudeDeg:0}, {id:'ALIAS',longitudeDeg:360}];
  const r=compare(a);
  assert.equal(r.placements[0].wholeSign.house,2);
  assert.equal(r.placements[0].equalAscendant.house,1);
  assert.equal(r.placements[1].longitudeDeg,0);
});
test('retains a detached, fully frozen comparison result', () => {
  const input=make(); const r=compare(input);
  input.wholeSign.cuspsDeg[0]=0; input.points[0].id='CHANGED';
  assert.equal(r.placements[0].id,'MOON');
  assert.equal(r.placements[0].wholeSign.startDeg,330);
  for(const x of [r,r.longitudeBasis,r.comparedHouseSystems,r.placements,r.placements[0],r.placements[0].wholeSign,r.changedPointIds])
    assert.ok(Object.isFrozen(x));
});
test('rejects unknown birth time', () => {
  for (const birthTimeKnown of [false, null,undefined,'true'])
    assert.throws(()=>compare({...make(),birthTimeKnown}), code('BIRTH_TIME_REQUIRED'));
  const a=make(); a.wholeSign.birthTimeKnown=false;
  assert.throws(()=>compare(a),code('BIRTH_TIME_REQUIRED'));
});
test('rejects mismatched instants, ascendants and zodiac bases', () => {
  const a=make(); a.equalAscendant.datetimeUtc='2026-11-13T21:15:03Z';
  assert.throws(()=>compare(a),code('INCOMPATIBLE_HOUSE_CONTEXT'));
  const b=make(); b.equalAscendant=make(344).equalAscendant;
  assert.throws(()=>compare(b),code('INCOMPATIBLE_HOUSE_CONTEXT'));
  const c=make(); c.equalAscendant.longitudeBasis={type:'SIDEREAL',ayanamsaId:'TEST_V1'};
  assert.throws(()=>compare(c),code('INCOMPATIBLE_HOUSE_CONTEXT'));
});
test('supports matching explicitly named sidereal contexts', () => {
  const a=make(); a.wholeSign.longitudeBasis={type:'SIDEREAL',ayanamsaId:'TEST_V1'};
  a.equalAscendant.longitudeBasis={type:'SIDEREAL',ayanamsaId:'TEST_V1'};
  assert.equal(compare(a).longitudeBasis.ayanamsaId,'TEST_V1');
});
test('rejects malformed dates, calendar rollover and incompatible frame', () => {
  for(const datetimeUtc of ['2026-02-30T00:00:00Z','2026-11-12T21:15:03+01:00','2026-11-12T21:15Z']) {
    const a=make();a.wholeSign.datetimeUtc=datetimeUtc;
    assert.throws(()=>compare(a),code('INVALID_UTC'));
  }
  const a=make();a.equalAscendant.frame='J2000';
  assert.throws(()=>compare(a),code('INVALID_FRAME'));
});
test('rejects false contract tags and unverified input categories', () => {
  const a=make();a.wholeSign.houseSystem='VEHLOW';
  assert.throws(()=>compare(a),code('INVALID_HOUSE_SNAPSHOT'));
  const b=make();b.equalAscendant.provenanceStatus='VERIFIED';
  assert.throws(()=>compare(b),code('INVALID_HOUSE_SNAPSHOT'));
  const c=make();c.equalAscendant.contract='WholeSignHouseCusps';
  assert.throws(()=>compare(c),code('INVALID_HOUSE_SNAPSHOT'));
});
test('rejects wrong cusp geometry even if the intervals are valid', () => {
  const a=make();a.equalAscendant.cuspsDeg=a.wholeSign.cuspsDeg;
  assert.throws(()=>compare(a),code('INVALID_CUSPS'));
  const b=make();b.wholeSign.cuspsDeg[3]=NaN;
  assert.throws(()=>compare(b),code('INVALID_CUSPS'));
  const c=make();delete c.wholeSign.cuspsDeg[2];
  assert.throws(()=>compare(c),code('INVALID_CUSPS'));
});
test('rejects invalid, sparse, duplicated and nonfinite points', () => {
  for(const points of [[], [{id:'X',longitudeDeg:1},{id:'X',longitudeDeg:2}],
      [{id:'X',longitudeDeg:NaN}],[{id:' X ',longitudeDeg:4}]])
    assert.throws(()=>compare({...make(),points}),code('INVALID_POINTS'));
  const sparse=Array(2);sparse[1]={id:'X',longitudeDeg:2};
  assert.throws(()=>compare({...make(),points:sparse}),code('INVALID_POINTS'));
});
test('rejects unexpected comparison keys and malformed structures', () => {
  assert.throws(()=>compare(null),code('INVALID_ARGUMENT'));
  assert.throws(()=>compare({...make(),method:'AUTO'}),code('INVALID_ARGUMENT'));
  assert.throws(()=>compare({...make(),equalAscendant:undefined}),code('INVALID_HOUSE_SNAPSHOT'));
});
