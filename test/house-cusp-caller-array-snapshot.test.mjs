import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AstrologyError, locateLongitudeInHouses, validateHouseCuspSet,
  validateHouseCuspContext,
} from '../src/index.mjs';

// Synthetic geometry only; the astronomical house cusps are external.
const baseCusps = () => Array.from({ length: 12 }, (_, i) => i * 30);
const metadata = Object.freeze({ houseSystem: 'VEHLOW', placementMethod: 'CUSP_INTERVAL' });
const validate = cusps => validateHouseCuspSet({
  houseSystem: 'VEHLOW', calculationProfile: 'CANONICAL_V1', cusps, metadata,
});

test('direct house geometry samples an indexed cusp getter exactly once', () => {
  const cusps = baseCusps();
  let reads = 0;
  Object.defineProperty(cusps, 0, {
    enumerable: true,
    get() { return ++reads === 1 ? 0 : 15; },
  });
  const result = locateLongitudeInHouses(5, cusps);
  assert.equal(reads, 1);
  assert.equal(result.house, 1);
  assert.equal(result.startDeg, 0);
  assert.equal(result.endDeg, 30);
});

test('invalid first cusp read is rejected rather than trusting a later value', () => {
  const cusps = baseCusps();
  let reads = 0;
  Object.defineProperty(cusps, 0, {
    enumerable: true,
    get() { return ++reads === 1 ? NaN : 0; },
  });
  assert.throws(() => locateLongitudeInHouses(5, cusps), {
    code: 'INVALID_CUSPS',
  });
  assert.equal(reads, 1);
});

test('direct locator does not execute overridden caller Array.map', () => {
  const cusps = baseCusps();
  let calls = 0;
  cusps.map = () => {
    calls++;
    return Array.from({ length: 12 }, (_, i) => (15 + i * 30) % 360);
  };
  assert.equal(locateLongitudeInHouses(5, cusps).house, 1);
  assert.equal(calls, 0);
});

test('direct locator does not execute a forged Symbol.iterator', () => {
  const cusps = baseCusps();
  let calls = 0;
  cusps[Symbol.iterator] = function* () {
    calls++;
    yield* Array.from({ length: 12 }, (_, i) => (15 + i * 30) % 360);
  };
  assert.equal(locateLongitudeInHouses(5, cusps).house, 1);
  assert.equal(calls, 0);
});

test('cusp-set validation reads indexed values rather than a forged iterator', () => {
  const cusps = baseCusps();
  let calls = 0;
  cusps[Symbol.iterator] = function* () {
    calls++;
    yield* Array.from({ length: 12 }, (_, i) => (15 + i * 30) % 360);
  };
  const result = validate(cusps);
  assert.equal(calls, 0);
  assert.equal(result.cusps[0], 0);
  assert.equal(result.cusps[1], 30);
  assert.equal(Object.isFrozen(result.cusps), true);
});

test('cusp-set validation reads each indexed accessor exactly once', () => {
  const cusps = baseCusps();
  let reads = 0;
  Object.defineProperty(cusps, 0, {
    enumerable: true,
    get() { return ++reads === 1 ? 0 : 15; },
  });
  const result = validate(cusps);
  assert.equal(reads, 1);
  assert.equal(result.cusps[0], 0);
});

test('cusp-set validation rejects first invalid getter read', () => {
  const cusps = baseCusps();
  let reads = 0;
  Object.defineProperty(cusps, 0, {
    enumerable: true,
    get() { return ++reads === 1 ? Infinity : 0; },
  });
  assert.throws(() => validate(cusps), { code: 'INVALID_CUSPS' });
  assert.equal(reads, 1);
});

test('sparse arrays with inherited numerical slots fail closed in both APIs', () => {
  const cusps = baseCusps();
  delete cusps[0];
  const inherited = Object.create(Array.prototype);
  inherited[0] = 0;
  Object.setPrototypeOf(cusps, inherited);
  assert.throws(() => locateLongitudeInHouses(5, cusps), { code: 'INVALID_CUSPS' });
  assert.throws(() => validate(cusps), { code: 'INVALID_CUSPS' });
});

test('validated snapshot stays frozen and detached from caller mutations', () => {
  const cusps = baseCusps();
  const result = validate(cusps);
  cusps[0] = 15;
  assert.equal(result.cusps[0], 0);
  assert.equal(Object.isFrozen(result.cusps), true);
  assert.equal(locateLongitudeInHouses(359.99999999999994, result.cusps).house, 12);
});

test('house context uses the same indexed cusp snapshot and matching provenance', () => {
  const cusps = baseCusps();
  let calls = 0;
  cusps[Symbol.iterator] = function* () {
    calls++;
    yield* Array.from({ length: 12 }, (_, i) => (15 + i * 30) % 360);
  };
  const provenance = Object.freeze({
    engineVersion: 'synthetic-engine', kernelSetId: 'synthetic-kernel', timeModel: 'synthetic-time',
  });
  const chart = {
    datetimeUtc: '2026-11-14T12:00:00Z', latitudeDeg: 44.8, longitudeDegEast: 11.9,
    ephemerisProvenance: provenance,
  };
  const set = {
    houseSystem: 'VEHLOW', calculationProfile: 'CANONICAL_V1', cusps,
    metadata: { ...metadata, datetimeUtc: chart.datetimeUtc,
      latitudeDeg: chart.latitudeDeg, longitudeDegEast: chart.longitudeDegEast,
      ephemerisProvenance: { ...provenance } },
  };
  const result = validateHouseCuspContext({ chart, cuspSet: set });
  assert.equal(calls, 0);
  assert.equal(result.cusps[0], 0);
  assert.equal(result.metadata.ephemerisProvenance.kernelSetId, 'synthetic-kernel');
});

test('binary64 value just before first cusp still belongs to the previous house', () => {
  const cusps = Array.from({ length: 12 }, (_, i) => (30 + i * 30) % 360);
  const result = locateLongitudeInHouses(29.999999999999996, cusps);
  assert.equal(result.house, 12);
  assert.equal(result.endDeg, 30);
  assert.ok(Object.isFrozen(result));
});
