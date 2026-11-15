import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';

// External body identifiers are data, not properties of Object.prototype.
test('prototype-shaped body identifiers remain own immutable chart entries', async () => {
  const names = ['__proto__', 'constructor', 'toString'];
  const calls = [];
  const chart = await calculateNatalWithProvider({
    datetimeUtc: '2026-11-15T00:00:00Z',
    latitudeDeg: 45,
    longitudeDegEast: 11,
    bodyNames: names,
    provider: {
      async getGeocentricEcliptic(request) {
        calls.push(request);
        return {
          longitudeDeg: 10 + calls.length,
          latitudeDeg: 0,
          metadata: {
            center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
            engineVersion: 'synthetic-rust', kernelSetId: 'synthetic-kernel',
            timeModel: 'synthetic-time'
          }
        };
      }
    }
  });
  assert.deepEqual(calls.map(request => request.bodyName), names);
  assert.ok(calls.every(Object.isFrozen));
  assert.equal(Object.getPrototypeOf(chart.bodies), null);
  assert.deepEqual(Object.keys(chart.bodies), names);
  assert.ok(Object.isFrozen(chart.bodies));
  for (const name of names) {
    assert.ok(Object.hasOwn(chart.bodies, name));
    assert.equal(chart.bodies[name].name, name);
    assert.ok(Object.isFrozen(chart.bodies[name]));
  }
  assert.equal(Object.prototype.polluted, undefined);
});
