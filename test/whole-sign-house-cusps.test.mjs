import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWholeSignHouseCusps } from '../src/whole-sign-house-cusps.mjs';
import { locateLongitudeInHouses } from '../src/index.mjs';

const input = {
  ascendantLongitudeDeg: 345.5,
  birthTimeKnown: true,
  datetimeUtc: '2026-11-12T21:15:03Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
};
const make = (patch = {}) => calculateWholeSignHouseCusps({ ...input, ...patch });
const isCode = code => error => error?.name === 'AstrologyError' && error.code === code;

test('whole sign starts at the sign boundary rather than the ascendant degree', () => {
  const result = make();
  assert.equal(result.houseSystem, 'WHOLE_SIGN');
  assert.equal(result.ascendantLongitudeDeg, 345.5);
  assert.equal(result.ascendantSignIndex, 11);
  assert.deepEqual(result.cuspsDeg, [330, 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300]);
  assert.equal(result.provenanceStatus, 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED');
});

test('exact cusp ownership and Aries wrap integrate with house locator', () => {
  const { cuspsDeg } = make();
  assert.equal(locateLongitudeInHouses(329.999, cuspsDeg).house, 12);
  assert.equal(locateLongitudeInHouses(330, cuspsDeg).house, 1);
  assert.equal(locateLongitudeInHouses(359.999, cuspsDeg).house, 1);
  assert.equal(locateLongitudeInHouses(0, cuspsDeg).house, 2);
  assert.equal(locateLongitudeInHouses(30, cuspsDeg).house, 3);
  assert.equal(locateLongitudeInHouses(345.5, cuspsDeg).house, 1);
});

test('all twelve sign indices produce a full forward revolution', () => {
  for (let sign = 0; sign < 12; sign++) {
    const result = make({ ascendantLongitudeDeg: sign * 30 + 15 });
    assert.equal(result.ascendantSignIndex, sign);
    for (let i = 0; i < 12; i++) {
      assert.equal(result.cuspsDeg[i], ((sign + i) % 12) * 30);
      assert.equal(locateLongitudeInHouses(result.cuspsDeg[i], result.cuspsDeg).house, i + 1);
    }
  }
});

test('exact 0/30/360 and whole-turn aliases choose deterministic signs', () => {
  assert.equal(make({ ascendantLongitudeDeg: 0 }).ascendantSignIndex, 0);
  assert.equal(make({ ascendantLongitudeDeg: 29.999999 }).ascendantSignIndex, 0);
  assert.equal(make({ ascendantLongitudeDeg: 30 }).ascendantSignIndex, 1);
  assert.deepEqual(make({ ascendantLongitudeDeg: 390 }).cuspsDeg,
    make({ ascendantLongitudeDeg: 30 }).cuspsDeg);
  assert.deepEqual(make({ ascendantLongitudeDeg: -15 }).cuspsDeg, make().cuspsDeg);
  assert.deepEqual(make({ ascendantLongitudeDeg: 720 }).cuspsDeg,
    make({ ascendantLongitudeDeg: 0 }).cuspsDeg);
});

test('same already-converted sidereal zodiac works with explicit ayanamsa', () => {
  const result = make({
    ascendantLongitudeDeg: 12,
    longitudeBasis: { type: 'SIDEREAL', ayanamsaId: 'LAHIRI_TEST_V1' },
  });
  assert.deepEqual(result.longitudeBasis, { type: 'SIDEREAL', ayanamsaId: 'LAHIRI_TEST_V1' });
  assert.equal(result.ascendantSignIndex, 0);
  assert.equal(result.cuspsDeg[0], 0);
});

test('snapshot is detached from the caller and deeply immutable', () => {
  const basis = { type: 'SIDEREAL', ayanamsaId: 'ORIGINAL' };
  const result = make({ longitudeBasis: basis });
  basis.ayanamsaId = 'MUTATED';
  assert.equal(result.longitudeBasis.ayanamsaId, 'ORIGINAL');
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.longitudeBasis));
  assert.ok(Object.isFrozen(result.cuspsDeg));
  assert.throws(() => { result.cuspsDeg[0] = 17; }, TypeError);
});

test('unknown birth time rejects false precision', () => {
  assert.throws(() => make({ birthTimeKnown: false }), isCode('BIRTH_TIME_UNKNOWN'));
  for (const birthTimeKnown of [undefined, null, 1, 'true']) {
    assert.throws(() => make({ birthTimeKnown }), isCode('INVALID_WHOLE_SIGN_INPUT'));
  }
});

test('angle errors fail closed', () => {
  for (const ascendantLongitudeDeg of [undefined, null, NaN, Infinity, -Infinity, '30']) {
    assert.throws(() => make({ ascendantLongitudeDeg }), isCode('INVALID_ANGLE'));
  }
});

test('requires explicit compatible frame and zodiac basis', () => {
  for (const frame of [undefined, null, 'J2000', 'TRUE_ECLIPTIC_OF_DATE']) {
    assert.throws(() => make({ frame }), isCode('INVALID_FRAME'));
  }
  for (const longitudeBasis of [null, [], undefined, {}, { type: 'UNKNOWN' },
    { type: 'SIDEREAL' }, { type: 'SIDEREAL', ayanamsaId: ' ' },
    { type: 'SIDEREAL', ayanamsaId: ' LAHIRI' },
    { type: 'TROPICAL', ayanamsaId: 'TEST' }]) {
    assert.throws(() => make({ longitudeBasis }), isCode('INVALID_ZODIAC'));
  }
});

test('strict UTC rejects offsets, nonexistent dates, leap seconds and extra precision', () => {
  for (const datetimeUtc of [undefined, '2026-11-12T21:15:03+01:00',
    '2026-02-30T12:00:00Z', '2026-11-12T25:00:00Z',
    '2026-11-12T21:15:60Z', '2026-11-12T21:15:03.1234Z']) {
    assert.throws(() => make({ datetimeUtc }), isCode('INVALID_UTC'));
  }
  assert.equal(make({ datetimeUtc: '2024-02-29T23:59:59.12Z' }).datetimeUtc,
    '2024-02-29T23:59:59.12Z');
});

test('unknown keys and malformed records reject instead of silently using defaults', () => {
  for (const value of [undefined, null, [], 'chart', new Date(), { ...input, method: 'EQUAL' }]) {
    assert.throws(() => calculateWholeSignHouseCusps(value), isCode('INVALID_WHOLE_SIGN_INPUT'));
  }
  assert.throws(() => make({ longitudeBasis: { type: 'TROPICAL', extra: true } }),
    isCode('INVALID_WHOLE_SIGN_INPUT'));
});
