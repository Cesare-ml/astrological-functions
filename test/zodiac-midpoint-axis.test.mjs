import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError } from '../src/index.mjs';
import { calculateZodiacMidpointAxis as axis } from '../src/zodiac-midpoint-axis.mjs';

const mid = (a, b) => axis({ firstLongitudeDeg: a, secondLongitudeDeg: b });
const approx = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} differs from ${b}`);

test('wrap-around crossing 0° yields 0° and 180° axis', () => {
  const fact = mid(350, 10);
  assert.deepEqual(fact.axisLongitudesDeg, [0, 180]);
  assert.equal(fact.separationDeg, 20);
  assert.equal(fact.shortArcMidpointDeg, 0);
  assert.equal(fact.opposingMidpointDeg, 180);
});

test('reversing endpoints leaves canonical midpoint axis unchanged', () => {
  const a = mid(350, 10), b = mid(10, 350);
  assert.deepEqual(a.axisLongitudesDeg, b.axisLongitudesDeg);
  assert.equal(a.shortArcMidpointDeg, b.shortArcMidpointDeg);
  assert.equal(a.opposingMidpointDeg, b.opposingMidpointDeg);
  assert.equal(a.separationDeg, b.separationDeg);
});

test('long forward arc selects counterclockwise short-arc midpoint', () => {
  const f = mid(10, 250);
  assert.deepEqual(f.axisLongitudesDeg, [130, 310]);
  assert.equal(f.shortArcMidpointDeg, 310);
  assert.equal(f.opposingMidpointDeg, 130);
  assert.equal(f.separationDeg, 120);
});

test('exact opposition explicitly leaves short midpoint ambiguous', () => {
  const a = mid(0, 180), b = mid(180, 0);
  assert.deepEqual(a.axisLongitudesDeg, [90, 270]);
  assert.deepEqual(b.axisLongitudesDeg, [90, 270]);
  assert.equal(a.separationDeg, 180);
  assert.equal(a.hasUniqueShortArcMidpoint, false);
  assert.equal(a.shortArcMidpointDeg, null);
  assert.equal(a.opposingMidpointDeg, null);
});

test('other opposed axes also remain explicitly ambiguous', () => {
  const fact = mid(90, 270);
  assert.deepEqual(fact.axisLongitudesDeg, [0, 180]);
  assert.equal(fact.shortArcMidpointDeg, null);
  assert.equal(fact.hasUniqueShortArcMidpoint, false);
});

test('identical longitudes have a unique short-arc midpoint', () => {
  const fact = mid(12, 12);
  assert.deepEqual(fact.axisLongitudesDeg, [12, 192]);
  assert.equal(fact.shortArcMidpointDeg, 12);
  assert.equal(fact.separationDeg, 0);
});

test('normalization accepts negative and multiple-revolution angles', () => {
  const fact = mid(-10, 730);
  assert.deepEqual(fact.axisLongitudesDeg, [0, 180]);
  assert.deepEqual(fact.inputs, {firstLongitudeDeg:350, secondLongitudeDeg:10});
});

test('full turns and negative zero normalize consistently', () => {
  const fact = mid(-0, 720);
  assert.deepEqual(fact.axisLongitudesDeg, [0, 180]);
  assert.ok(Object.is(fact.shortArcMidpointDeg, 0));
});

test('invalid input shapes fail closed with existing AstrologyError', () => {
  for (const input of [undefined, null, [], 3, 'lon', {},
    {firstLongitudeDeg: 0}, {secondLongitudeDeg: 0}]) {
    assert.throws(() => axis(input), e => e instanceof AstrologyError && e.code === 'INVALID_MIDPOINT_INPUT');
  }
});

test('non-finite and nonnumeric longitudes are rejected by canonical normalizer', () => {
  for (const invalid of [null, undefined, '30', NaN, Infinity, -Infinity, {}]) {
    assert.throws(() => mid(invalid, 20), e => e instanceof AstrologyError && e.code === 'INVALID_ANGLE');
    assert.throws(() => mid(20, invalid), e => e instanceof AstrologyError && e.code === 'INVALID_ANGLE');
  }
});

test('nested result is immutable and detached from caller input', () => {
  const input = {firstLongitudeDeg:120, secondLongitudeDeg:180};
  const result = axis(input);
  input.firstLongitudeDeg = 240;
  assert.equal(result.inputs.firstLongitudeDeg, 120);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.inputs));
  assert.ok(Object.isFrozen(result.axisLongitudesDeg));
  assert.throws(() => { result.axisLongitudesDeg[0] = 999; }, TypeError);
  assert.throws(() => { result.inputs.secondLongitudeDeg = 999; }, TypeError);
  assert.equal(result.calculationBasis, 'ECLIPTIC_LONGITUDE_GEOMETRY');
  assert.equal(result.interpretation, 'FACTS_ONLY');
  assert.ok(!Object.hasOwn(result, 'ephemeris'));
});

test('axis solutions are always 180° apart on systematic integer fixtures', () => {
  for (let a = 0; a < 360; a += 30) {
    for (let b = 0; b < 360; b += 15) {
      const f = mid(a,b), r = mid(b,a);
      approx(f.separationDeg, r.separationDeg);
      for (const angle of f.axisLongitudesDeg) assert.ok(angle >= 0 && angle < 360);
      approx(f.axisLongitudesDeg[1] - f.axisLongitudesDeg[0], 180);
      assert.deepEqual(f.axisLongitudesDeg, r.axisLongitudesDeg);
      assert.equal(f.shortArcMidpointDeg, r.shortArcMidpointDeg);
      if (f.separationDeg === 180) assert.equal(f.shortArcMidpointDeg, null);
    }
  }
});

test('fractional angles preserve expected geometry without rounding policy', () => {
  const result = mid(22.5, 37.5);
  approx(result.shortArcMidpointDeg, 30);
  approx(result.opposingMidpointDeg, 210);
});
