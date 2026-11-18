import test from 'node:test';
import assert from 'node:assert/strict';
import {searchRegoloPrecedingConjunction} from
  '../src/regolo-moon-conjunction-search.mjs';

// These are deterministic SYNTHETIC ephemerides, never DE441 verification.
const periodDays = 29.53059;
const meanRate = 360 / periodDays;
const canonical = value => ((value % 360) + 360) % 360;
const source = {engineId: 'VIRGOSTARS_EPHEMERIS',
  engineVersion: 'synthetic-eccentric-sun-moon', kernelSetId: 'synthetic-jpl',
  timeModelId: 'synthetic-ut1'};
const dates = [
  '1600-02-29T00:00:00Z', '1800-02-28T23:59:59Z',
  '1900-03-01T00:00:00Z', '2000-02-29T12:00:00Z',
  '2016-12-31T23:59:59Z', '2026-11-18T12:00:00Z',
  '2100-03-01T00:00:00Z', '2200-12-31T23:59:59Z',
];

function build(datetimeUtc, ageDays, sunBase, variationDeg, hours, lookbackDays,
  toleranceSeconds=0.25) {
  const birthJdUt = 2440587.5 + Date.parse(datetimeUtc) / 86400000;
  const rootJdUt = birthJdUt - ageDays;
  let calls = 0;
  const engine = {calcUt(jdUt, body, flags) {
    ++calls;
    assert.equal(flags, 0);
    assert.ok(body === 0 || body === 1);
    const delta = jdUt - rootJdUt;
    const sun = canonical(sunBase + (jdUt - birthJdUt) * 0.9856);
    const anomaly = variationDeg * Math.sin(delta * 2 * Math.PI / periodDays);
    const moon = canonical(sun + meanRate * delta + anomaly);
    return {xx: [body === 0 ? sun : moon, 0,
      body === 0 ? 1 : 0.0026, 0, 0, 0],
    rflag: 1, timeSource: 'IERS_LEAP_SECONDS'};
  }};
  return {rootJdUt, getCalls: () => calls, input: {
    datetimeUtc, birthJdUt, ut1MinusUtcAtBirthSeconds: 0,
    expectedEphemeris: source, expectedTimeSourcePolicy: 'IERS_LEAP_SECONDS',
    lookbackDays, sampleStepHours: hours, rootToleranceSeconds: toleranceSeconds,
    maxIterations: 80, maxConjunctionResidualDeg: 0.001,
    engine,
  }};
}

test('128 eccentric synthetic cycles preserve latest root over centuries and date boundaries', () => {
  for (let i = 0; i < 128; ++i) {
    const ageDays = 0.03 + ((i * 53) % 2945) / 100;
    const sunBase = [0, 0.00001, 1, 179.99999, 359.6, 359.99999][i % 6];
    const variationDeg = [0, 1, 3, 7][i % 4];
    const hours = [1, 3, 6, 12][i % 4];
    const lookbackDays = [30, 31, 35][i % 3];
    const sample = build(dates[i % dates.length], ageDays, sunBase,
      variationDeg, hours, lookbackDays);
    const output = searchRegoloPrecedingConjunction(sample.input);
    assert.equal(output.status, 'CANDIDATE_UNVERIFIED_ASTRONOMY',
      `synthetic case ${i}, age=${ageDays}, step=${hours}h`);
    assert.ok(Math.abs((output.candidate.jdUt - sample.rootJdUt) * 86400) <= 0.25,
      `case ${i} epoch error too large`);
    assert.ok(Math.abs(output.candidate.signedElongationDeg) < 0.001);
    assert.ok(output.candidate.localLongitudeSweepDeg > 0);
    assert.equal(output.precedingNewMoon.availability, 'UNAVAILABLE');
    assert.ok(output.candidateBrackets >= 1 && output.candidateBrackets <= 2);
    assert.ok(sample.getCalls() <= (output.sampledPoints + 200) * 2,
      `case ${i} unbounded source calls`);
  }
});

test('common zodiac rotation does not change a physical conjunction instant', () => {
  const roots = [];
  for (const base of [0, 0.000001, 45, 90, 179.999, 240, 359.999999]) {
    const s = build('2026-11-18T12:00:00Z', 5.123456, base, 4, 6, 35);
    const result = searchRegoloPrecedingConjunction(s.input);
    assert.equal(result.status, 'CANDIDATE_UNVERIFIED_ASTRONOMY');
    roots.push(result.candidate.jdUt);
  }
  assert.ok(Math.max(...roots) - Math.min(...roots) <= 0.25 / 86400);
});

test('seam at opposition without a real conjunction never creates a candidate', () => {
  const birthJd = 2440587.5 + Date.parse('2026-11-18T12:00:00Z') / 86400000;
  const sourceEngine = {calcUt(jd, body) {
    const difference = 180 + 2 * (jd - (birthJd - 10));
    return {xx: [body === 0 ? 0 : canonical(difference),
      0, 1, 0, 0, 0], rflag: 1, timeSource: 'IERS_LEAP_SECONDS'};
  }};
  const s = build('2026-11-18T12:00:00Z', 5, 0, 0, 1, 35);
  const result = searchRegoloPrecedingConjunction({...s.input, engine: sourceEngine});
  assert.equal(result.status, 'NO_CONJUNCTION_BRACKET');
  assert.equal(result.candidate, null);
  assert.equal(result.precedingNewMoon.availability, 'UNAVAILABLE');
});
