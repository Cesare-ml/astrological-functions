import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// Synthetic contract regression only; Rust VirgoStars Ephemeris owns astronomy.
// https://github.com/Cesare-ml/VirgoStars-Ephemeris
const metadata = Object.freeze({
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
  engineVersion: 'mock-engine', kernelSetId: 'mock-kernel', timeModel: 'mock-time'
});
function run(metadataForBody) {
  const requests = [];
  const promise = calculateNatalWithProvider({
    datetimeUtc: '2026-11-14T00:00:00Z', latitudeDeg: 45,
    longitudeDegEast: 11, bodyNames: ['Sun', 'Moon'],
    provider: {
      async getGeocentricEcliptic(request) {
        requests.push(request);
        return { longitudeDeg: request.bodyName === 'Sun' ? 15 : 45,
          latitudeDeg: 0, metadata: metadataForBody(request.bodyName) };
      }
    }
  });
  return { promise, requests };
}

test('public ESM adapter rejects partially identified provider results', async () => {
  for (const missing of ['engineVersion', 'kernelSetId', 'timeModel']) {
    const partial = { ...metadata };
    delete partial[missing];
    const { promise, requests } = run(() => partial);
    await assert.rejects(promise, { code: 'INVALID_EPHEMERIS_RESULT' }, missing);
    assert.deepEqual(requests.map(r => r.bodyName), ['Sun'], missing);
    assert.equal(Object.isFrozen(requests[0]), true);
  }
});

test('public ESM adapter rejects mixing absent and complete provenance in both orders', async () => {
  for (const firstComplete of [true, false]) {
    const { promise, requests } = run(name => {
      const complete = (name === 'Sun') === firstComplete;
      if (complete) return { ...metadata };
      return { center: metadata.center, frame: metadata.frame, corrections: metadata.corrections };
    });
    await assert.rejects(promise, { code: 'INCONSISTENT_EPHEMERIS' });
    assert.deepEqual(requests.map(r => r.bodyName), ['Sun', 'Moon']);
    assert.equal(requests.every(Object.isFrozen), true);
  }
});

test('public ESM adapter preserves matching provenance as immutable chart metadata', async () => {
  const { promise, requests } = run(() => ({ ...metadata }));
  const chart = await promise;
  assert.deepEqual(chart.ephemerisProvenance, {
    engineVersion: 'mock-engine', kernelSetId: 'mock-kernel', timeModel: 'mock-time'
  });
  assert.equal(Object.isFrozen(chart.ephemerisProvenance), true);
  assert.deepEqual(requests.map(r => r.bodyName), ['Sun', 'Moon']);
});
