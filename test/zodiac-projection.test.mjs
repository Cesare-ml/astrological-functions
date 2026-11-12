import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError } from '../src/index.mjs';
import { projectZodiacLongitude } from '../src/zodiac-projection.mjs';

const datetimeUtc = '2026-11-12T20:30:00Z';
const base = Object.freeze({
  longitudeDeg: 5,
  datetimeUtc,
  center: 'EARTH',
  frame: 'ECLIPTIC_OF_DATE',
  corrections: 'APPARENT',
});
const ayanamsa = Object.freeze({
  id: 'SYNTHETIC_TEST_ONLY',
  version: 'test-v1',
  datetimeUtc,
  frame: 'ECLIPTIC_OF_DATE',
  offsetDeg: 24,
});
const tropical = (data = {}) => projectZodiacLongitude({ ...base, zodiac: 'TROPICAL', ...data });
const sidereal = (data = {}) => projectZodiacLongitude({ ...base, zodiac: 'SIDEREAL', ayanamsa, ...data });
const fails = (fn, code) => assert.throws(fn, e => e instanceof AstrologyError && e.code === code);

test('tropical preserves longitude, wraps 360 and assigns exact sign boundaries', () => {
  assert.equal(tropical({ longitudeDeg: 360 }).zodiacLongitudeDeg, 0);
  assert.equal(tropical({ longitudeDeg: 30 }).zodiacSignIndex, 1);
  assert.equal(tropical({ longitudeDeg: -0.5 }).zodiacLongitudeDeg, 359.5);
  assert.equal(tropical({ longitudeDeg: -0.5 }).zodiacSignIndex, 11);
  assert.equal(tropical({ longitudeDeg: 29.99999 }).zodiacSignIndex, 0);
  assert.equal(tropical().ayanamsa, null);
});

test('sidereal subtracts dated offset and wraps into preceding sign', () => {
  const fact = sidereal();
  assert.equal(fact.tropicalLongitudeDeg, 5);
  assert.equal(fact.zodiacLongitudeDeg, 341);
  assert.equal(fact.zodiacSignIndex, 11);
  assert.equal(fact.ayanamsa.id, 'SYNTHETIC_TEST_ONLY');
});

test('exact sidereal sign boundary is deterministic', () => {
  const fact = sidereal({ longitudeDeg: 54, ayanamsa: { ...ayanamsa, offsetDeg: 24 } });
  assert.equal(fact.zodiacLongitudeDeg, 30);
  assert.equal(fact.zodiacSignIndex, 1);
});

test('zero offset is explicitly allowed and not a hidden tropical fallback', () => {
  const fact = sidereal({ ayanamsa: { ...ayanamsa, offsetDeg: 0 } });
  assert.equal(fact.zodiac, 'SIDEREAL');
  assert.equal(fact.zodiacLongitudeDeg, 5);
});

test('invalid longitude fails closed', () => {
  for (const longitudeDeg of [undefined, null, NaN, Infinity, -Infinity, '5'])
    fails(() => tropical({ longitudeDeg }), 'INVALID_ZODIAC_LONGITUDE');
});

test('requires actual canonical UTC instant, including leap-day validation', () => {
  for (const value of [undefined, '', '2026-11-31T20:30:00Z', '2026-02-29T00:00:00Z',
    '2026-11-12T20:30:00+00:00', '2026-11-12T20:30Z', '2026-11-12T24:00:00Z',
    '2026-11-12T20:30:00.1234Z']) fails(() => tropical({ datetimeUtc: value }), 'INVALID_UTC');
  assert.equal(tropical({ datetimeUtc: '2024-02-29T12:00:00.125Z' }).datetimeUtc,
    '2024-02-29T12:00:00.125Z');
});

test('requires explicit apparent Earth-centered ecliptic-of-date provenance', () => {
  for (const change of [
    { center: 'SUN' }, { frame: 'ECLIPTIC_J2000' }, { corrections: 'GEOMETRIC' },
    { center: undefined }, { frame: undefined }, { corrections: undefined },
  ]) fails(() => tropical(change), 'INCOMPATIBLE_EPHEMERIS');
});

test('rejects missing or unknown zodiac mode and unexpected tropical offset', () => {
  fails(() => projectZodiacLongitude(base), 'INVALID_ZODIAC_TYPE');
  fails(() => tropical({ zodiac: 'SYNODIC' }), 'INVALID_ZODIAC_TYPE');
  fails(() => tropical({ ayanamsa }), 'UNEXPECTED_AYANAMSA');
  fails(() => tropical({ ayanamsa: undefined }), 'UNEXPECTED_AYANAMSA');
});

test('sidereal requires named and versioned ayanamsa with dated matching frame', () => {
  for (const candidate of [undefined, null, [], {}, { ...ayanamsa, id: '' },
    { ...ayanamsa, version: ' ' }, { ...ayanamsa, id: ' label ' }]) {
    fails(() => sidereal({ ayanamsa: candidate }), 'INVALID_AYANAMSA');
  }
  fails(() => sidereal({ ayanamsa: { ...ayanamsa, datetimeUtc: '2026-11-12T20:30:01Z' } }), 'INCOMPATIBLE_AYANAMSA');
  fails(() => sidereal({ ayanamsa: { ...ayanamsa, frame: 'ECLIPTIC_J2000' } }), 'INCOMPATIBLE_AYANAMSA');
});

test('sidereal rejects invalid offsets rather than silently normalizing them', () => {
  for (const offsetDeg of [undefined, null, NaN, Infinity, -Infinity, -0.01, 360, 400, '24']) {
    fails(() => sidereal({ ayanamsa: { ...ayanamsa, offsetDeg } }), 'INVALID_AYANAMSA');
  }
});

test('returns frozen detached facts, no synodic phase or interpretation prose', () => {
  const mutable = { ...ayanamsa };
  const fact = sidereal({ ayanamsa: mutable });
  mutable.offsetDeg = 42;
  assert.equal(fact.ayanamsa.offsetDeg, 24);
  assert.ok(Object.isFrozen(fact));
  assert.ok(Object.isFrozen(fact.reference));
  assert.ok(Object.isFrozen(fact.ayanamsa));
  assert.equal(fact.interpretation, 'FACTS_ONLY');
  assert.equal(fact.validation, 'CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED');
  assert.equal(Object.hasOwn(fact, 'synodicMotion'), false);
  assert.throws(() => { fact.zodiac = 'TROPICAL'; }, TypeError);
});

test('malformed input produces typed error', () => {
  for (const v of [null, undefined, '', [], 1, true]) {
    fails(() => projectZodiacLongitude(v), 'INVALID_ZODIAC_INPUT');
  }
});
