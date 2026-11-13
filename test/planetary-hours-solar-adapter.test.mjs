import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePlanetaryHoursFromSolarEvents, SolarEventAdapterError } from '../src/planetary-hours-solar-adapter.mjs';
import { PlanetaryHoursError, lookupPlanetaryHour } from '../src/planetary-hours.mjs';

const example = {
  weekday: 'SUNDAY',
  observer: { latitudeDeg: 44.8, longitudeDegEast: 11.9, elevationMeters: 12 },
  model: {
    horizonDefinitionId: 'GEOMETRIC_CENTER_MINUS_0_833',
    refractionModelId: 'NONE',
    eventAlgorithmId: 'SYNTHETIC_TEST_ONLY',
  },
  source: {
    engineId: 'VIRGOSTARS_EPHEMERIS',
    engineVersion: '0.0.0-test',
    kernelSetId: 'SYNTHETIC',
    timeModelId: 'UTC_SYNTHETIC',
    evidence: 'CALLER_ASSERTED_NOT_VERIFIED',
  },
  events: {
    availability: 'AVAILABLE',
    sunriseUtc: '2026-11-15T06:00:00Z',
    sunsetUtc: '2026-11-15T18:00:00Z',
    nextSunriseUtc: '2026-11-16T06:00:00Z',
  },
};
const expectAdapterError = code => error =>
  error instanceof SolarEventAdapterError && error.code === code;
const expectScheduleError = code => error =>
  error instanceof PlanetaryHoursError && error.code === code;

test('explicit synthetic snapshot yields 24 planetary hours without any astronomical claims', () => {
  const result = preparePlanetaryHoursFromSolarEvents(example);
  assert.equal(result.contract, 'PlanetaryHoursSolarAdapter');
  assert.equal(result.scientificEvidence, 'CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED');
  assert.equal(result.schedule.sunEventsEvidence, 'CALLER_SUPPLIED_NOT_ASTRONOMICALLY_VERIFIED');
  assert.equal(result.schedule.hours.length, 24);
  assert.equal(result.schedule.hours[0].ruler, 'SUN');
  assert.equal(result.schedule.hours[12].ruler, 'JUPITER');
  assert.equal(lookupPlanetaryHour({
    schedule: result.schedule, instantUtc: result.events?.sunsetUtc ?? example.events.sunsetUtc,
  }).hour.number, 13);
});

test('observer and source snapshots are detached and recursively immutable', () => {
  const original = structuredClone(example);
  const result = preparePlanetaryHoursFromSolarEvents(original);
  original.observer.latitudeDeg = 0;
  original.model.horizonDefinitionId = 'CHANGED';
  original.source.kernelSetId = 'CHANGED';
  original.events.sunriseUtc = 'CHANGED';
  assert.equal(result.observer.latitudeDeg, 44.8);
  assert.equal(result.model.horizonDefinitionId, 'GEOMETRIC_CENTER_MINUS_0_833');
  assert.equal(result.source.kernelSetId, 'SYNTHETIC');
  assert.equal(result.schedule.sunriseUtc, '2026-11-15T06:00:00.000Z');
  for (const part of [result, result.observer, result.model, result.source, result.schedule, result.schedule.hours]) {
    assert.ok(Object.isFrozen(part));
  }
  assert.throws(() => { result.observer.latitudeDeg = 7; }, TypeError);
});

test('unavailable polar events are explicitly represented without invented times', () => {
  for (const reason of ['POLAR_DAY', 'POLAR_NIGHT', 'SUN_EVENTS_UNAVAILABLE']) {
    const result = preparePlanetaryHoursFromSolarEvents({
      ...example, events: {availability: 'UNAVAILABLE', reason},
    });
    assert.equal(result.schedule.availability, 'UNAVAILABLE');
    assert.equal(result.schedule.reason, reason);
    assert.deepEqual(result.schedule.hours, []);
    assert.equal(Object.hasOwn(result.schedule, 'sunriseUtc'), false);
  }
});

