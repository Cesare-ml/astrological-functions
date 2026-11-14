import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, calculateCrossAspects } from '../src/index.mjs';

const options = {
  direction: 'SKY_TO_NATAL',
  sourcePoints: [{ name: 'SUN', longitudeDeg: 10 }],
  targetPoints: [{ name: 'MOON', longitudeDeg: 10 }],
  aspectDefinitions: [{ id: 'conjunction', angleDeg: 0, maxOrbDeg: 1 }]
};

test('malformed aspect definitions yield typed INVALID_ASPECT', () => {
  const disguised = [];
  disguised.id = 'conjunction';
  disguised.angleDeg = 0;
  disguised.maxOrbDeg = 1;
  for (const value of [null, undefined, 0, false, 'conjunction', disguised]) {
    assert.throws(
      () => calculateCrossAspects({ ...options, aspectDefinitions: [value] }),
      error => error instanceof AstrologyError && error.code === 'INVALID_ASPECT'
    );
  }
});

test('valid plain-object definition still matches a conjunction', () => {
  const matches = calculateCrossAspects(options);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].aspectId, 'conjunction');
  assert.equal(matches[0].absoluteOrbDeg, 0);
});
