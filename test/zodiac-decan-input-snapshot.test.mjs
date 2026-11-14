import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyZodiacDecan } from '../src/zodiac-decan-facts.mjs';

const facts = zodiac => classifyZodiacDecan({ longitudeDeg: 45, zodiac });

test('a changing zodiac type getter is read once and never switches policy during result creation', () => {
  let reads = 0;
  const zodiac = { get type() { return ++reads <= 4 ? 'TROPICAL' : 'SIDEREAL'; } };
  const result = facts(zodiac);
  assert.equal(reads, 1);
  assert.deepEqual(result.zodiac, { type: 'TROPICAL' });
  assert.equal(result.globalDecanIndex, 4);
});

test('sidereal ayanamsa accessor is captured once and used for validated output', () => {
  let reads = 0;
  const zodiac = {
    type: 'SIDEREAL',
    get ayanamsaId() { return ++reads === 1 ? ' CANONICAL_V1 ' : 'FORGED_V2'; },
  };
  const result = facts(zodiac);
  assert.equal(reads, 1);
  assert.deepEqual(result.zodiac, { type: 'SIDEREAL', ayanamsaId: 'CANONICAL_V1' });
  assert.ok(Object.isFrozen(result.zodiac));
});

test('first-read invalid sidereal ayanamsa fails even when a getter later turns valid', () => {
  let reads = 0;
  const zodiac = { type: 'SIDEREAL', get ayanamsaId() { return ++reads === 1 ? '  ' : 'VALID_LATER'; } };
  assert.throws(() => facts(zodiac), error => error?.code === 'INVALID_ZODIAC');
  assert.equal(reads, 1);
});

test('first-read unsupported zodiac type cannot be laundered by subsequent getter reads', () => {
  let reads = 0;
  const zodiac = { get type() { return ++reads === 1 ? 'UNKNOWN' : 'TROPICAL'; } };
  assert.throws(() => facts(zodiac), error => error?.code === 'INVALID_ZODIAC');
  assert.equal(reads, 1);
});
