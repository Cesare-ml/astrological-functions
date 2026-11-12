import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEqualHouseCusps } from '../src/equal-house-cusps.mjs';
import { locateLongitudeInHouses } from '../src/index.mjs';

const base = Object.freeze({
  ascendantLongitudeDeg: 345,
  datetimeUtc: '2026-11-12T21:15:03Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
});
const build = (patch = {}) => calculateEqualHouseCusps({ ...base, ...patch });
const errorCode = code => error => error?.name === 'AstrologyError' && error.code === code;

test('creates twelve equal cusps from an ascendant across 0°', () => {
  const result = build();
  assert.deepEqual(result.cuspsDeg, [345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315]);
  assert.equal(result.houseSystem, 'EQUAL_ASCENDANT');
  assert.equal(result.contract, 'EqualHouseCusps');
  assert.equal(result.provenanceStatus, 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED');
});

test('integrates with the existing forward-ordered house locator', () => {
  const { cuspsDeg } = build();
  assert.equal(locateLongitudeInHouses(345, cuspsDeg).house, 1);
  assert.equal(locateLongitudeInHouses(14.999, cuspsDeg).house, 1);
  assert.equal(locateLongitudeInHouses(15, cuspsDeg).house, 2);
  assert.equal(locateLongitudeInHouses(344.999, cuspsDeg).house, 12);
  assert.equal(locateLongitudeInHouses(315, cuspsDeg).house, 12);
});

test('normalizes exact 360°, negative and multi-turn ascendants', () => {
  assert.deepEqual(build({ ascendantLongitudeDeg: 360 }).cuspsDeg, build({ ascendantLongitudeDeg: 0 }).cuspsDeg);
  assert.deepEqual(build({ ascendantLongitudeDeg: -15 }).cuspsDeg, build().cuspsDeg);
  assert.deepEqual(build({ ascendantLongitudeDeg: 705 }).cuspsDeg, build().cuspsDeg);
  assert.equal(build({ ascendantLongitudeDeg: 0 }).cuspsDeg[0], 0);
});

test('does not rotate to sign boundaries (equal ascendant houses, not whole sign)', () => {
  const result = build({ ascendantLongitudeDeg: 14.75 });
  assert.equal(result.cuspsDeg[0], 14.75);
  assert.equal(result.cuspsDeg[1], 44.75);
  assert.equal(result.cuspsDeg[11], 344.75);
});

test('retains caller-asserted sidereal identifier without calculating ayanamsa', () => {
  const result = build({ longitudeBasis: { type: 'SIDEREAL', ayanamsaId: 'LAHIRI_V1' } });
  assert.deepEqual(result.longitudeBasis, { type: 'SIDEREAL', ayanamsaId: 'LAHIRI_V1' });
  assert.equal(result.cuspsDeg[0], 345);
});

test('result and nested values are immutable and detached from input', () => {
  const basis = { type: 'SIDEREAL', ayanamsaId: 'TEST_V1' };
  const result = build({ longitudeBasis: basis });
  basis.ayanamsaId = 'CHANGED';
  assert.equal(result.longitudeBasis.ayanamsaId, 'TEST_V1');
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.longitudeBasis));
  assert.ok(Object.isFrozen(result.cuspsDeg));
  assert.throws(() => { result.cuspsDeg[0] = 123; }, TypeError);
});

test('rejects absent, nonfinite and nonnumeric ascendant', () => {
  for (const value of [undefined, null, NaN, Infinity, -Infinity, '15']) {
    assert.throws(() => build({ ascendantLongitudeDeg: value }), errorCode('INVALID_ANGLE'));
  }
});

test('rejects absent and incompatible frame metadata', () => {
  for (const frame of [undefined, 'J2000', 'MEAN_ECLIPTIC_OF_DATE', '']) {
    assert.throws(() => build({ frame }), errorCode('INVALID_FRAME'));
  }
});

test('requires explicit unambiguous zodiac and sidereal ayanamsa', () => {
  for (const longitudeBasis of [undefined, null, {}, { type: 'UNKNOWN' },
    { type: 'SIDEREAL' }, { type: 'SIDEREAL', ayanamsaId: '  ' },
    { type: 'TROPICAL', ayanamsaId: 'ANY' }]) {
    assert.throws(() => build({ longitudeBasis }), errorCode('INVALID_ZODIAC'));
  }
});

test('rejects impossible local dates, offsets, missing seconds and excess precision', () => {
  for (const datetimeUtc of [undefined, '2026-02-30T00:00:00Z',
    '2026-11-12T22:15:03+01:00', '2026-11-12T21:15Z',
    '2026-11-12T21:15:03.1234Z', '2026-11-12T25:00:00Z',
    '2026-11-12T21:15:60Z']) {
    assert.throws(() => build({ datetimeUtc }), errorCode('INVALID_UTC'));
  }
});

test('accepts precise valid UTC milliseconds including leap days', () => {
  assert.equal(build({ datetimeUtc: '2024-02-29T00:00:00.001Z' }).datetimeUtc,
    '2024-02-29T00:00:00.001Z');
  assert.equal(build({ datetimeUtc: '2024-02-29T00:00:00.1Z' }).datetimeUtc,
    '2024-02-29T00:00:00.1Z');
  assert.equal(build({ datetimeUtc: '2024-02-29T00:00:00.000Z' }).datetimeUtc,
    '2024-02-29T00:00:00.000Z');
});

test('rejects unknown fields rather than silently ignoring method overrides', () => {
  assert.throws(() => build({ houseSystem: 'WHOLE_SIGN' }), errorCode('INVALID_EQUAL_HOUSE_INPUT'));
  assert.throws(() => build({ longitudeBasis: { type: 'TROPICAL', unknown: true } }), errorCode('INVALID_EQUAL_HOUSE_INPUT'));
  assert.throws(() => calculateEqualHouseCusps(null), errorCode('INVALID_EQUAL_HOUSE_INPUT'));
});
