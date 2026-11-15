import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError } from '../src/index.mjs';
import { calculateZodiacMidpointContacts as calculate } from '../src/zodiac-midpoint-contact.mjs';

const contact = (firstLongitudeDeg, secondLongitudeDeg, targetLongitudeDeg, maxOrbDeg) =>
  calculate({firstLongitudeDeg, secondLongitudeDeg, targetLongitudeDeg, maxOrbDeg});

test('wrap-around midpoint: conjunction contact at 0°', () => {
  const result = contact(350, 10, 1, 2);
  assert.deepEqual(result.midpointAxis.axisLongitudesDeg, [0, 180]);
  assert.deepEqual(result.matchingAxisLongitudesDeg, [0]);
  assert.deepEqual(result.contacts.map(x => x.separationDeg), [1, 179]);
  assert.equal(result.hasContact, true);
});

test('midpoint axis contact includes its antipodal solution', () => {
  const result = contact(350, 10, 180, 0);
  assert.deepEqual(result.matchingAxisLongitudesDeg, [180]);
  assert.deepEqual(result.contacts.map(x => x.withinOrb), [false, true]);
});

test('exact maximum orb boundary is inclusive, outside is excluded', () => {
  assert.deepEqual(contact(350, 10, 3, 3).matchingAxisLongitudesDeg, [0]);
  assert.deepEqual(contact(350, 10, 3, 2.99).matchingAxisLongitudesDeg, []);
  assert.equal(contact(350, 10, 3, 2.99).hasContact, false);
});

test('two axis points are simultaneously in orb at the exact 90° limit', () => {
  const result = contact(350, 10, 90, 90);
  assert.deepEqual(result.matchingAxisLongitudesDeg, [0, 180]);
  assert.deepEqual(result.contacts.map(c => c.separationDeg), [90, 90]);
});

test('zero orb requires exact conjunction to an axis solution', () => {
  assert.equal(contact(350, 10, 0, 0).hasContact, true);
  assert.equal(contact(350, 10, 0.001, 0).hasContact, false);
});

test('exactly opposed input endpoints do not pretend to choose short arc', () => {
  const result = contact(0, 180, 90, 0);
  assert.deepEqual(result.matchingAxisLongitudesDeg, [90]);
  assert.equal(result.midpointAxis.hasUniqueShortArcMidpoint, false);
  assert.equal(result.midpointAxis.shortArcMidpointDeg, null);
});

test('coincident endpoints remain a valid axis', () => {
  const result = contact(12, 12, 192, 0);
  assert.deepEqual(result.midpointAxis.axisLongitudesDeg, [12,192]);
  assert.deepEqual(result.matchingAxisLongitudesDeg, [192]);
});

test('negative and multiple-revolution coordinates are normalized', () => {
  const result = contact(-10, 730, -360, 0);
  assert.equal(result.targetLongitudeDeg, 0);
  assert.deepEqual(result.matchingAxisLongitudesDeg, [0]);
});

test('rejects absent or malformed input and missing orb', () => {
  for (const input of [null, undefined, [], {}, 0, 'no',
    {firstLongitudeDeg:0, secondLongitudeDeg:30, targetLongitudeDeg:15},
    {firstLongitudeDeg:0, secondLongitudeDeg:30, maxOrbDeg:1}]) {
    assert.throws(() => calculate(input),
      e => e instanceof AstrologyError && e.code === 'INVALID_MIDPOINT_CONTACT_INPUT');
  }
});

test('requires explicit nonnegative orb at most 90 degrees', () => {
  for (const orb of [null, undefined, '1', -0.1, 90.1, NaN, Infinity, -Infinity]) {
    assert.throws(() => contact(0,30,15,orb),
      e => e instanceof AstrologyError && e.code === 'INVALID_MIDPOINT_CONTACT_ORB');
  }
});

test('invalid longitudes fail by reusing canonical angle validation', () => {
  for (const value of [null, undefined, '0', NaN, Infinity, -Infinity, {}]) {
    for (const field of ['firstLongitudeDeg','secondLongitudeDeg','targetLongitudeDeg']) {
      const input = {firstLongitudeDeg:0, secondLongitudeDeg:30, targetLongitudeDeg:0, maxOrbDeg:1};
      input[field] = value;
      assert.throws(() => calculate(input),
        e => e instanceof AstrologyError && e.code === 'INVALID_ANGLE');
    }
  }
});

test('results are detached immutable facts, never interpretations', () => {
  const input = {firstLongitudeDeg:350,secondLongitudeDeg:10,targetLongitudeDeg:0,maxOrbDeg:2};
  const result = calculate(input);
  input.firstLongitudeDeg = 5;
  assert.equal(result.midpointAxis.inputs.firstLongitudeDeg,350);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.midpointAxis));
  assert.ok(Object.isFrozen(result.contacts));
  assert.ok(Object.isFrozen(result.contacts[0]));
  assert.ok(Object.isFrozen(result.matchingAxisLongitudesDeg));
  assert.equal(result.interpretation,'FACTS_ONLY');
  assert.ok(!Object.hasOwn(result,'ephemeris'));
  assert.throws(() => {result.contacts[0].withinOrb=false;}, TypeError);
});

test('reversing endpoints preserves contacts for all 15-degree sample axes', () => {
  for (let a=0;a<360;a+=30) for (let b=0;b<360;b+=30)
    for (let target=0;target<360;target+=15) {
      const first = contact(a,b,target,3), reverse = contact(b,a,target,3);
      assert.deepEqual(first.contacts,reverse.contacts);
      assert.deepEqual(first.matchingAxisLongitudesDeg,reverse.matchingAxisLongitudesDeg);
    }
});

test('the nearest axis distance never exceeds 90°', () => {
  for (let first=0;first<360;first+=60)
    for (let second=0;second<360;second+=60)
      for (let target=0;target<360;target+=10) {
        const r=contact(first,second,target,0);
        assert.ok(Math.min(...r.contacts.map(c=>c.separationDeg))<=90);
      }
});
