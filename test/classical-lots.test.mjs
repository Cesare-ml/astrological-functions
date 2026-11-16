import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateClassicalLots } from '../src/classical-lots.mjs';

const base = Object.freeze({
  ascendantLongitudeDeg: 350,
  sunLongitudeDeg: 20,
  moonLongitudeDeg: 80,
  birthTimeKnown: true,
  sect: 'DAY',
  zodiac: 'TROPICAL',
  chartContextId: 'synthetic-001',
});

const invalid = (input, code) => assert.throws(
  () => calculateClassicalLots(input),
  error => error?.name === 'AstrologyError' && error.code === code,
);

test('day sect computes Fortune = ASC + Moon - Sun, Spirit = ASC + Sun - Moon', () => {
  const result = calculateClassicalLots(base);
  assert.equal(result.lots.fortune.longitudeDeg, 50);
  assert.equal(result.lots.spirit.longitudeDeg, 290);
  assert.equal(result.lots.fortune.zodiacSignIndex, 1);
  assert.equal(result.lots.spirit.zodiacSignIndex, 9);
  assert.equal(result.method, 'SECT_REVERSAL_V1');
  assert.equal(result.contract, 'ClassicalLotsResult');
  assert.equal(result.ayanamsa, null);
});

test('night sect explicitly reverses both formulas', () => {
  const result = calculateClassicalLots({...base, sect: 'NIGHT'});
  assert.equal(result.lots.fortune.longitudeDeg, 290);
  assert.equal(result.lots.spirit.longitudeDeg, 50);
});

test('switching Sun/Moon reverses the day lots without changing the context', () => {
  const switched = calculateClassicalLots({...base, sunLongitudeDeg:80, moonLongitudeDeg:20});
  assert.equal(switched.lots.fortune.longitudeDeg, 290);
  assert.equal(switched.lots.spirit.longitudeDeg, 50);
});

test('input whole turns and negative angles normalize identically', () => {
  const wrapped = calculateClassicalLots({
    ...base, ascendantLongitudeDeg: -10, sunLongitudeDeg: 380, moonLongitudeDeg: -280,
  });
  assert.equal(wrapped.lots.fortune.longitudeDeg, 50);
  assert.equal(wrapped.lots.spirit.longitudeDeg, 290);
});

test('at Sun/Moon conjunction both lots equal Ascendant, including zero', () => {
  const result = calculateClassicalLots({...base, ascendantLongitudeDeg: 360, sunLongitudeDeg: 3, moonLongitudeDeg: 3});
  assert.deepEqual([result.lots.fortune.longitudeDeg, result.lots.spirit.longitudeDeg], [0,0]);
  assert.equal(result.lots.fortune.zodiacSignIndex, 0);
});

test('opposed Sun/Moon produces two coincident opposite lots, without an invented winner', () => {
  const result = calculateClassicalLots({...base, ascendantLongitudeDeg: 0, sunLongitudeDeg: 5, moonLongitudeDeg:185});
  assert.equal(result.lots.fortune.longitudeDeg, 180);
  assert.equal(result.lots.spirit.longitudeDeg, 180);
});

test('exact 30° boundary is in next sign; signed zero is normalized', () => {
  const result = calculateClassicalLots({...base, ascendantLongitudeDeg:30, sunLongitudeDeg:0, moonLongitudeDeg:0});
  assert.equal(result.lots.fortune.zodiacSignIndex, 1);
  assert.equal(Object.is(result.lots.spirit.longitudeDeg, -0), false);
});

test('result is deeply immutable across nested lots and warnings', () => {
  const result = calculateClassicalLots(base);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.lots));
  assert.ok(Object.isFrozen(result.lots.fortune) && Object.isFrozen(result.lots.spirit));
  assert.ok(Object.isFrozen(result.warnings));
  assert.throws(() => {result.lots.fortune.longitudeDeg = 123;}, TypeError);
  assert.deepEqual(result.warnings, ['CALLER_ASSERTED_SHARED_CHART_AND_SECT_NOT_VERIFIED']);
});

test('unknown or omitted birth time fails closed', () => {
  invalid({...base, birthTimeKnown:false}, 'BIRTH_TIME_REQUIRED');
  invalid({...base, birthTimeKnown:undefined}, 'BIRTH_TIME_REQUIRED');
});

test('unknown or omitted day/night sect fails closed', () => {
  invalid({...base, sect:undefined}, 'INVALID_SECT');
  invalid({...base, sect:'UNKNOWN'}, 'INVALID_SECT');
});

test('invalid or omitted zodiac fails closed', () => {
  invalid({...base, zodiac:undefined}, 'INVALID_ZODIAC');
  invalid({...base, zodiac:'TOPOCENTRIC'}, 'INVALID_ZODIAC');
  invalid({...base, ayanamsaId:'LAHIRI'}, 'UNEXPECTED_AYANAMSA');
  invalid({...base, ayanamsaVersion:'1'}, 'UNEXPECTED_AYANAMSA');
});

test('missing or empty shared context fails closed', () => {
  invalid({...base, chartContextId:''}, 'INVALID_CHART_CONTEXT');
  invalid({...base, chartContextId:'   '}, 'INVALID_CHART_CONTEXT');
  invalid({...base, chartContextId:123}, 'INVALID_CHART_CONTEXT');
});

test('invalid longitudes fail closed rather than returning fabricated lots', () => {
  for (const key of ['ascendantLongitudeDeg', 'sunLongitudeDeg', 'moonLongitudeDeg']) {
    for (const value of [undefined, NaN, Infinity, -Infinity, '20']) {
      invalid({...base, [key]:value}, 'INVALID_ANGLE');
    }
  }
});

test('non-object inputs fail closed', () => {
  for (const value of [null, undefined, [], 'text']) invalid(value, 'INVALID_ARGUMENT');
});

test('no input mutation and explicit sidereal context retained', () => {
  const result = calculateClassicalLots({...base, zodiac:'SIDEREAL', ayanamsaId:'LAHIRI', ayanamsaVersion:'2026.1'});
  assert.equal(result.zodiac, 'SIDEREAL');
  assert.deepEqual(result.ayanamsa, {id:'LAHIRI', version:'2026.1'});
  assert.ok(Object.isFrozen(result.ayanamsa));
  assert.equal(result.chartContextId, base.chartContextId);
  assert.equal(base.ascendantLongitudeDeg,350);
  assert.equal(base.sect,'DAY');
});

test('sidereal coordinates require an explicit versioned ayanamsa identifier', () => {
  for (const change of [
    { ayanamsaId: undefined, ayanamsaVersion: undefined },
    { ayanamsaId: 'LAHIRI', ayanamsaVersion: undefined },
    { ayanamsaId: undefined, ayanamsaVersion: '2026.1' },
    { ayanamsaId: '', ayanamsaVersion: '2026.1' },
    { ayanamsaId: 'LAHIRI ', ayanamsaVersion: '2026.1' },
    { ayanamsaId: 'LAHIRI', ayanamsaVersion: ' ' },
  ]) {
    invalid({...base, zodiac:'SIDEREAL', ...change}, 'INVALID_AYANAMSA');
  }
});
