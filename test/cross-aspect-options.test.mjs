import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, calculateCrossAspects } from '../src/index.mjs';

test('cross-aspect options reject invalid containers with typed errors', () => {
  for (const input of [undefined, null, false, 0, 'invalid', []]) {
    assert.throws(() => calculateCrossAspects(input),
      error => error instanceof AstrologyError && error.code === 'INVALID_ARGUMENT');
  }
});

test('cross-aspect options retain explicit direction validation', () => {
  assert.throws(() => calculateCrossAspects({}),
    error => error instanceof AstrologyError && error.code === 'INVALID_DIRECTION');
});

test('valid empty cross-aspect inputs remain supported', () => {
  assert.deepEqual(calculateCrossAspects({
    direction: 'SKY_TO_NATAL', sourcePoints: [], targetPoints: [], aspectDefinitions: []
  }), []);
});
