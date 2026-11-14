import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyZodiacDecan } from '../src/zodiac-decan-facts.mjs';

const tropical = Object.freeze({ type: 'TROPICAL' });
const fact = longitudeDeg => classifyZodiacDecan({ longitudeDeg, zodiac: tropical });
const succeedsAt = longitudeDeg => {
  const value = fact(longitudeDeg);
  assert.equal(value.globalDecanIndex, Math.floor(value.normalizedLongitudeDeg / 10));
  assert.equal(value.signIndex, Math.floor(value.globalDecanIndex / 3));
  assert.equal(value.decanNumber, value.globalDecanIndex % 3 + 1);
  assert.ok(value.distanceFromStartDeg >= 0 && value.distanceFromStartDeg < 10);
  return value;
};

function adjacentPositive(value, increment) {
  const bits = new DataView(new ArrayBuffer(8));
  bits.setFloat64(0, value, false);
  bits.setBigUint64(0, bits.getBigUint64(0, false) + BigInt(increment), false);
  return bits.getFloat64(0, false);
}

test('36 half-open sectors classify exact starts, interiors and zodiac signs', () => {
  for (let sector = 0; sector < 36; sector++) {
    const start = sector * 10;
    const onStart = succeedsAt(start);
    const inside = succeedsAt(start + 5);
    assert.equal(onStart.globalDecanIndex, sector);
    assert.equal(inside.globalDecanIndex, sector);
    assert.equal(onStart.startDeg, start);
    assert.equal(onStart.endDeg, (start + 10) % 360);
    assert.equal(onStart.distanceFromStartDeg, 0);
    assert.equal(inside.distanceFromStartDeg, 5);
  }
});

test('one-binary64-step neighbors do not snap to the wrong ten-degree sector', () => {
  for (let sector = 1; sector <= 36; sector++) {
    const boundary = sector * 10;
    const before = succeedsAt(adjacentPositive(boundary, -1));
    const exact = succeedsAt(boundary);
    const after = succeedsAt(adjacentPositive(boundary, +1));
    assert.equal(before.globalDecanIndex, sector - 1);
    assert.equal(exact.globalDecanIndex, sector % 36);
    assert.equal(after.globalDecanIndex, sector % 36);
  }
});

test('360-degree alias, negative longitudes, and negative zero normalize explicitly', () => {
  assert.deepEqual(fact(360), fact(0));
  assert.equal(fact(-0).normalizedLongitudeDeg, 0);
  assert.equal(fact(-1).globalDecanIndex, 35);
  assert.equal(fact(720 + 45).globalDecanIndex, 4);
  assert.equal(fact(-360 - 20).globalDecanIndex, 34);
  assert.equal(fact(359.9).globalDecanIndex, 35);
});

test('explicit sidereal coordinate policy preserves caller asserted ayanamsa', () => {
  const result = classifyZodiacDecan({ longitudeDeg: 40, zodiac: { type: 'SIDEREAL', ayanamsaId: ' LAHIRI_TEST_V1 ' } });
  assert.deepEqual(result.zodiac, { type: 'SIDEREAL', ayanamsaId: 'LAHIRI_TEST_V1' });
  assert.equal(result.signIndex, 1);
  assert.equal(result.decanNumber, 2);
});

test('rejects absent, wrong, and contradictory coordinate policies', () => {
  for (const input of [undefined, null, 123, [], {}, { longitudeDeg: 5 },
    { longitudeDeg: 5, zodiac: { type: 'SIDEREAL' } },
    { longitudeDeg: 5, zodiac: { type: 'SIDEREAL', ayanamsaId: '  ' } },
    { longitudeDeg: 5, zodiac: { type: 'TROPICAL', ayanamsaId: 'LAHIRI' } },
    { longitudeDeg: 5, zodiac: { type: 'UNKNOWN' } }]) {
    assert.throws(() => classifyZodiacDecan(input), error =>
      error?.code === 'INVALID_ARGUMENT' || error?.code === 'INVALID_ZODIAC');
  }
});

test('rejects nonfinite or nonnumeric coordinate values', () => {
  for (const longitudeDeg of [NaN, Infinity, -Infinity, '10', null, undefined]) {
    assert.throws(() => fact(longitudeDeg), error => error?.code === 'INVALID_ANGLE');
  }
});

test('result and nested coordinate-policy facts are immutable snapshots', () => {
  const policy = { type: 'SIDEREAL', ayanamsaId: 'TEST' };
  const result = classifyZodiacDecan({ longitudeDeg: 20, zodiac: policy });
  policy.ayanamsaId = 'MUTATED';
  assert.equal(result.zodiac.ayanamsaId, 'TEST');
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.zodiac));
  assert.throws(() => { result.decanNumber = 99; }, TypeError);
  assert.throws(() => { result.zodiac.ayanamsaId = 'MUTATED'; }, TypeError);
});
