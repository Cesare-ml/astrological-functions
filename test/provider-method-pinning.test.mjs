import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// Synthetic F2 contract checks. No real astronomical ephemeris is used.
const metadata = Object.freeze({
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
  engineVersion: 'synthetic', kernelSetId: 'synthetic', timeModel: 'synthetic',
});
const input = Object.freeze({
  datetimeUtc: '2026-11-14T12:00:00Z', latitudeDeg: 44.8,
  longitudeDegEast: 11.9, bodyNames: ['Sun', 'Moon'],
});
const justBeforeAries = 359.99999999999994;

test('public provider method getter is pinned once across awaited body requests', async () => {
  let methodReads = 0, originalCalls = 0, replacementCalls = 0;
  const requests = [];
  const provider = {
    get getGeocentricEcliptic() {
      methodReads++;
      if (methodReads !== 1) return async () => {
        replacementCalls++;
        throw Error('method unexpectedly replaced mid-chart');
      };
      return async function(request) {
        assert.strictEqual(this, provider);
        requests.push(request);
        originalCalls++;
        await Promise.resolve(); // permit reentrancy during body calculation
        return {
          longitudeDeg: request.bodyName === 'Sun' ? justBeforeAries : 0,
          latitudeDeg: 0, metadata,
        };
      };
    },
  };
  const chart = await calculateNatalWithProvider({ ...input, provider });
  assert.equal(methodReads, 1);
  assert.equal(originalCalls, 2);
  assert.equal(replacementCalls, 0);
  assert.deepEqual(requests.map(request => request.bodyName), ['Sun', 'Moon']);
  assert.ok(requests.every(Object.isFrozen));
  assert.equal(chart.bodies.Sun.longitudeDeg, justBeforeAries);
  assert.equal(chart.bodies.Sun.zodiacSignIndex, 11);
  assert.equal(chart.bodies.Moon.zodiacSignIndex, 0);
  assert.equal(chart.ephemerisProvenance.kernelSetId, 'synthetic');
});

test('public provider method uses the original receiver despite a shadowed .call', async () => {
  let calls = 0;
  const provider = {
    getGeocentricEcliptic: function (request) {
      assert.strictEqual(this, provider);
      calls++;
      return { longitudeDeg: request.bodyName === 'Sun' ? 10 : 20, latitudeDeg: 0, metadata };
    },
  };
  provider.getGeocentricEcliptic.call = 'shadowed';
  const chart = await calculateNatalWithProvider({ ...input, provider });
  assert.equal(calls, 2);
  assert.equal(chart.bodies.Moon.longitudeDeg, 20);
});

test('non-callable provider accessor remains a typed MISSING_PROVIDER error', async () => {
  let reads = 0;
  const provider = { get getGeocentricEcliptic() { reads++; return {}; } };
  await assert.rejects(calculateNatalWithProvider({ ...input, provider }),
    { code: 'MISSING_PROVIDER' });
  assert.equal(reads, 1);
});

test('pinned provider still rejects geometric J2000 without downgrade', async () => {
  let calls = 0;
  const provider = {
    async getGeocentricEcliptic() {
      calls++;
      return { longitudeDeg: justBeforeAries, latitudeDeg: 0,
        metadata: { ...metadata, frame: 'J2000', corrections: 'GEOMETRIC' } };
    },
  };
  await assert.rejects(calculateNatalWithProvider({ ...input, provider }),
    { code: 'INCOMPATIBLE_EPHEMERIS' });
  assert.equal(calls, 1);
});
