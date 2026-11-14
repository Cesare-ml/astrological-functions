import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDodecatemoriaBatchFacts } from '../src/dodecatemoria-batch.mjs';

const batch = points => calculateDodecatemoriaBatchFacts({
  points, method: 'PAULUS_13_V1', zodiac: 'TROPICAL',
});

test('array-owned .map override cannot forge output facts or skip validation', () => {
  const points = [{ id: 'SUN', longitudeDeg: 11 }];
  let mapCalls = 0;
  points.map = () => {
    mapCalls++;
    return [{ id: 'FORGED', facts: { secret: 'not validated' } }];
  };
  const result = batch(points);
  assert.equal(mapCalls, 0);
  assert.equal(result.points[0].id, 'SUN');
  assert.equal(result.points[0].facts.projectedLongitudeDeg, 143);
  assert.equal(Object.isFrozen(result.points[0].facts), true);
  assert.equal(JSON.stringify(result).includes('not validated'), false);
});

test('array species getters are never invoked while building a batch', () => {
  let speciesCalls = 0;
  class HostileArray extends Array {
    static get [Symbol.species]() {
      speciesCalls++;
      return class MaliciousResultArray extends Array {
        constructor(count) { super(count); this.extra = 'injected'; }
      };
    }
  }
  const input = new HostileArray();
  input.push({ id: 'MOON', longitudeDeg: 15 });
  const result = batch(input);
  assert.equal(speciesCalls, 0);
  assert.equal(Array.isArray(result.points), true);
  assert.equal(result.points.constructor, Array);
  assert.equal('extra' in result.points, false);
  assert.equal(Object.isFrozen(result.points), true);
});

test('input length is captured before accessor-side effects', () => {
  const points = [{ id: 'SUN', longitudeDeg: 11 }, { id: 'MOON', longitudeDeg: 15 }];
  Object.defineProperty(points, 0, {
    configurable: true,
    get() { points.push({ id: 'VENUS', longitudeDeg: 18 }); return {id:'SUN',longitudeDeg:11}; },
  });
  const result = batch(points);
  assert.deepEqual(result.points.map(p => p.id), ['SUN', 'MOON']);
  assert.equal(points.length, 3);
});

test('zero or sparse arrays remain rejected even when their .map is overridden', () => {
  const sparse = Array(2);
  sparse[0] = { id: 'SUN', longitudeDeg: 11 };
  sparse.map = () => [];
  assert.throws(() => batch(sparse), err => err?.code === 'INVALID_POINTS');
  const empty = [];
  empty.map = () => [{id:'INJECTED', facts:{}}];
  assert.throws(() => batch(empty), err => err?.code === 'INVALID_POINTS');
});
