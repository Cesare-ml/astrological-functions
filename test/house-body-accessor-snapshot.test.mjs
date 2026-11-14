import test from 'node:test';
import assert from 'node:assert/strict';
import { placeNatalBodiesInHouses } from 'astrological-functions/ephemeris-provider';

// Synthetic house cusp geometry. No astronomical/JPL values are computed here.
const provenance = Object.freeze({
  engineVersion: 'synthetic', kernelSetId: 'synthetic', timeModel: 'synthetic',
});
const context = Object.freeze({
  datetimeUtc: '2026-11-14T12:00:00Z',
  latitudeDeg: 44.8, longitudeDegEast: 11.9,
  ephemerisProvenance: provenance,
});
const cuspSet = Object.freeze({
  houseSystem: 'VEHLOW',
  calculationProfile: 'CANONICAL_V1',
  cusps: Object.freeze(Array.from({ length: 12 }, (_, i) => i * 30)),
  metadata: Object.freeze({
    houseSystem: 'VEHLOW', placementMethod: 'CUSP_INTERVAL',
    ...context,
  }),
});
const place = (chart) => placeNatalBodiesInHouses({
  chart, cuspSet, birthTimeKnown: true,
});

test('house placement reads a changing body longitude only once', () => {
  let reads = 0;
  const body = {
    name: 'Sun',
    get longitudeDeg() { return ++reads === 1 ? 15 : 195; },
  };
  const placed = place({ ...context, bodies: { Sun: body } });
  assert.equal(reads, 1);
  assert.equal(placed.placements.Sun.house, 1);
  assert.equal(Object.isFrozen(placed.placements.Sun), true);
});

test('house placement pins chart.bodies accessor before validation', () => {
  let reads = 0;
  const chart = {
    ...context,
    get bodies() {
      return ++reads === 1
        ? { Sun: { name: 'Sun', longitudeDeg: 15 } }
        : { Mars: { name: 'Mars', longitudeDeg: 195 } };
    },
  };
  const placed = place(chart);
  assert.equal(reads, 1);
  assert.deepEqual(Object.keys(placed.placements), ['Sun']);
  assert.equal(placed.placements.Sun.house, 1);
});

test('enumerable body-map accessor is not re-read after the entries snapshot', () => {
  let reads = 0;
  const bodies = {};
  Object.defineProperty(bodies, 'Moon', {
    enumerable: true,
    get() {
      return ++reads === 1
        ? { name: 'Moon', longitudeDeg: 45 }
        : { name: 'Moon', longitudeDeg: 255 };
    },
  });
  const placed = place({ ...context, bodies });
  assert.equal(reads, 1);
  assert.equal(placed.placements.Moon.house, 2);
});

test('invalid first longitude is rejected with INVALID_POINT without a second read', () => {
  let reads = 0;
  const body = {
    name: 'Sun',
    get longitudeDeg() { return ++reads === 1 ? NaN : 15; },
  };
  assert.throws(() => place({ ...context, bodies: { Sun: body } }),
    { code: 'INVALID_POINT' });
  assert.equal(reads, 1);
});

test('reserved JavaScript body names still place safely without prototype pollution', () => {
  const bodies = Object.create(null);
  for (const [name, longitudeDeg] of [
    ['__proto__', 345], ['constructor', 15], ['toString', 195],
  ]) bodies[name] = { name, longitudeDeg };
  const placed = place({ ...context, bodies });
  assert.equal(Object.getPrototypeOf(placed.placements), null);
  assert.deepEqual(Object.keys(placed.placements),
    ['__proto__', 'constructor', 'toString']);
  assert.equal(placed.placements.__proto__.house, 12);
  assert.equal(placed.placements.constructor.house, 1);
  assert.equal(placed.placements.toString.house, 7);
});

test('unknown birth time is rejected before reading chart body getters', () => {
  let reads = 0;
  const chart = {
    ...context,
    get bodies() { reads++; return { Sun: { name: 'Sun', longitudeDeg: 15 } }; },
  };
  assert.throws(() => placeNatalBodiesInHouses({
    chart, cuspSet, birthTimeKnown: false,
  }), { code: 'BIRTH_TIME_REQUIRED' });
  assert.equal(reads, 0);
});
