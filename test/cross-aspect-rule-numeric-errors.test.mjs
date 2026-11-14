import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, calculateCrossAspects } from '../src/index.mjs';

const base = {
  direction: 'A_TO_B',
  sourcePoints: [{ name: 'Sun', longitudeDeg: 0 }],
  targetPoints: [{ name: 'Moon', longitudeDeg: 90 }]
};

test('invalid numeric aspect rule fields report INVALID_ASPECT', () => {
  for (const field of ['angleDeg', 'maxOrbDeg']) {
    for (const value of [undefined, null, '90', NaN, Infinity, -Infinity]) {
      const rule = { id: 'square', angleDeg: 90, maxOrbDeg: 5, [field]: value };
      assert.throws(
        () => calculateCrossAspects({ ...base, aspectDefinitions: [rule] }),
        error => error instanceof AstrologyError && error.code === 'INVALID_ASPECT',
        `${field}=${String(value)}`
      );
    }
  }
});

test('finite numeric aspect rule fields retain matching behavior', () => {
  const matches = calculateCrossAspects({
    ...base, aspectDefinitions: [{ id: 'square', angleDeg: 90, maxOrbDeg: 0 }]
  });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].aspectId, 'square');
  assert.equal(matches[0].absoluteOrbDeg, 0);
});
