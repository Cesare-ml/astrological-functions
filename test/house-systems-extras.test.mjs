import test from 'node:test';
import assert from 'node:assert/strict';
import { locateLongitudeInHouses } from '../src/index.mjs';
import {
  calculateEqualMidheavenHouseCusps,
  calculateWholeAriesHouseCusps,
  calculateSripatiHouseCusps,
} from '../src/house-systems-extras.mjs';

const common = {
  datetimeUtc: '2026-11-17T12:00:00Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: {type: 'TROPICAL'},
};
const equalMc = { ...common, birthTimeKnown: true, midheavenLongitudeDeg: 285 };
const source = {
  engineVersion: 'SYNTHETIC', kernelSetId: 'NO_REAL_KERNEL', timeModel: 'MOCK',
  frame: 'ECLIPTIC_OF_DATE', zodiac: 'TROPICAL', observerType: 'TOPOCENTRIC',
  observer: {latitudeDeg: 44, longitudeDegEast: 11},
};
const porphyryInput = {
  datetimeUtc: common.datetimeUtc, ascendantDeg: 10, midheavenDeg: 285, source,
};
const code = expected => error => error?.name === 'AstrologyError' && error.code === expected;

test('equal MC anchors 10th cusp on MC, and house 1 at MC plus 90 degrees', () => {
  const result = calculateEqualMidheavenHouseCusps(equalMc);
  assert.equal(result.houseSystem, 'EQUAL_MIDHEAVEN');
  assert.equal(result.midheavenLongitudeDeg, 285);
  assert.deepEqual(result.cuspsDeg, [15,45,75,105,135,165,195,225,255,285,315,345]);
  assert.equal(result.cuspsDeg[9], result.midheavenLongitudeDeg);
  assert.equal(locateLongitudeInHouses(14.999, result.cuspsDeg).house, 12);
  assert.equal(locateLongitudeInHouses(15, result.cuspsDeg).house, 1);
});

test('equal MC is not ascendant-equal, even if ASC and MC are both provided elsewhere', () => {
  const result = calculateEqualMidheavenHouseCusps({ ...equalMc, midheavenLongitudeDeg: 10 });
  assert.equal(result.cuspsDeg[0], 100);
  assert.equal(result.cuspsDeg[9], 10);
  assert.equal(Object.hasOwn(result, 'ascendantLongitudeDeg'), false);
});

test('equal MC requires known birth time and honest supplied frame', () => {
  assert.throws(() => calculateEqualMidheavenHouseCusps({ ...equalMc, birthTimeKnown: false }), code('BIRTH_TIME_UNKNOWN'));
  assert.throws(() => calculateEqualMidheavenHouseCusps({ ...equalMc, birthTimeKnown: undefined }), code('INVALID_HOUSE_INPUT'));
  assert.throws(() => calculateEqualMidheavenHouseCusps({ ...equalMc, frame: 'J2000' }), code('INVALID_FRAME'));
  assert.throws(() => calculateEqualMidheavenHouseCusps({ ...equalMc, midheavenLongitudeDeg: Infinity }), code('INVALID_ANGLE'));
});

test('whole Aries starts at 0 Aries even with no ASC or known birth time', () => {
  const result = calculateWholeAriesHouseCusps(common);
  assert.equal(result.houseSystem, 'WHOLE_ARIES');
  assert.deepEqual(result.cuspsDeg, Array.from({length: 12}, (_, i) => i * 30));
  assert.equal(locateLongitudeInHouses(359.999, result.cuspsDeg).house, 12);
  assert.equal(locateLongitudeInHouses(0, result.cuspsDeg).house, 1);
  assert.equal(locateLongitudeInHouses(30, result.cuspsDeg).house, 2);
});

test('whole Aries uses explicitly declared sidereal zodiac without inventing an ayanamsa', () => {
  const result = calculateWholeAriesHouseCusps({
    ...common, longitudeBasis: {type: 'SIDEREAL', ayanamsaId: 'LAHIRI_TEST'},
  });
  assert.deepEqual(result.longitudeBasis, {type: 'SIDEREAL', ayanamsaId: 'LAHIRI_TEST'});
  assert.equal(result.cuspsDeg[0], 0);
  assert.equal(Object.hasOwn(result, 'ayanamsaOffsetDeg'), false);
});

