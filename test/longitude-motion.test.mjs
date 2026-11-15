import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLongitudinalMotion } from '../src/longitude-motion.mjs';
import { AstrologyError } from '../src/index.mjs';

const classify = (speed, threshold = 0.01) => classifyLongitudinalMotion({
  longitudeSpeedDegPerDay: speed,
  stationaryThresholdDegPerDay: threshold,
});

test('direct, retrograde and explicit unknown speeds stay distinct', () => {
  assert.equal(classify(1.2).motion, 'DIRECT');
  assert.equal(classify(-0.4).motion, 'RETROGRADE');
  assert.equal(classify(null).motion, 'UNAVAILABLE');
  assert.equal(classify(null).longitudeSpeedDegPerDay, null);
});

test('both exact station tolerance boundaries are classified STATIONARY', () => {
  assert.equal(classify(0.01).motion, 'STATIONARY');
  assert.equal(classify(-0.01).motion, 'STATIONARY');
  assert.equal(classify(0).motion, 'STATIONARY');
  assert.equal(classify(-0).motion, 'STATIONARY');
  assert.equal(classify(0.0100001).motion, 'DIRECT');
  assert.equal(classify(-0.0100001).motion, 'RETROGRADE');
});

test('exact zero tolerance distinguishes signed nonzero rates', () => {
  assert.equal(classify(0, 0).motion, 'STATIONARY');
  assert.equal(classify(1e-100, 0).motion, 'DIRECT');
  assert.equal(classify(-1e-100, 0).motion, 'RETROGRADE');
});

test('no implicit tolerance or omitted speed is accepted', () => {
  assert.throws(() => classifyLongitudinalMotion({ longitudeSpeedDegPerDay: 1 }),
    e => e instanceof AstrologyError && e.code === 'INVALID_MOTION_THRESHOLD');
  assert.throws(() => classifyLongitudinalMotion({ stationaryThresholdDegPerDay: 0 }),
    e => e instanceof AstrologyError && e.code === 'INVALID_LONGITUDE_SPEED');
  for (const input of [null, undefined, [], 1, 'invalid']) {
    assert.throws(() => classifyLongitudinalMotion(input),
      e => e instanceof AstrologyError && e.code === 'INVALID_LONGITUDE_SPEED');
  }
});

test('invalid rate and tolerance fail closed with typed errors', () => {
  for (const speed of [NaN, Infinity, -Infinity, undefined, '0', {}, false]) {
    assert.throws(() => classify(speed),
      e => e instanceof AstrologyError && e.code === 'INVALID_LONGITUDE_SPEED');
  }
  for (const threshold of [NaN, Infinity, -Infinity, -0.001, undefined, null, '0.01']) {
    assert.throws(() => classifyLongitudinalMotion({ longitudeSpeedDegPerDay: 1, stationaryThresholdDegPerDay: threshold }),
      e => e instanceof AstrologyError && e.code === 'INVALID_MOTION_THRESHOLD');
  }
});

test('results are immutable facts and do not include synodic phase', () => {
  const input = { longitudeSpeedDegPerDay: -0.05, stationaryThresholdDegPerDay: 0.01 };
  const result = classifyLongitudinalMotion(input);
  input.longitudeSpeedDegPerDay = 0.05;
  assert.equal(result.motion, 'RETROGRADE');
  assert.equal(result.longitudeSpeedDegPerDay, -0.05);
  assert.equal(result.contract, 'LongitudeMotionFact');
  assert.equal(result.contractVersion, '0.1.0-experimental');
  assert.equal(Object.isFrozen(result), true);
  assert.equal('synodicMotion' in result, false);
  assert.throws(() => { result.motion = 'DIRECT'; }, TypeError);
});
