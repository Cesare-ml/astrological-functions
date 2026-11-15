import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from '../src/index.mjs';

test('ephemeris receives immutable independent apparent-of-date requests', async () => {
  const requests = [];
  const provider = {
    async getGeocentricEcliptic(request) {
      requests.push(request);
      assert.equal(Object.isFrozen(request), true);
      assert.equal(request.datetimeUtc, '2026-11-10T12:00:00Z');
      assert.equal(request.corrections, 'APPARENT');
      assert.equal(request.frame, 'ECLIPTIC_OF_DATE');
      return {
        longitudeDeg: 42, latitudeDeg: 0,
        metadata: { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' }
      };
    }
  };
  const result = await calculateNatalWithProvider({
    datetimeUtc: '2026-11-10T12:00:00Z', latitudeDeg: 44,
    longitudeDegEast: 12, bodyNames: ['Sun', 'Moon'], provider
  });
  assert.deepEqual(requests.map(request => request.bodyName), ['Sun', 'Moon']);
  assert.notStrictEqual(requests[0], requests[1]);
  assert.deepEqual(Object.keys(result.bodies), ['Sun', 'Moon']);
});
