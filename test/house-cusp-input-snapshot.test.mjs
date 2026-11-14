import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, locateLongitudeInHouses, normalize360 } from '../src/index.mjs';

const equalCusps = () => Array.from({ length: 12 }, (_, i) => i * 30);

test('an overridden caller map cannot forge a different house geometry', () => {
  const cusps = equalCusps();
  let mapCalls = 0;
  cusps.map = () => {
    mapCalls++;
    return Array.from({ length: 12 }, (_, i) => normalize360(i * 30 + 15));
  };
  const placement = locateLongitudeInHouses(5, cusps);
  assert.equal(mapCalls, 0);
  assert.equal(placement.house, 1);
  assert.equal(placement.startDeg, 0);
  assert.equal(placement.endDeg, 30);
});

test('an accessor-backed cusp is read exactly once and its validated value is used', () => {
  const cusps = equalCusps();
  let reads = 0;
  Object.defineProperty(cusps, 0, {
    enumerable: true,
    configurable: true,
    get() { return ++reads === 1 ? 0 : 15; },
  });
  const placement = locateLongitudeInHouses(5, cusps);
  assert.equal(reads, 1);
  assert.equal(placement.house, 1);
  assert.equal(placement.startDeg, 0);
});

test('a first-read invalid cusp cannot later become valid', () => {
  const cusps = equalCusps();
  let reads = 0;
  Object.defineProperty(cusps, 0, {
    enumerable: true,
    configurable: true,
    get() { return ++reads === 1 ? Number.NaN : 0; },
  });
  assert.throws(() => locateLongitudeInHouses(5, cusps),
    error => error instanceof AstrologyError && error.code === 'INVALID_CUSPS');
  assert.equal(reads, 1);
});

test('input species hooks cannot replace the locally constructed cusp snapshot', () => {
  let speciesReads = 0;
  class SpeciesCusps extends Array {
    static get [Symbol.species]() { speciesReads++; return Array; }
  }
  const cusps = SpeciesCusps.from(equalCusps());
  assert.equal(locateLongitudeInHouses(359.99999999999994, cusps).house, 12);
  assert.equal(locateLongitudeInHouses(0, cusps).house, 1);
  assert.equal(speciesReads, 0);
});

test('sparse and nonfinite cusp lists still fail with INVALID_CUSPS', () => {
  const sparse = equalCusps();
  delete sparse[4];
  assert.throws(() => locateLongitudeInHouses(5, sparse), error => error?.code === 'INVALID_CUSPS');
  const invalid = equalCusps();
  invalid[4] = Infinity;
  assert.throws(() => locateLongitudeInHouses(5, invalid), error => error?.code === 'INVALID_CUSPS');
});
