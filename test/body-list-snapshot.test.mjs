import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from '../src/index.mjs';

test('natal provider iteration snapshots validated body identifiers across awaits', async () => {
  const bodyNames = ['Sun', 'Moon'];
  const calls = [];
  const provider = {
    async getGeocentricEcliptic({ bodyName }) {
      calls.push(bodyName);
      if (bodyName === 'Sun') {
        // Simulate a caller mutating the input while an asynchronous provider runs.
        bodyNames.splice(1, 1, 'Mars', 'Venus');
        await Promise.resolve();
      }
      return {
        longitudeDeg: 20, latitudeDeg: 0,
        metadata: { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' }
      };
    }
  };
  const result = await calculateNatalWithProvider({
    datetimeUtc: '2026-11-10T12:00:00Z',
    latitudeDeg: 0, longitudeDegEast: 0, bodyNames, provider
  });
  assert.deepEqual(calls, ['Sun', 'Moon']);
  assert.deepEqual(Object.keys(result.bodies), ['Sun', 'Moon']);
  assert.equal(result.bodies.Mars, undefined);
  assert.equal(result.bodies.Venus, undefined);
});
