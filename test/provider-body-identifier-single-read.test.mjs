import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from '../src/index.mjs';

// Synthetic adapter only: no astronomical coordinates are calculated here.
const input = Object.freeze({
  datetimeUtc: '2026-11-14T12:00:00Z',
  latitudeDeg: 44.8, longitudeDegEast: 11.9,
});
const metadata = Object.freeze({
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
});
function recorder() {
  const calls = [];
  return {
    calls,
    provider: {
      async getGeocentricEcliptic(request) {
        calls.push(request.bodyName);
        return { longitudeDeg: 15, latitudeDeg: 0, metadata };
      },
    },
  };
}

test('changing Symbol.iterator never changes the identifiers sent to the provider', async () => {
  const bodyNames = ['Sun'];
  let iteratorReads = 0;
  bodyNames[Symbol.iterator] = function* () {
    iteratorReads++;
    yield iteratorReads === 1 ? 'Sun' : 'Moon';
  };
  const { calls, provider } = recorder();
  const chart = await calculateNatalWithProvider({ ...input, bodyNames, provider });
  assert.equal(iteratorReads, 0);
  assert.deepEqual(calls, ['Sun']);
  assert.deepEqual(Object.keys(chart.bodies), ['Sun']);
});

test('indexed body-name accessor is read once for both validation and requests', async () => {
  const bodyNames = ['Sun'];
  let reads = 0;
  Object.defineProperty(bodyNames, 0, {
    enumerable: true,
    get() { return ++reads === 1 ? 'Sun' : 'Mars'; },
  });
  const { calls, provider } = recorder();
  const chart = await calculateNatalWithProvider({ ...input, bodyNames, provider });
  assert.equal(reads, 1);
  assert.deepEqual(calls, ['Sun']);
  assert.equal(chart.bodies.Sun.name, 'Sun');
  assert.equal(chart.bodies.Mars, undefined);
});

test('first-read duplicate identifiers are rejected without contacting the provider', async () => {
  const bodyNames = ['Sun', 'Moon'];
  let reads = 0;
  Object.defineProperty(bodyNames, 1, {
    enumerable: true,
    get() { return ++reads === 1 ? 'Sun' : 'Venus'; },
  });
  const { calls, provider } = recorder();
  await assert.rejects(
    calculateNatalWithProvider({ ...input, bodyNames, provider }),
    { code: 'INVALID_BODIES' },
  );
  assert.equal(reads, 1);
  assert.deepEqual(calls, []);
});

test('invalid initial identifier cannot become valid on a later read', async () => {
  const bodyNames = ['Sun'];
  let reads = 0;
  Object.defineProperty(bodyNames, 0, {
    enumerable: true,
    get() { return ++reads === 1 ? ' ' : 'Sun'; },
  });
  const { calls, provider } = recorder();
  await assert.rejects(
    calculateNatalWithProvider({ ...input, bodyNames, provider }),
    { code: 'INVALID_BODIES' },
  );
  assert.equal(reads, 1);
  assert.deepEqual(calls, []);
});

test('inherited array slots are rejected rather than accepted as own identifiers', async () => {
  const bodyNames = Array(1);
  const prototype = Object.create(Array.prototype);
  prototype[0] = 'Sun';
  Object.setPrototypeOf(bodyNames, prototype);
  const { calls, provider } = recorder();
  await assert.rejects(
    calculateNatalWithProvider({ ...input, bodyNames, provider }),
    { code: 'INVALID_BODIES' },
  );
  assert.deepEqual(calls, []);
});

test('custom iterator that throws is not needed to snapshot a genuine array', async () => {
  const bodyNames = ['Sun', 'Moon'];
  bodyNames[Symbol.iterator] = () => { throw Error('must not iterate'); };
  const { calls, provider } = recorder();
  const chart = await calculateNatalWithProvider({ ...input, bodyNames, provider });
  assert.deepEqual(calls, ['Sun', 'Moon']);
  assert.deepEqual(Object.keys(chart.bodies), ['Sun', 'Moon']);
});

test('async provider cannot change the already validated array snapshot', async () => {
  const bodyNames = ['Sun', 'Moon'];
  const calls = [];
  const provider = {
    async getGeocentricEcliptic(request) {
      calls.push(request.bodyName);
      if (calls.length === 1) {
        bodyNames[1] = 'Mars';
        await Promise.resolve();
      }
      return { longitudeDeg: 15, latitudeDeg: 0, metadata };
    },
  };
  const chart = await calculateNatalWithProvider({ ...input, bodyNames, provider });
  assert.deepEqual(calls, ['Sun', 'Moon']);
  assert.deepEqual(Object.keys(chart.bodies), ['Sun', 'Moon']);
});

test('32 real identifiers remain supported, 33 are rejected before any calls', async () => {
  const bodyNames = Object.freeze(Array.from({ length: 32 }, (_, i) => `Body_${i}`));
  const first = recorder();
  const chart = await calculateNatalWithProvider({ ...input, bodyNames, provider: first.provider });
  assert.deepEqual(first.calls, bodyNames);
  assert.equal(Object.keys(chart.bodies).length, 32);
  const second = recorder();
  await assert.rejects(
    calculateNatalWithProvider({ ...input, bodyNames: [...bodyNames, 'Extra'], provider: second.provider }),
    { code: 'INVALID_BODIES' },
  );
  assert.deepEqual(second.calls, []);
});
