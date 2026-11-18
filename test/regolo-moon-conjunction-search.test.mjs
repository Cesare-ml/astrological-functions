import test from 'node:test';
import assert from 'node:assert/strict';
import {searchRegoloPrecedingConjunction} from '../src/regolo-moon-conjunction-search.mjs';
import {calculateRegoloLotsFromAstronomicalFacts} from
  '../src/regolo-lots-astronomy-bridge.mjs';

const datetimeUtc = '2026-11-18T12:00:00Z';
const birthJdUt = 2440587.5 + Date.parse(datetimeUtc) / 86400000;
const source = {engineId: 'VIRGOSTARS_EPHEMERIS', engineVersion: 'test-native',
  kernelSetId: 'de441-test', timeModelId: 'test-time'};
const canonical = value => ((value % 360) + 360) % 360;

function syntheticEngine(targetJd, rate=12.2) {
  const calls = [];
  const engine = {calcUt(jd, body, flags) {
    calls.push({jd, body, flags});
    const sun = canonical(359.6 + (jd - birthJdUt) * 0.9856);
    return {xx: [body === 0 ? sun : canonical(sun + rate * (jd - targetJd)),
      0, body === 0 ? 1 : 0.0026, 0, 0, 0],
    rflag: 1, timeSource: 'IERS_LEAP_SECONDS', notes: []};
  }};
  return {engine, calls};
}

const base = {datetimeUtc, birthJdUt, ut1MinusUtcAtBirthSeconds: 0,
  expectedEphemeris: source, expectedTimeSourcePolicy: 'IERS_LEAP_SECONDS',
  lookbackDays: 35, sampleStepHours: 6, rootToleranceSeconds: 0.5,
  maxIterations: 64, maxConjunctionResidualDeg: 0.001,
};
const search = (engine, extra={}) => searchRegoloPrecedingConjunction({...base, engine, ...extra});

function reject(engine, extra, code) {
  assert.throws(() => search(engine, extra),
    error => error?.name === 'AstrologyError' && error.code === code,
    `Expected ${code}`);
}

test('search uses two actual Node calcUt body IDs and returns latest conjunction in 35 days', () => {
  const {engine, calls} = syntheticEngine(birthJdUt - 1.25);
  const result = search(engine);
  assert.equal(result.status, 'CANDIDATE_UNVERIFIED_ASTRONOMY');
  assert.ok(Math.abs((result.candidate.jdUt - (birthJdUt - 1.25)) * 86400) < 0.5);
  assert.ok(result.candidate.signedElongationDeg < 0.001);
  assert.equal(result.candidateBrackets, 2); // prior cycle also in 35-day window
  assert.deepEqual(result.precedingNewMoon,
    {availability: 'UNAVAILABLE', reason: 'NOT_COMPUTED'});
  assert.ok(result.sampledPoints > 100);
  assert.ok(calls.length > result.sampledPoints * 2);
  assert.ok(calls.every((x, i) => x.flags === 0 && x.body === i % 2));
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.candidate));
});

test('0°/360° longitude wrap is not a new conjunction or missing root', () => {
  // Sun and Moon are both near 359.5° here: the scan must not confuse
  // their individual zodiac wrap with an elongation discontinuity.
  const {engine} = syntheticEngine(birthJdUt - 0.1);
  const result = search(engine);
  assert.equal(result.status, 'CANDIDATE_UNVERIFIED_ASTRONOMY');
  assert.ok(Math.abs(result.candidate.signedElongationDeg) < 0.001);
  assert.ok(result.candidate.sunLongitudeDeg > 359);
  assert.ok(result.candidate.sunLongitudeDeg >= 0 && result.candidate.sunLongitudeDeg < 360);
  assert.ok(result.candidate.moonLongitudeDeg >= 0 && result.candidate.moonLongitudeDeg < 360);
});

test('a retrograde opposition crossing at ±180° is not a new Moon', () => {
  const {engine} = syntheticEngine(birthJdUt - 12, -12);
  const result = search(engine);
  // The synthetic backward-moving body has a descending conjunction;
  // a true new-Moon search must only accept an increasing elongation.
  assert.equal(result.status, 'NO_CONJUNCTION_BRACKET');
  assert.equal(result.candidate, null);
});

test('no conjunction inside the search window stays unavailable', () => {
  const engine = {calcUt(jd, body) {
    return {xx: [body === 0 ? 5 : 95, 0, 1, 0, 0, 0],
      rflag: 1, timeSource: 'IERS_LEAP_SECONDS'};
  }};
  const result = search(engine);
  assert.equal(result.status, 'NO_CONJUNCTION_BRACKET');
  assert.equal(result.precedingNewMoon.reason, 'NON_CONVERGENT');
});

test('discontinuous pseudo-root must not be promoted to a new Moon', () => {
  const switchAt = birthJdUt - 5;
  const engine = {calcUt(jd, body) {
    return {xx: [body === 0 ? 0 : jd < switchAt ? 359.8 : 0.2,
      0, 1, 0, 0, 0], rflag: 1, timeSource: 'IERS_LEAP_SECONDS'};
  }};
  const result = search(engine);
  assert.equal(result.status, 'NON_CONVERGENT');
  assert.equal(result.candidate, null);
});

test('nonconvergence due to explicit root-iteration budget fails closed', () => {
  const {engine} = syntheticEngine(birthJdUt - 7.17);
  const result = search(engine, {maxIterations: 10, rootToleranceSeconds: 0.01});
  assert.equal(result.status, 'NON_CONVERGENT');
  assert.equal(result.precedingNewMoon.availability, 'UNAVAILABLE');
});

