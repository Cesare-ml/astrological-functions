import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateVehlowHouseCusps } from '../src/vehlow-houses.mjs';
import { AstrologyError, locateLongitudeInHouses } from '../src/index.mjs';

const source = Object.freeze({
  engineVersion: 'SYNTHETIC_ENGINE', kernelSetId: 'SYNTHETIC_KERNEL', timeModel: 'SYNTHETIC_UTC',
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
  zodiac: 'TROPICAL', observerType: 'TOPOCENTRIC',
  observer: Object.freeze({ latitudeDeg: 44, longitudeDegEast: 11 }),
});
const base = Object.freeze({
  profile: 'VEHLOW_ASC_CENTERED_V1', birthTimeKnown: true,
  datetimeUtc: '2026-11-12T22:30:00Z', ascendantDeg: 10, source,
});
const calculate = patch => calculateVehlowHouseCusps({ ...base, ...patch });
const rejects = (patch, code) => assert.throws(() => calculate(patch),
  error => error instanceof AstrologyError && error.code === code);

// Equal-sized intervals are distinct from Equal Ascendant, which starts house 1 at ASC.
test('cusp 1 precedes ascendant by 15 degrees and every interval is 30 degrees', () => {
  const result = calculate({});
  assert.deepEqual(result.cuspsDeg, [355,25,55,85,115,145,175,205,235,265,295,325]);
  assert.equal(result.ascendantDeg, 10);
  assert.equal(result.cusp1Deg, 355);
  for (let i = 0; i < 12; i++) {
    assert.equal((result.cuspsDeg[(i+1)%12] - result.cuspsDeg[i] + 360)%360, 30);
  }
});

test('ASC=0 is in middle of house 1 through zodiac wrap', () => {
  const result = calculate({ ascendantDeg: 0 });
  assert.equal(result.cusp1Deg, 345);
  assert.equal(locateLongitudeInHouses(0, result.cuspsDeg).house, 1);
  assert.equal(locateLongitudeInHouses(359.999, result.cuspsDeg).house, 1);
  assert.equal(locateLongitudeInHouses(15, result.cuspsDeg).house, 2);
});

test('ASC=360 canonicalizes to ASC=0', () => {
  assert.deepEqual(calculate({ ascendantDeg: 360 }).cuspsDeg, calculate({ ascendantDeg: 0 }).cuspsDeg);
});

test('ASC=15 puts house one cusp exactly at 0', () => {
  const result = calculate({ascendantDeg: 15});
  assert.equal(result.cuspsDeg[0], 0);
  assert.equal(locateLongitudeInHouses(0, result.cuspsDeg).house, 1);
  assert.equal(locateLongitudeInHouses(29.999, result.cuspsDeg).house, 1);
  assert.equal(locateLongitudeInHouses(30, result.cuspsDeg).house, 2);
});

test('each exact cusp belongs to the house it starts', () => {
  const result = calculate({});
  result.cuspsDeg.forEach((cusp, i) =>
    assert.equal(locateLongitudeInHouses(cusp, result.cuspsDeg).house, i + 1));
});

test('previous house occupies the point just before first cusp', () => {
  const result = calculate({});
  assert.equal(locateLongitudeInHouses(354.999, result.cuspsDeg).house, 12);
  assert.equal(locateLongitudeInHouses(355, result.cuspsDeg).house, 1);
});

test('birth time must be explicitly known; never infer rising sign', () => {
  for (const birthTimeKnown of [false, null, undefined, 'true', 1]) {
    rejects({ birthTimeKnown }, 'BIRTH_TIME_REQUIRED');
  }
});

test('method profile must be explicit, no silent legacy egizia fallback', () => {
  for (const profile of [undefined, 'egizia', 'LEGACY_V1', 'EQUAL_ASC', 'VEHLOW']) {
    rejects({ profile }, 'INVALID_HOUSE_PROFILE');
  }
});

test('reject nonfinite or out-of-range ascendant', () => {
  for (const ascendantDeg of [undefined, null, NaN, Infinity, -Infinity, -0.01, 360.01, '10']) {
    rejects({ ascendantDeg }, 'INVALID_ASCENDANT');
  }
});

test('real UTC ISO calendar date required, no timezone implicit', () => {
  for (const datetimeUtc of [undefined, '2026-02-29T22:30:00Z', '2026-11-12T24:00:00Z',
    '2026-11-12T22:30Z', '2026-11-12T22:30:00+00:00', '2026-11-12T22:30:00.1234Z']) {
    rejects({ datetimeUtc }, 'INVALID_UTC');
  }
  assert.equal(calculate({ datetimeUtc: '2024-02-29T12:00:00.2Z' }).datetimeUtc,
    '2024-02-29T12:00:00.200Z');
});

test('reject missing or unversioned astronomical source', () => {
  for (const change of [{engineVersion: ''}, {kernelSetId: null}, {timeModel: ' '},
    {frame: 'J2000'}, {zodiac: 'SIDEREAL'}, {center: 'SUN'},
    {corrections: 'GEOMETRIC'}, {observerType: 'GEOCENTRIC'}]) {
    rejects({ source: { ...source, ...change } }, 'INCOMPATIBLE_ANGLE_SOURCE');
  }
  rejects({ source: undefined }, 'INCOMPATIBLE_ANGLE_SOURCE');
});

test('reject invalid observer coordinates and geographic poles', () => {
  for (const observer of [{latitudeDeg:90,longitudeDegEast:11},
    {latitudeDeg:-90,longitudeDegEast:11}, {latitudeDeg:44,longitudeDegEast:180.01},
    {latitudeDeg:NaN,longitudeDegEast:11}]) {
    rejects({ source: {...source, observer } }, 'INCOMPATIBLE_ANGLE_SOURCE');
  }
  assert.equal(calculate({ source: {...source, observer:{latitudeDeg:89.99,longitudeDegEast:11}} }).cuspsDeg.length, 12);
});

test('immutable detached source and cusp snapshots', () => {
  const inputSource = { ...source, observer: {latitudeDeg:44,longitudeDegEast:11}};
  const result = calculate({source:inputSource});
  inputSource.observer.latitudeDeg = 30;
  assert.equal(result.source.observer.latitudeDeg,44);
  for (const item of [result, result.cuspsDeg, result.source, result.source.observer]) {
    assert.ok(Object.isFrozen(item));
  }
  assert.throws(() => { result.cuspsDeg[0] = 1; }, TypeError);
});

test('contract explicitly disclaims legacy and scientific validation', () => {
  const result=calculate({});
  assert.equal(result.houseSystem, 'VEHLOW');
  assert.equal(result.profile, 'VEHLOW_ASC_CENTERED_V1');
  assert.equal(result.contract, 'VehlowHouseCusps');
  assert.equal(result.contractVersion, '0.1.0-experimental');
  assert.equal(result.legacyCompatibility, 'NOT_ESTABLISHED');
  assert.equal(result.interpretation, 'FACTS_ONLY');
  assert.equal(result.validation, 'CALLER_ASSERTED_ASCENDANT_NOT_INDEPENDENTLY_VERIFIED');
});

test('reject malformed external input', () => {
  for (const request of [null, undefined, 0, false, [], 'invalid']) {
    assert.throws(() => calculateVehlowHouseCusps(request),
      error => error instanceof AstrologyError && error.code === 'INVALID_INPUT');
  }
});
