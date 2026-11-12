import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLongitudeMotion, LongitudeMotionError } from '../src/longitude-motion.mjs';

const classify = (speed, threshold) => classifyLongitudeMotion({
  longitudeSpeedDegPerDay: speed,
  stationaryThresholdDegPerDay: threshold,
});

for (const [speed, threshold, expected] of [
  [1.2, 0.05, 'DIRECT'],
  [-0.8, 0.05, 'RETROGRADE'],
  [0, 0.05, 'STATIONARY'],
  [-0, 0, 'STATIONARY'],
  [0.05, 0.05, 'STATIONARY'],
  [-0.05, 0.05, 'STATIONARY'],
  [0.05000000000001, 0.05, 'DIRECT'],
  [-0.05000000000001, 0.05, 'RETROGRADE'],
  [1e-12, 0, 'DIRECT'],
  [-1e-12, 0, 'RETROGRADE'],
]) {
  test(`classifies longitude speed ${String(speed)} with threshold ${threshold} as ${expected}`, () => {
    assert.equal(classify(speed, threshold).motion, expected);
  });
}

test('returns immutable, factual metadata and canonicalizes negative zero', () => {
  const facts = classify(-0, -0);
  assert.ok(Object.isFrozen(facts));
  assert.equal(facts.contract, 'LongitudeMotionFacts');
  assert.equal(facts.contractVersion, '0.1.0-experimental');
  assert.equal(facts.motionBasis, 'LONGITUDE_DERIVATIVE');
  assert.equal(facts.interpretation, 'FACTS_ONLY');
  assert.ok(Object.is(facts.longitudeSpeedDegPerDay, 0));
  assert.ok(Object.is(facts.stationaryThresholdDegPerDay, 0));
  assert.throws(() => { facts.motion = 'DIRECT'; }, TypeError);
});

test('rejects absent, null, string, NaN and infinite speeds without assuming stationarity', () => {
  for (const input of [{stationaryThresholdDegPerDay:0.1},
    {longitudeSpeedDegPerDay:null, stationaryThresholdDegPerDay:0.1}]) {
    assert.throws(() => classifyLongitudeMotion(input), e => e instanceof LongitudeMotionError && e.code === 'MISSING_LONGITUDE_SPEED');
  }
  for (const speed of ['0.0', NaN, Infinity, -Infinity]) {
    assert.throws(() => classify(speed, 0.1), e => e.code === 'INVALID_LONGITUDE_SPEED');
  }
});

test('requires an explicit finite nonnegative stationary band', () => {
  for (const threshold of [undefined, null, '0.1', -0.1, NaN, Infinity, -Infinity]) {
    assert.throws(() => classify(1, threshold), e => e.code === 'INVALID_STATIONARY_THRESHOLD');
  }
});

test('rejects malformed outer argument', () => {
  for (const input of [undefined, null, 0, [], 'speed']) {
    assert.throws(() => classifyLongitudeMotion(input), e => e.code === 'INVALID_MOTION_INPUT');
  }
});

test('reads inputs without mutation; never fabricates a synodic phase', () => {
  const input = Object.freeze({longitudeSpeedDegPerDay:-0.3,stationaryThresholdDegPerDay:0.1});
  const facts = classifyLongitudeMotion(input);
  assert.equal(facts.motion, 'RETROGRADE');
  assert.ok(!Object.hasOwn(facts, 'synodicMotion'));
  assert.ok(!Object.hasOwn(facts, 'synodicPhase'));
});