test('declared UT1 Julian birth must match the UTC and DUT1', () => {
  const {engine} = syntheticEngine(birthJdUt - 5);
  reject(engine, {birthJdUt: birthJdUt + 1 / 86400}, 'INCOMPATIBLE_BIRTH_EPOCH');
  reject(engine, {ut1MinusUtcAtBirthSeconds: 3}, 'INVALID_SEARCH_MODEL');
  reject(engine, {datetimeUtc: '2026-02-30T12:00:00Z'}, 'INVALID_UTC');
  const shifted = search(engine, {datetimeUtc: '2026-11-18T12:00:00.123456Z',
    birthJdUt: birthJdUt + 0.123456 / 86400});
  assert.equal(shifted.datetimeUtc, '2026-11-18T12:00:00.123456Z');
});

test('unexpected native flags, invalid distances, source-policy drift and errors fail closed', () => {
  const {engine} = syntheticEngine(birthJdUt - 5);
  reject({calcUt(jd,body) {return {...engine.calcUt(jd,body,0), rflag: 0};}},
    {}, 'INCOMPATIBLE_POSITION_SOURCE');
  for (const forbiddenFlag of [8, 512, 1024, 2048]) {
    reject({calcUt(jd, body) {return {...engine.calcUt(jd, body, 0),
      rflag: 1 | forbiddenFlag};}}, {}, 'INCOMPATIBLE_POSITION_SOURCE');
  }
  reject({calcUt(jd,body) {const x=engine.calcUt(jd,body,0);return {...x,
    xx: [x.xx[0], 0, -1, 0, 0, 0]};}}, {}, 'INCOMPATIBLE_POSITION_SOURCE');
  reject({calcUt(jd,body) {return {...engine.calcUt(jd,body,0),
    timeSource: body === 0 ? 'IERS_LEAP_SECONDS' : 'OTHER_TIME'};}},
  {}, 'INCOMPATIBLE_POSITION_SOURCE');
  reject({calcUt() {throw new Error('missing kernel');}}, {}, 'EPHEMERIS_POSITION_FAILURE');
});

test('named Delta-T policy permits variable numerical estimates, not cross-body drift', () => {
  const {engine: baseEngine} = syntheticEngine(birthJdUt - 7);
  const policy = 'DELTA_T_TABLE';
  const engine = {calcUt(jd, body, flags) {
    return {...baseEngine.calcUt(jd, body, flags),
      timeSource: `${policy}:MEASURED:${(70 + (jd - birthJdUt) * 0.001).toFixed(4)}:0.1`};
  }};
  assert.equal(search(engine, {expectedTimeSourcePolicy: policy}).status,
    'CANDIDATE_UNVERIFIED_ASTRONOMY');
  reject({calcUt(jd, body, flags) {
    return {...engine.calcUt(jd, body, flags),
      timeSource: `${policy}:MEASURED:${body === 0 ? '70' : '71'}:0.1`};
  }}, {expectedTimeSourcePolicy: policy}, 'INCOMPATIBLE_POSITION_SOURCE');
});

test('search requires complete bounded model and pinned VirgoStars source', () => {
  const {engine} = syntheticEngine(birthJdUt - 5);
  reject(engine, {lookbackDays: 20}, 'INVALID_SEARCH_MODEL');
  reject(engine, {sampleStepHours: 24}, 'INVALID_SEARCH_MODEL');
  reject(engine, {rootToleranceSeconds: 0}, 'INVALID_SEARCH_MODEL');
  reject(engine, {maxIterations: 200}, 'INVALID_SEARCH_MODEL');
  reject(engine, {maxConjunctionResidualDeg: 5}, 'INVALID_SEARCH_MODEL');
  reject(engine, {expectedEphemeris: {...source, engineId: 'SWISS'}},
    'INVALID_EPHEMERIS_PIN');
  reject({}, {}, 'INVALID_EPHEMERIS_PROVIDER');
});

test('Regolo kleroi remain available; Moon-dependent Arabic lots remain blocked', () => {
  const {engine} = syntheticEngine(birthJdUt - 7);
  const found = search(engine);
  const observer = {latitudeDeg: 44, longitudeDegEast: 11, elevationMeters: 40};
  const result = calculateRegoloLotsFromAstronomicalFacts({
    datetimeUtc, observer, expectedEphemeris: source,
    natal: {birthTimeKnown: true, zodiac: 'TROPICAL', chartContextId: 'synthetic',
      ascendantLongitudeDeg: 350,
      planetsLongitudeDeg: {SUN: 10, MOON: 80, MERCURY: 100,
        VENUS: 130, MARS: 160, JUPITER: 200, SATURN: 260},
      houseCuspsDeg: Array.from({length: 12}, (_, i) => i * 30 + 10),
      midheavenLongitudeDeg: 300, descendantLongitudeDeg: 170},
    sunHorizon: {...source, datetimeUtc, observer,
      altitudeType: 'APPARENT_SUN_CENTER_TOPOCENTRIC',
      horizonModelId: 'SYNTHETIC', sunAltitudeDeg: 10,
      horizonAltitudeDeg: 0, uncertaintyDeg: 0.01, warnings: []},
    precedingNewMoon: found.precedingNewMoon,
  });
  assert.equal(Object.keys(result.kleroi.kleroi).length, 9);
  assert.equal(result.arabicParts.entries.length, 92);
  assert.ok(result.arabicParts.availableCount < 92);
  assert.deepEqual(result.arabicParts.entries.find(e => e.id === 'REG_ABU_MASHAR_4_07').missing,
    ['NEW_MOON']);
});

test('experimental package ESM subpath resolves without changing root calculations', async () => {
  const module = await import('astrological-functions/regolo-moon-conjunction-search');
  assert.equal(module.searchRegoloPrecedingConjunction, searchRegoloPrecedingConjunction);
});
