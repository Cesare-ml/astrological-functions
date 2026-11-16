import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLunarElongationSectors } from 'astrological-functions/lunar-elongation';

const TROPICAL = Object.freeze({
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE',
  corrections: 'APPARENT', zodiac: 'TROPICAL',
});
const run = (sunLongitudeDeg, moonLongitudeDeg, context = TROPICAL) =>
  calculateLunarElongationSectors({ sunLongitudeDeg, moonLongitudeDeg, context });

test('all eight sector anchors are exact, ordered and deterministic', () => {
  const ids = ['NEW', 'WAXING_CRESCENT', 'FIRST_QUARTER', 'WAXING_GIBBOUS',
    'FULL', 'WANING_GIBBOUS', 'LAST_QUARTER', 'WANING_CRESCENT'];
  ids.forEach((id, index) => {
    const result = run(0, index * 45);
    assert.equal(result.sectorIndex, index);
    assert.equal(result.sectorId, id);
    assert.equal(result.directedElongationDeg, index * 45);
    assert.equal(result.sectorCenterDeg, index * 45);
    assert.equal(result.signedDistanceFromSectorCenterDeg, 0);
  });
});

test('forward Moon-minus-Sun direction survives Aries wrap', () => {
  const forward = run(359, 1);
  const backward = run(1, 359);
  assert.equal(forward.directedElongationDeg, 2);
  assert.equal(backward.directedElongationDeg, 358);
  assert.equal(forward.sectorId, 'NEW');
  assert.equal(backward.sectorId, 'NEW');
  assert.equal(forward.signedDistanceFromSectorCenterDeg, 2);
  assert.equal(backward.signedDistanceFromSectorCenterDeg, -2);
  assert.equal(run(330, 60).sectorId, 'FIRST_QUARTER');
  assert.equal(run(30, 300).sectorId, 'LAST_QUARTER');
});

test('inclusive sector-boundary tie goes to the increasing-angle neighbor', () => {
  assert.equal(run(0, 22.499999).sectorId, 'NEW');
  assert.equal(run(0, 22.5).sectorId, 'WAXING_CRESCENT');
  assert.equal(run(0, 67.5).sectorId, 'FIRST_QUARTER');
  assert.equal(run(0, 337.499999).sectorId, 'WANING_CRESCENT');
  assert.equal(run(0, 337.5).sectorId, 'NEW');
  assert.equal(run(0, 382.5).sectorId, 'WAXING_CRESCENT');
});

test('normalized facts and nested context are detached, immutable snapshots', () => {
  const context = { ...TROPICAL, ignored: { mutable: true } };
  const input = { sunLongitudeDeg: -1, moonLongitudeDeg: 361, context };
  const result = calculateLunarElongationSectors(input);
  assert.equal(result.sunLongitudeDeg, 359);
  assert.equal(result.moonLongitudeDeg, 1);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.context));
  assert.notEqual(result.context, context);
  context.zodiac = 'SIDEREAL';
  input.sunLongitudeDeg = 80;
  assert.equal(result.context.zodiac, 'TROPICAL');
  assert.equal(result.sunLongitudeDeg, 359);
  assert.equal(Object.hasOwn(result.context, 'ignored'), false);
});

test('sidereal positions must identify ayanamsa, no hidden defaults', () => {
  const context = { ...TROPICAL, zodiac: 'SIDEREAL', ayanamsaId: 'CUSTOM_V1' };
  const result = run(10, 190, context);
  assert.equal(result.sectorId, 'FULL');
  assert.equal(result.context.ayanamsaId, 'CUSTOM_V1');
  for (const bad of [
    { ...context, ayanamsaId: '' },
    { ...context, ayanamsaId: null },
    { ...TROPICAL, ayanamsaId: 'CUSTOM_V1' },
    { ...TROPICAL, zodiac: 'UNKNOWN' },
    { ...TROPICAL, corrections: 'GEOMETRIC' },
    { ...TROPICAL, frame: 'J2000' },
    { ...TROPICAL, center: 'BARYCENTER' },
  ]) {
    assert.throws(() => run(10, 190, bad), e => e.code === 'INVALID_LUNAR_CONTEXT');
  }
});

test('malformed input and non-finite angles fail closed', () => {
  for (const input of [undefined, null, [], {}, { context: TROPICAL }]) {
    assert.throws(() => calculateLunarElongationSectors(input),
      e => ['INVALID_ARGUMENT', 'INVALID_LUNAR_CONTEXT', 'INVALID_ANGLE'].includes(e.code));
  }
  for (const angle of [Number.NaN, Infinity, -Infinity, '90', null]) {
    assert.throws(() => run(angle, 90), e => e.code === 'INVALID_ANGLE');
    assert.throws(() => run(90, angle), e => e.code === 'INVALID_ANGLE');
  }
});

test('longitude-sector context snapshots caller zodiac accessors once', () => {
  let reads = 0;
  const context = {
    center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
    get zodiac() { reads++; return reads === 1 ? 'TROPICAL' : 'SIDEREAL'; },
  };
  const result = calculateLunarElongationSectors({ sunLongitudeDeg: 15, moonLongitudeDeg: 30, context });
  assert.equal(reads, 1);
  assert.equal(result.context.zodiac, 'TROPICAL');
});

test('every half-sector cusp owns exact ties while its immediate lower float stays behind', () => {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  const nextDown = value => {
    view.setFloat64(0, value, false);
    view.setBigUint64(0, view.getBigUint64(0, false) - 1n, false);
    return view.getFloat64(0, false);
  };
  const nextUp = value => {
    view.setFloat64(0, value, false);
    view.setBigUint64(0, view.getBigUint64(0, false) + 1n, false);
    return view.getFloat64(0, false);
  };

  for (let i = 0; i < 8; i++) {
    const boundary = 22.5 + i * 45;
    const nextSector = (i + 1) % 8;
    const below = run(0, nextDown(boundary));
    const exact = run(0, boundary);
    const above = run(0, nextUp(boundary));

    assert.equal(below.sectorIndex, i, `below ${boundary}°`);
    assert.equal(exact.sectorIndex, nextSector, `exact ${boundary}°`);
    assert.equal(above.sectorIndex, nextSector, `above ${boundary}°`);
    for (const result of [below, exact, above]) {
      assert.ok(result.sectorIndex >= 0 && result.sectorIndex < 8);
      assert.ok(result.sectorId);
      assert.ok(Object.isFrozen(result));
    }
  }

  assert.equal(run(0, 22.499999999999996).sectorId, 'NEW');
  assert.equal(run(0, 22.5).sectorId, 'WAXING_CRESCENT');
  assert.equal(run(0, 337.49999999999994).sectorId, 'WANING_CRESCENT');
  assert.equal(run(0, 337.5).sectorId, 'NEW');
});
