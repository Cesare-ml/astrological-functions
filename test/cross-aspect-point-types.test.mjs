import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, calculateCrossAspects } from '../src/index.mjs';

const base = {
  direction: 'A_TO_B',
  sourcePoints: [{ name: 'SUN', longitudeDeg: 0 }],
  targetPoints: [{ name: 'MOON', longitudeDeg: 0 }],
  aspectDefinitions: [{ id: 'conjunction', angleDeg: 0, maxOrbDeg: 0 }]
};

test('malformed optional point types fail with typed INVALID_POINT', () => {
  for (const type of [0, false, [], {}, '', '   ']) {
    for (const side of ['sourcePoints', 'targetPoints']) {
      const input = { ...base, [side]: [{ name: 'TEST', longitudeDeg: 0, type }] };
      assert.throws(
        () => calculateCrossAspects(input),
        error => error instanceof AstrologyError && error.code === 'INVALID_POINT'
      );
    }
  }
});

test('omitted, null and nonempty string point types preserve valid aspect matches', () => {
  for (const type of [undefined, null, 'body', 'angle']) {
    const input = {
      ...base,
      sourcePoints: [{ name: 'SUN', longitudeDeg: 0, ...(type === undefined ? {} : { type }) }]
    };
    const matches = calculateCrossAspects(input);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].source.type, type ?? 'body');
  }
});
