import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTransitToNatal } from '../src/transit-to-natal.mjs';

const provenance = { engineVersion: 'mock-rust-1', kernelSetId: 'synthetic', timeModel: 'synthetic-TDB' };
const metadata = { ...provenance, center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' };
function chart(datetimeUtc, entries) {
  return { contract: 'NatalChartResult', contractVersion: '0.1.0-experimental', datetimeUtc,
    ephemerisProvenance: { ...provenance },
    bodies: Object.fromEntries(entries.map(([name, longitudeDeg]) => [name, { name, longitudeDeg, ephemerisMetadata: { ...metadata } }])) };
}
const input = () => ({
  natalChart: chart('2000-01-01T12:00:00Z', [['Sun', 1], ['Moon', 180]]),
  skyChart: chart('2026-11-12T19:00:00Z', [['Mars', 359], ['Venus', 190]]),
  birthTimeKnown: true, natalBodyNames: ['Sun', 'Moon'], skyBodyNames: ['Mars', 'Venus'],
  aspectDefinitions: [{ id: 'conj', angleDeg: 0, maxOrbDeg: 3 }, { id: 'opp', angleDeg: 180, maxOrbDeg: 2 }]
});
const throwsCode = (changes, code) => assert.throws(() => calculateTransitToNatal({ ...input(), ...changes }), e => e.code === code);

test('sky-to-natal direction, aspect ownership and wrap-around', () => {
  const result = calculateTransitToNatal(input());
  assert.equal(result.contract, 'TransitToNatalFacts');
  assert.equal(result.direction, 'SKY_TO_NATAL');
  assert.deepEqual(result.aspects.map(a => [a.source.name, a.target.name, a.aspectId]),
    [['Mars', 'Sun', 'conj'], ['Mars', 'Moon', 'opp']]);
  assert.equal(result.aspects[0].absoluteOrbDeg, 2);
  assert.equal(result.houses, null);
  assert.equal(result.angles, null);
});
test('empty explicit definitions produce no aspects; missing definitions fail closed', () => {
  assert.deepEqual(calculateTransitToNatal({ ...input(), aspectDefinitions: [] }).aspects, []);
  throwsCode({ aspectDefinitions: undefined }, 'INVALID_ARGUMENT');
});
test('natal birth time must be explicitly known', () => {
  for (const birthTimeKnown of [undefined, false, null]) throwsCode({ birthTimeKnown }, 'BIRTH_TIME_REQUIRED');
});
test('invalid calendar and timezone offsets are rejected', () => {
  for (const datetimeUtc of ['2026-02-30T00:00:00Z', '2026-11-12T19:00:00+01:00', 'not-a-date'])
    throwsCode({ skyChart: chart(datetimeUtc, [['Mars', 359]]) }, 'INVALID_UTC');
});
test('incompatible ephemeris versions and frames fail closed', () => {
  const changed = input().skyChart;
  changed.ephemerisProvenance.engineVersion = 'another-engine';
  throwsCode({ skyChart: changed }, 'INCOMPATIBLE_EPHEMERIS');
  const bad = input().skyChart;
  bad.bodies.Mars.ephemerisMetadata.frame = 'J2000';
  throwsCode({ skyChart: bad }, 'INCOMPATIBLE_EPHEMERIS');
});
test('unknown, duplicate and sparse selected bodies fail closed', () => {
  throwsCode({ skyBodyNames: ['Jupiter'] }, 'INVALID_BODIES');
  throwsCode({ natalBodyNames: ['Sun', 'Sun'] }, 'INVALID_BODIES');
  const sparse = new Array(2); sparse[1] = 'Mars';
  throwsCode({ skyBodyNames: sparse }, 'INVALID_BODIES');
});
test('malformed body data and prototype-sensitive keys are safely handled', () => {
  const bad = input().natalChart;
  bad.bodies.Sun.longitudeDeg = NaN;
  throwsCode({ natalChart: bad }, 'INVALID_POINT');
  throwsCode({ natalBodyNames: ['__proto__'] }, 'INVALID_BODIES');
});
test('duplicate aspect definition IDs are rejected by shared aspect engine', () => {
  throwsCode({ aspectDefinitions: [{id:'x',angleDeg:0,maxOrbDeg:1},{id:'x',angleDeg:180,maxOrbDeg:1}] }, 'INVALID_ASPECT');
});
test('result and nested snapshots are frozen and detached from inputs', () => {
  const original = input();
  const output = calculateTransitToNatal(original);
  original.skyBodyNames[0] = 'Venus';
  original.skyChart.ephemerisProvenance.engineVersion = 'mutated';
  assert.equal(output.selectedSkyBodyNames[0], 'Mars');
  assert.equal(output.ephemerisProvenance.engineVersion, provenance.engineVersion);
  assert.ok(Object.isFrozen(output));
  assert.ok(Object.isFrozen(output.aspects));
  assert.ok(Object.isFrozen(output.aspects[0].source));
});