test('whole Aries rejects malformed UTC, unknown basis and unrecognized keys', () => {
  assert.throws(() => calculateWholeAriesHouseCusps({ ...common, datetimeUtc: '2026-02-30T12:00:00Z' }), code('INVALID_UTC'));
  assert.throws(() => calculateWholeAriesHouseCusps({ ...common, longitudeBasis: {type: 'SIDEREAL'} }), code('INVALID_ZODIAC'));
  assert.throws(() => calculateWholeAriesHouseCusps({ ...common, birthTimeKnown: false }), code('INVALID_HOUSE_INPUT'));
});

test('Sripati bisects preceding and current Porphyry cusps around the zodiac', () => {
  const result = calculateSripatiHouseCusps(porphyryInput);
  assert.equal(result.houseSystem, 'SRIPATI');
  assert.deepEqual(result.porphyryCuspsDeg, [
    10, 10+95/3, 10+2*95/3, 105, 105+85/3, 105+2*85/3,
    190, 190+95/3, 190+2*95/3, 285, 285+85/3, 285+2*85/3,
  ]);
  for (let i = 0; i < 12; i++) {
    const prev = result.porphyryCuspsDeg[(i+11)%12];
    const current = result.porphyryCuspsDeg[i];
    const expected = (prev + ((current-prev+360)%360)/2)%360;
    assert.ok(Math.abs(result.cuspsDeg[i]-expected)<1e-10);
    assert.equal(locateLongitudeInHouses(result.cuspsDeg[i], result.cuspsDeg).house, i+1);
  }
  assert.notEqual(result.cuspsDeg[0], result.angles.ascendantDeg);
});

test('Sripati produces distinct 15-degree shifted cusps in 90-degree quadrants', () => {
  const result = calculateSripatiHouseCusps({ ...porphyryInput, ascendantDeg: 100, midheavenDeg: 10 });
  assert.deepEqual(result.cuspsDeg, [85,115,145,175,205,235,265,295,325,355,25,55]);
});

test('Sripati inherits strict Porphyry input provenance and polar rejection', () => {
  assert.throws(() => calculateSripatiHouseCusps({...porphyryInput, source: {...source, frame: 'J2000'}}), code('INCOMPATIBLE_ANGLE_SOURCE'));
  assert.throws(() => calculateSripatiHouseCusps({...porphyryInput, source: {...source, observer: {latitudeDeg: 90, longitudeDegEast: 11}}}), code('INCOMPATIBLE_ANGLE_SOURCE'));
  assert.throws(() => calculateSripatiHouseCusps({...porphyryInput, midheavenDeg: 190}), code('DEGENERATE_QUADRANTS'));
});

test('results are detached, frozen and carry no interpretation or false accuracy status', () => {
  for (const result of [calculateEqualMidheavenHouseCusps(equalMc), calculateWholeAriesHouseCusps(common), calculateSripatiHouseCusps(porphyryInput)]) {
    assert.equal(result.contractVersion, '0.1.0-experimental');
    assert.equal(result.interpretation, 'FACTS_ONLY');
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.cuspsDeg), true);
    assert.equal(result.cuspsDeg.length, 12);
    assert.equal(Object.hasOwn(result, 'ephemerisValidated'), false);
  }
  const shared = {...equalMc, longitudeBasis: {type:'SIDEREAL',ayanamsaId:'ORIGINAL'}};
  const result = calculateEqualMidheavenHouseCusps(shared);
  shared.longitudeBasis.ayanamsaId = 'CHANGED';
  assert.equal(result.longitudeBasis.ayanamsaId, 'ORIGINAL');
  assert.equal(Object.isFrozen(result.longitudeBasis), true);
  assert.throws(() => {result.cuspsDeg[0]=123;}, TypeError);
});

test('outer input validation never silently accepts a different house method', () => {
  assert.throws(() => calculateEqualMidheavenHouseCusps({...equalMc, method:'PORPHYRY'}), code('INVALID_HOUSE_INPUT'));
  assert.throws(() => calculateWholeAriesHouseCusps(null), code('INVALID_HOUSE_INPUT'));
  assert.throws(() => calculateSripatiHouseCusps({...porphyryInput, method:'VEHLOW'}), code('INVALID_HOUSE_INPUT'));
});
