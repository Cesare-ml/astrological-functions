import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// Synthetic boundary tests only. Astronomy belongs to Rust VirgoStars Ephemeris:
// https://github.com/Cesare-ml/VirgoStars-Ephemeris
const base = Object.freeze({
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT'
});
const complete = Object.freeze({
  ...base, engineVersion: 'synthetic-v1',
  kernelSetId: 'synthetic-kernel', timeModel: 'synthetic-time'
});

async function chartWith(first, second) {
  const calls = [];
  const chart = calculateNatalWithProvider({
    datetimeUtc: '2026-11-14T00:00:00Z',
    latitudeDeg: 45, longitudeDegEast: 11,
    bodyNames: ['Sun', 'Moon'],
    provider: {
      async getGeocentricEcliptic(request) {
        calls.push(request);
        return {
          longitudeDeg: request.bodyName === 'Sun' ? 12 : 48,
          latitudeDeg: 0,
          metadata: request.bodyName === 'Sun' ? first : second
        };
      }
    }
  });
  return { chart, calls };
}

test('null and undefined provenance are absent, never stringified', async () => {
  for (const absent of [null, undefined]) {
    const metadata = {
      ...base, engineVersion: absent, kernelSetId: absent, timeModel: absent
    };
    const { chart, calls } = await chartWith(metadata, metadata);
    const result = await chart;
    assert.equal(result.ephemerisProvenance, null);
    assert.deepEqual(calls.map(call => call.bodyName), ['Sun', 'Moon']);
    assert.equal(calls.every(Object.isFrozen), true);
  }
});

test('null or undefined mixed with a complete provenance fails closed in either order', async () => {
  for (const absent of [null, undefined]) {
    const missing = {
      ...base, engineVersion: absent, kernelSetId: absent, timeModel: absent
    };
    for (const [first, second] of [[complete, missing], [missing, complete]]) {
      const { chart, calls } = await chartWith(first, second);
      await assert.rejects(chart, { code: 'INCONSISTENT_EPHEMERIS' });
      assert.deepEqual(calls.map(call => call.bodyName), ['Sun', 'Moon']);
    }
  }
});

test('a single null or undefined provenance field rejects before the second body', async () => {
  for (const key of ['engineVersion', 'kernelSetId', 'timeModel']) {
    for (const absent of [null, undefined]) {
      const partial = { ...complete, [key]: absent };
      const { chart, calls } = await chartWith(partial, complete);
      await assert.rejects(chart, { code: 'INVALID_EPHEMERIS_RESULT' });
      assert.deepEqual(calls.map(call => call.bodyName), ['Sun']);
    }
  }
});
