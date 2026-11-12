import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlanetaryHours, lookupPlanetaryHour, PlanetaryHoursError } from '../src/planetary-hours.mjs';

const sunday = {
  availability: 'AVAILABLE', weekday: 'SUNDAY',
  sunriseUtc: '2026-11-15T06:00:00Z',
  sunsetUtc: '2026-11-15T18:00:00Z',
  nextSunriseUtc: '2026-11-16T06:00:00Z',
};
const schedule = buildPlanetaryHours(sunday);
const expectCode = code => error => error instanceof PlanetaryHoursError && error.code === code;
const at = (instantUtc, current = schedule) =>
  lookupPlanetaryHour({schedule: current, instantUtc});

test('at sunrise hour #1 is Sun, with full remaining duration', () => {
  const result = at('2026-11-15T06:00:00Z');
  assert.equal(result.contract, 'PlanetaryHourLookup');
  assert.equal(result.status, 'FOUND');
  assert.equal(result.hour.number, 1);
  assert.equal(result.hour.ruler, 'SUN');
  assert.equal(result.hour.segment, 'DAY');
  assert.equal(result.elapsedMs, 0);
  assert.equal(result.remainingMs, 3600000);
});

test('the half-open boundary belongs to the NEXT hour, not the previous one', () => {
  const before = at('2026-11-15T06:59:59.999Z');
  assert.equal(before.hour.number, 1);
  assert.equal(before.remainingMs, 1);
  const exact = at('2026-11-15T07:00:00Z');
  assert.equal(exact.hour.number, 2);
  assert.equal(exact.hour.ruler, 'VENUS');
  assert.equal(exact.elapsedMs, 0);
});

test('exact sunset selects first night hour; last millisecond selects last night hour', () => {
  const sunset = at('2026-11-15T18:00:00Z');
  assert.equal(sunset.hour.number, 13);
  assert.equal(sunset.hour.segment, 'NIGHT');
  assert.equal(sunset.hour.ruler, 'JUPITER');
  const last = at('2026-11-16T05:59:59.999Z');
  assert.equal(last.hour.number, 24);
  assert.equal(last.remainingMs, 1);
});

test('schedule edges are outside with no implicit next-day rollover', () => {
  for (const instantUtc of [
    '2026-11-15T05:59:59.999Z',
    '2026-11-16T06:00:00Z',
    '2026-11-17T06:00:00Z',
  ]) {
    const result = at(instantUtc);
    assert.equal(result.status, 'OUTSIDE_SCHEDULE');
    assert.equal(result.hour, null);
    assert.equal(Object.hasOwn(result, 'elapsedMs'), false);
  }
});

test('supports JSON-round-tripped schedules, with reordered object property keys', () => {
  const detached = JSON.parse(JSON.stringify(schedule));
  const reordered = Object.fromEntries(Object.entries(detached).reverse());
  reordered.hours = detached.hours.map(h => Object.fromEntries(Object.entries(h).reverse()));
  const result = at('2026-11-15T12:00:00Z', reordered);
  assert.equal(result.status, 'FOUND');
  assert.equal(result.hour.number, 7);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.hour));
  assert.equal(result.sunEventsEvidence, 'CALLER_SUPPLIED_NOT_ASTRONOMICALLY_VERIFIED');
});

test('unavailable polar schedules return explicit absence, not a fabricated hour', () => {
  const polar = buildPlanetaryHours({
    availability: 'UNAVAILABLE', weekday: 'SUNDAY', reason: 'POLAR_NIGHT',
  });
  const result = at('2026-11-15T18:00:00Z', polar);
  assert.equal(result.status, 'UNAVAILABLE');
  assert.equal(result.reason, 'POLAR_NIGHT');
  assert.equal(result.hour, null);
  assert.equal(Object.hasOwn(result, 'remainingMs'), false);
});

test('fails closed on any changed canonical hour or misleading metadata', () => {
  const corrupt = JSON.parse(JSON.stringify(schedule));
  corrupt.hours[0].ruler = 'SATURN';
  assert.throws(() => at('2026-11-15T06:00:00Z', corrupt), expectCode('INVALID_SCHEDULE'));
  const wrongVersion = {...schedule, contractVersion: '1.0.0'};
  assert.throws(() => at('2026-11-15T06:00:00Z', wrongVersion), expectCode('INVALID_SCHEDULE'));
  const extraField = {...schedule, guessedSolarModel: 'official'};
  assert.throws(() => at('2026-11-15T06:00:00Z', extraField), expectCode('INVALID_SCHEDULE'));
});

test('rejects mismatched sunrise/sunset, wrong availability and missing schedule', () => {
  const changed = {...schedule, sunsetUtc: '2026-11-15T17:00:00.000Z'};
  assert.throws(() => at('2026-11-15T10:00:00Z', changed), expectCode('INVALID_SCHEDULE'));
  assert.throws(() => at('2026-11-15T10:00:00Z', null), expectCode('INVALID_SCHEDULE'));
  assert.throws(() => at('2026-11-15T10:00:00Z', {}), expectCode('INVALID_SCHEDULE'));
});

test('rejects malformed UTC and additional or missing lookup arguments', () => {
  assert.throws(() => at('2026-11-15T12:00:00+01:00'), expectCode('INVALID_UTC'));
  assert.throws(() => at('2026-02-30T12:00:00Z'), expectCode('INVALID_UTC'));
  assert.throws(() => lookupPlanetaryHour({ schedule }), expectCode('INVALID_UTC'));
  assert.throws(() => lookupPlanetaryHour({ schedule, instantUtc: '2026-11-15T12:00:00Z', timezone: 'UTC' }), expectCode('INVALID_INPUT'));
  assert.throws(() => lookupPlanetaryHour([]), expectCode('INVALID_INPUT'));
});

test('uneven day/night schedule keeps millisecond exactness', () => {
  const unequal = buildPlanetaryHours({
    ...sunday,
    sunsetUtc: '2026-11-15T16:20:01.003Z',
    nextSunriseUtc: '2026-11-16T06:00:02.007Z',
  });
  const sunset = at(unequal.sunsetUtc, unequal);
  const justBefore = at('2026-11-15T16:20:01.002Z', unequal);
  assert.equal(justBefore.hour.number, 12);
  assert.equal(justBefore.remainingMs, 1);
  assert.equal(sunset.hour.number, 13);
  assert.equal(sunset.elapsedMs, 0);
  assert.equal(sunset.hour.durationMs + sunset.remainingMs > 0, true);
});