test('boundary observer coordinates remain valid, out-of-range values reject', () => {
  for (const observer of [
    {latitudeDeg: -90, longitudeDegEast: -180, elevationMeters: -500},
    {latitudeDeg: 90, longitudeDegEast: 180, elevationMeters: 10000},
  ]) {
    assert.ok(preparePlanetaryHoursFromSolarEvents({...example, observer}).schedule.hours.length);
  }
  for (const observer of [
    {...example.observer, latitudeDeg: 90.0001},
    {...example.observer, longitudeDegEast: 181},
    {...example.observer, elevationMeters: 10001},
    {...example.observer, elevationMeters: Infinity},
    {...example.observer, latitudeDeg: NaN},
    {...example.observer, longitudeDegEast: '11.9'},
    {...example.observer, extra: 1},
    {latitudeDeg: 40},
  ]) {
    assert.throws(() => preparePlanetaryHoursFromSolarEvents({...example, observer}),
      expectAdapterError('INVALID_OBSERVER'));
  }
});

test('source cannot claim verified evidence or silently switch engines', () => {
  for (const source of [
    {...example.source, evidence: 'SCIENTIFICALLY_VERIFIED'},
    {...example.source, evidence: null},
    {...example.source, engineId: 'SWISS'},
    {...example.source, kernelSetId: ''},
    {...example.source, engineVersion: ' '},
    {...example.source, kernelSetId: 'invalid path/name'},
    {...example.source, timeModelId: 'A'.repeat(129)},
    {...example.source, secretToken: 'should reject'},
    {engineId: 'VIRGOSTARS_EPHEMERIS'},
  ]) {
    assert.throws(() => preparePlanetaryHoursFromSolarEvents({...example, source}),
      expectAdapterError('INVALID_SOURCE'));
  }
});

test('explicit event model is required and identifier fields must be bounded', () => {
  for (const model of [
    {...example.model, refractionModelId: null},
    {...example.model, horizonDefinitionId: ''},
    {...example.model, eventAlgorithmId: '../private'},
    {...example.model, newDefault: 'IMPLICIT'},
    {refractionModelId: 'NONE'},
  ]) {
    assert.throws(() => preparePlanetaryHoursFromSolarEvents({...example, model}),
      expectAdapterError('INVALID_MODEL'));
  }
});

test('rejects incomplete/extra/mismatched event variants before any scheduling', () => {
  for (const events of [
    {availability: 'AVAILABLE', sunriseUtc: example.events.sunriseUtc},
    {...example.events, reason: 'POLAR_NIGHT'},
    {availability: 'UNAVAILABLE', reason: 'POLAR_DAY', sunriseUtc: example.events.sunriseUtc},
    {availability: 'PARTIAL'},
    null,
  ]) {
    assert.throws(() => preparePlanetaryHoursFromSolarEvents({...example, events}),
      expectAdapterError('INVALID_EVENTS'));
  }
});

test('preserves builder errors for malformed UTC and invalid sunrise ordering', () => {
  assert.throws(() => preparePlanetaryHoursFromSolarEvents({
    ...example, events: {...example.events, sunriseUtc: '2026-02-30T06:00:00Z'},
  }), expectScheduleError('INVALID_UTC'));
  assert.throws(() => preparePlanetaryHoursFromSolarEvents({
    ...example, events: {...example.events, sunsetUtc: '2026-11-15T05:00:00Z'},
  }), expectScheduleError('INVALID_SUN_EVENTS'));
  assert.throws(() => preparePlanetaryHoursFromSolarEvents({
    ...example, weekday: 'UNKNOWN',
  }), expectScheduleError('INVALID_WEEKDAY'));
});

test('top-level object must be exact and owned without application prototype', () => {
  assert.throws(() => preparePlanetaryHoursFromSolarEvents(null),
    expectAdapterError('INVALID_INPUT'));
  assert.throws(() => preparePlanetaryHoursFromSolarEvents({
    ...example, accountId: 'private',
  }), expectAdapterError('INVALID_INPUT'));
  const inherited = Object.create(example);
  assert.throws(() => preparePlanetaryHoursFromSolarEvents(inherited),
    expectAdapterError('INVALID_INPUT'));
  const modelPrototype = Object.create(example.model);
  assert.throws(() => preparePlanetaryHoursFromSolarEvents({
    ...example, model: modelPrototype,
  }), expectAdapterError('INVALID_MODEL'));
});

test('the adapter never infers day of week from UTC instant or location', () => {
  const result = preparePlanetaryHoursFromSolarEvents({...example, weekday:'FRIDAY'});
  assert.equal(result.weekday, 'FRIDAY');
  assert.equal(result.schedule.dayRuler, 'VENUS');
  assert.equal(result.schedule.hours[0].ruler, 'VENUS');
  assert.equal(result.scientificEvidence, 'CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED');
});
