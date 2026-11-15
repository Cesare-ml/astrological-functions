import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from '../src/index.mjs';

test('natal warning records are immutable as well as the warning list', async () => {
  const provider = {
    async getGeocentricEcliptic() {
      return {
        longitudeDeg: 30, latitudeDeg: 0,
        metadata: { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' }
      };
    }
  };
  const result = await calculateNatalWithProvider({
    datetimeUtc: '2026-11-10T12:00:00Z',
    latitudeDeg: 44, longitudeDegEast: 12,
    bodyNames: ['Sun'], provider
  });
  assert.equal(Object.isFrozen(result.warnings), true);
  assert.equal(Object.isFrozen(result.warnings[0]), true);
  assert.throws(() => { result.warnings[0].code = 'fake'; }, TypeError);
  assert.equal(result.warnings[0].code, 'houses_unavailable');
});
