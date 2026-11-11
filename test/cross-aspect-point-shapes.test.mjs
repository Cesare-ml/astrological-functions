import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, calculateCrossAspects } from '../src/index.mjs';

const options = {
  direction: 'SKY_TO_NATAL',
  sourcePoints: [{ name: 'SUN', longitudeDeg: 10 }],
  targetPoints: [{ name: 'MOON', longitudeDeg: 10 }],
  aspectDefinitions: [{ id: 'conjunction', angleDeg: 0, maxOrbDeg: 1 }]
};

test('rejects array-shaped points even with attached name and longitude', () => {
  const disguised = [];
  disguised.name = 'SUN';
  disguised.longitudeDeg = 10;
  for (const field of ['sourcePoints', 'targetPoints']) {
    assert.throws(
      () => calculateCrossAspects({ ...options, [field]: [disguised] }),
      error => error instanceof AstrologyError && error.code === 'INVALID_POINT'
    );
  }
});

test('ordinary points still produce a directional conjunction', () => {
  const aspects = calculateCrossAspects(options);
  assert.equal(aspects.length, 1);
  assert.equal(aspects[0].direction, 'SKY_TO_NATAL');
  assert.equal(aspects[0].absoluteOrbDeg, 0);
});
