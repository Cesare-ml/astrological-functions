import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from '../src/index.mjs';

const base = { latitudeDeg: 44, longitudeDegEast: 12, bodyNames: ['Sun'] };

test('rejects normalized impossible UTC dates before invoking ephemeris', async () => {
  let calls = 0;
  const provider = { getGeocentricEcliptic: async () => { calls++; throw Error('unexpected call'); } };
  for (const datetimeUtc of [
    '2026-02-30T12:00:00Z', '2025-02-29T12:00:00Z',
    '2026-13-01T12:00:00Z', '2026-11-09T24:00:00Z',
    '2026-11-09T12:60:00Z', '2026-11-09T12:00:60Z'
  ]) {
    await assert.rejects(
      calculateNatalWithProvider({ ...base, datetimeUtc, provider }),
      error => error.code === 'INVALID_UTC', datetimeUtc);
  }
  assert.equal(calls, 0);
});

test('accepts leap day and fractional UTC time with apparent mock provider', async () => {
  const provider = { getGeocentricEcliptic: async () => ({
    longitudeDeg: 359.5, latitudeDeg: 0,
    metadata: { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' }
  }) };
  for (const datetimeUtc of ['2024-02-29T12:00:00Z', '2024-02-29T12:00:00.123Z']) {
    const result = await calculateNatalWithProvider({ ...base, datetimeUtc, provider });
    assert.equal(result.bodies.Sun.zodiacSignIndex, 11);
    assert.equal(result.datetimeUtc, datetimeUtc);
  }
});
