import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWholeSignHouseCusps } from '../src/whole-sign-house-cusps.mjs';
import { locateLongitudeInHouses } from '../src/index.mjs';
const base = {
  ascendantLongitudeDeg: 345, birthTimeKnown: true,
  datetimeUtc: '2026-11-12T21:15:03Z', frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
};
const build = (patch = {}) => calculateWholeSignHouseCusps({ ...base, ...patch });
const code = expected => error => error?.name === 'AstrologyError' && error.code === expected;

test('whole-sign cusp 1 is start of ascendant sign, not the ascendant', () => {
  const r = build();
  assert.deepEqual(r.cuspsDeg, [330,0,30,60,90,120,150,180,210,240,270,300]);
  assert.equal(r.ascendantLongitudeDeg, 345);
  assert.equal(r.ascendantSignIndex, 11);
  assert.equal(r.houseSystem, 'WHOLE_SIGN');
});
test('exact sign cusps belong to newly starting houses', () => {
  const cusps = build().cuspsDeg;
  assert.equal(locateLongitudeInHouses(330, cusps).house, 1);
  assert.equal(locateLongitudeInHouses(359.99999, cusps).house, 1);
  assert.equal(locateLongitudeInHouses(0, cusps).house, 2);
  assert.equal(locateLongitudeInHouses(30, cusps).house, 3);
  assert.equal(locateLongitudeInHouses(329.999, cusps).house, 12);
});
test('ascendant exactly at 0 and 360 yields the same first Aries cusp', () => {
  assert.deepEqual(build({ ascendantLongitudeDeg: 0 }).cuspsDeg, build({ ascendantLongitudeDeg: 360 }).cuspsDeg);
  assert.equal(build({ ascendantLongitudeDeg: 360 }).ascendantSignIndex, 0);
});
test('negative and multi-turn longitudes normalize before sign placement', () => {
  assert.deepEqual(build({ ascendantLongitudeDeg: -15 }).cuspsDeg, build().cuspsDeg);
  assert.deepEqual(build({ ascendantLongitudeDeg: 705 }).cuspsDeg, build().cuspsDeg);
});
test('cusps shift at a sign boundary but not inside one sign', () => {
  assert.deepEqual(build({ ascendantLongitudeDeg: 0.1 }).cuspsDeg, build({ ascendantLongitudeDeg: 29.9999 }).cuspsDeg);
  assert.equal(build({ ascendantLongitudeDeg: 30 }).cuspsDeg[0], 30);
  assert.equal(build({ ascendantLongitudeDeg: 29.9999 }).cuspsDeg[0], 0);
});
test('whole-sign differs from equal-ascendant and Vehlow methods', () => {
  assert.equal(build({ ascendantLongitudeDeg: 14.75 }).cuspsDeg[0], 0);
  assert.equal(build({ ascendantLongitudeDeg: 14.75 }).cuspsDeg[1], 30);
});
test('sidereal basis is explicit, copied, and never projected internally', () => {
  const basis = { type: 'SIDEREAL', ayanamsaId: 'TEST_V1' };
  const r = build({ longitudeBasis: basis });
  basis.ayanamsaId = 'MUTATED';
  assert.deepEqual(r.longitudeBasis, { type: 'SIDEREAL', ayanamsaId: 'TEST_V1' });
  assert.equal(r.cuspsDeg[0], 330);
});
test('result and nested results are frozen', () => {
  const r = build();
  for (const o of [r,r.longitudeBasis,r.cuspsDeg]) assert.ok(Object.isFrozen(o));
  assert.throws(() => { r.cuspsDeg[0] = 123; }, TypeError);
});
test('missing, false or nonboolean birth-time knowledge fails closed', () => {
  for (const birthTimeKnown of [false,undefined,null,'true',0])
    assert.throws(() => build({ birthTimeKnown }), code('BIRTH_TIME_REQUIRED'));
});
test('invalid longitude and frame metadata rejected', () => {
  for (const ascendantLongitudeDeg of [undefined,null,NaN,Infinity,'35'])
    assert.throws(() => build({ ascendantLongitudeDeg }), code('INVALID_ANGLE'));
  for (const frame of [undefined,'J2000','TRUE_ECLIPTIC_OF_DATE'])
    assert.throws(() => build({ frame }), code('INVALID_FRAME'));
});
test('invalid zodiac variants and undeclared ayanamsa rejected', () => {
  for (const longitudeBasis of [undefined,null,{}, {type:'SIDEREAL'},
    {type:'SIDEREAL',ayanamsaId:' '}, {type:'TROPICAL',ayanamsaId:'X'}, {type:'UNKNOWN'}])
    assert.throws(() => build({longitudeBasis}), code('INVALID_ZODIAC'));
});
test('invalid UTC inputs and nonexisting dates rejected', () => {
  for (const datetimeUtc of [undefined,'2026-02-30T00:00:00Z','2026-11-12T22:15:03+01:00',
    '2026-11-12T21:15Z','2026-11-12T21:15:03.1234Z','2026-11-12T21:15:60Z'])
    assert.throws(() => build({datetimeUtc}), code('INVALID_UTC'));
  assert.equal(build({datetimeUtc:'2024-02-29T00:00:00.001Z'}).datetimeUtc, '2024-02-29T00:00:00.001Z');
});
test('unknown fields and nonplain input objects rejected', () => {
  assert.throws(() => build({ houseSystem:'VEHLOW' }), code('INVALID_WHOLE_SIGN_INPUT'));
  assert.throws(() => build({ longitudeBasis: {type:'TROPICAL', unknown:true} }), code('INVALID_WHOLE_SIGN_INPUT'));
  assert.throws(() => calculateWholeSignHouseCusps(null), code('INVALID_WHOLE_SIGN_INPUT'));
});
