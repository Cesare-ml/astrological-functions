import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCrossAspects, AstrologyError } from '../src/index.mjs';

const point = { name: 'Sun', longitudeDeg: 0 };
const aspect = { id: 'conjunction', angleDeg: 0, maxOrbDeg: 1 };
const base = { direction: 'A_TO_B', sourcePoints: [point], targetPoints: [point], aspectDefinitions: [aspect] };

for (const key of ['sourcePoints', 'targetPoints', 'aspectDefinitions']) {
  test(`sparse ${key} are rejected instead of silently skipped`, () => {
    const sparse = new Array(1);
    assert.throws(() => calculateCrossAspects({ ...base, [key]: sparse }),
      error => error instanceof AstrologyError && error.code === (key === 'aspectDefinitions' ? 'INVALID_ASPECT' : 'INVALID_POINT'));
  });
}

test('dense inputs still produce a directional conjunction', () => {
  const result = calculateCrossAspects(base);
  assert.equal(result.length, 1);
  assert.equal(result[0].aspectId, 'conjunction');
  assert.equal(result[0].direction, 'A_TO_B');
});
