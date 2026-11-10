import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from '../src/index.mjs';

test('natal body map safely preserves names colliding with Object prototype', async () => {
  const bodyNames = ['__proto__', 'constructor', 'toString', 'Sun'];
  const calls = [];
  const provider = {
    getGeocentricEcliptic: async ({ bodyName }) => {
      calls.push(bodyName);
      return {
        longitudeDeg: 30, latitudeDeg: 0,
        metadata: { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' }
      };
    }
  };
  const result = await calculateNatalWithProvider({
    datetimeUtc: '2026-11-10T12:00:00Z',
    latitudeDeg: 0, longitudeDegEast: 0, bodyNames, provider
  });
  assert.deepEqual(calls, bodyNames);
  assert.deepEqual(Object.keys(result.bodies), bodyNames);
  assert.equal(Object.getPrototypeOf(result.bodies), null);
  for (const name of bodyNames) {
    assert.equal(result.bodies[name].name, name);
    assert.equal(result.bodies[name].zodiacSignIndex, 1);
  }
  assert.equal(Object.prototype.hasOwnProperty.call(result.bodies, '__proto__'), true);
  assert.equal(JSON.parse(JSON.stringify(result.bodies)).__proto__.name, '__proto__');
  assert.equal(Object.isFrozen(result.bodies), true);
});
