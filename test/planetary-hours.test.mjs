import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlanetaryHours, PlanetaryHoursError } from '../src/planetary-hours.mjs';

const sunday = Object.freeze({
  availability: 'AVAILABLE', weekday: 'SUNDAY',
  sunriseUtc: '2026-11-15T06:00:00Z',
  sunsetUtc: '2026-11-15T18:00:00Z',
  nextSunriseUtc: '2026-11-16T06:00:00Z',
});
const errorCode = code => error => error instanceof PlanetaryHoursError && error.code === code;

test('Sunday begins with Sun, has the canonical Chaldean sequence, and follows with Monday Moon', () => {
  const result = buildPlanetaryHours(sunday);
  assert.equal(result.contract, 'PlanetaryHoursSchedule');
  assert.equal(result.availability, 'AVAILABLE');
  assert.equal(result.sunEventsEvidence, 'CALLER_SUPPLIED_NOT_ASTRONOMICALLY_VERIFIED');
  assert.equal(result.dayRuler, 'SUN');
  assert.equal(result.hours.length, 24);
  assert.deepEqual(result.hours.slice(0, 7).map(h => h.ruler),
    ['SUN', 'VENUS', 'MERCURY', 'MOON', 'SATURN', 'JUPITER', 'MARS']);
  assert.equal(result.hours[11].ruler, 'SATURN');
  assert.equal(result.hours[12].ruler, 'JUPITER');
  assert.equal(result.hours[23].ruler, 'MERCURY');
  const monday = buildPlanetaryHours({ ...sunday, weekday: 'MONDAY' });
  assert.equal(monday.dayRuler, 'MOON');
});

test('all seven weekdays map to the correct day ruler', () => {
  const rulers = {
    SUNDAY: 'SUN', MONDAY: 'MOON', TUESDAY: 'MARS',
    WEDNESDAY: 'MERCURY', THURSDAY: 'JUPITER',
    FRIDAY: 'VENUS', SATURDAY: 'SATURN',
  };
  for (const [weekday, ruler] of Object.entries(rulers)) {
    const result = buildPlanetaryHours({ ...sunday, weekday });
    assert.equal(result.hours[0].ruler, ruler);
    assert.equal(result.hours[0].segmentHour, 1);
    assert.equal(result.hours[12].segmentHour, 1);
    assert.equal(result.hours[12].segment, 'NIGHT');
  }
});

test('12 daylight + 12 night hours partition uneven segments without gaps or overlaps', () => {
  const result = buildPlanetaryHours({
    ...sunday,
    sunsetUtc: '2026-11-15T16:20:01.003Z',
    nextSunriseUtc: '2026-11-16T06:00:02.007Z',
  });
  assert.equal(result.hours[0].startUtc, '2026-11-15T06:00:00.000Z');
  assert.equal(result.hours[11].endUtc, '2026-11-15T16:20:01.003Z');
  assert.equal(result.hours[12].startUtc, '2026-11-15T16:20:01.003Z');
  assert.equal(result.hours[23].endUtc, '2026-11-16T06:00:02.007Z');
  for (let i = 0; i < result.hours.length; i += 1) {
    assert.ok(result.hours[i].durationMs > 0);
    if (i > 0) assert.equal(result.hours[i - 1].endUtc, result.hours[i].startUtc);
    assert.equal(Date.parse(result.hours[i].endUtc) - Date.parse(result.hours[i].startUtc),
      result.hours[i].durationMs);
    assert.equal(result.hours[i].number, i + 1);
  }
});

test('normalizes accepted fractional seconds without inventing a timezone', () => {
  const result = buildPlanetaryHours({
    ...sunday, sunriseUtc: '2026-11-15T06:00:00.1Z',
    sunsetUtc: '2026-11-15T18:00:00.12Z',
  });
  assert.equal(result.sunriseUtc, '2026-11-15T06:00:00.100Z');
  assert.equal(result.sunsetUtc, '2026-11-15T18:00:00.120Z');
});

test('polar/unavailable days return no fabricated hours or sun events', () => {
  for (const reason of ['POLAR_DAY', 'POLAR_NIGHT', 'SUN_EVENTS_UNAVAILABLE']) {
    const result = buildPlanetaryHours({ availability: 'UNAVAILABLE', weekday: 'FRIDAY', reason });
    assert.equal(result.availability, 'UNAVAILABLE');
    assert.equal(result.reason, reason);
    assert.equal(result.dayRuler, 'VENUS');
    assert.deepEqual(result.hours, []);
    assert.equal(Object.hasOwn(result, 'sunriseUtc'), false);
  }
});

test('all output containers and hour facts are immutable', () => {
  const result = buildPlanetaryHours(sunday);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.hours));
  assert.ok(result.hours.every(Object.isFrozen));
  assert.throws(() => { result.hours[0].ruler = 'SATURN'; }, TypeError);
  assert.throws(() => { result.hours.push('bad'); }, TypeError);
  assert.ok(Object.isFrozen(buildPlanetaryHours({availability:'UNAVAILABLE',weekday:'SUNDAY',reason:'POLAR_DAY'}).hours));
});

test('rejects invalid unavailable reasons and shape confusion', () => {
  assert.throws(() => buildPlanetaryHours({availability:'UNAVAILABLE',weekday:'SUNDAY',reason:'CLOUDY'}), errorCode('INVALID_REASON'));
  assert.throws(() => buildPlanetaryHours({availability:'UNAVAILABLE',weekday:'SUNDAY',reason:'POLAR_DAY',sunriseUtc:'2026-11-15T06:00:00Z'}), errorCode('INVALID_INPUT'));
  assert.throws(() => buildPlanetaryHours({...sunday,reason:'POLAR_DAY'}), errorCode('INVALID_INPUT'));
  assert.throws(() => buildPlanetaryHours({...sunday,extra:1}), errorCode('INVALID_INPUT'));
});

test('rejects omitted/ambiguous availability and weekday', () => {
  assert.throws(() => buildPlanetaryHours(null), errorCode('INVALID_INPUT'));
  assert.throws(() => buildPlanetaryHours([]), errorCode('INVALID_INPUT'));
  assert.throws(() => buildPlanetaryHours({...sunday,availability:'UNKNOWN'}), errorCode('INVALID_AVAILABILITY'));
  assert.throws(() => buildPlanetaryHours({...sunday,weekday:'Sunday'}), errorCode('INVALID_WEEKDAY'));
  assert.throws(() => buildPlanetaryHours({...sunday,weekday:'__proto__'}), errorCode('INVALID_WEEKDAY'));
});

test('rejects invalid dates, rollover days, offsets, leap seconds and non-finite instants', () => {
  for (const sunriseUtc of [
    '2026-02-30T06:00:00Z', '2026-11-15T24:00:00Z',
    '2026-11-15T06:00:60Z', '2026-11-15T06:00:00+01:00',
    '2026-11-15T06:00Z', '0000-11-15T06:00:00Z',
    '2026-11-15T06:00:00.1234Z', 'bad', null,
  ]) {
    assert.throws(() => buildPlanetaryHours({...sunday,sunriseUtc}), errorCode('INVALID_UTC'));
  }
  assert.ok(buildPlanetaryHours({
    ...sunday, sunriseUtc: '2028-02-29T06:00:00Z',
    sunsetUtc: '2028-02-29T18:00:00Z', nextSunriseUtc: '2028-03-01T06:00:00Z',
  }).hours.length === 24);
});

test('rejects reversed, zero-length, implausibly long, and sub-12ms segments', () => {
  for (const changes of [
    {sunsetUtc:'2026-11-15T06:00:00Z'},
    {sunsetUtc:'2026-11-15T05:59:59Z'},
    {nextSunriseUtc:'2026-11-15T17:00:00Z'},
    {nextSunriseUtc:'2026-11-17T19:00:00Z'},
    {sunsetUtc:'2026-11-15T06:00:00.011Z'},
    {nextSunriseUtc:'2026-11-15T18:00:00.011Z'},
  ]) {
    assert.throws(() => buildPlanetaryHours({...sunday,...changes}), errorCode('INVALID_SUN_EVENTS'));
  }
});

test('captures weekday and event mode once from adversarial getters',()=>{
  let weekdays=0, modes=0, sunrises=0;
  const input={sunsetUtc:'2026-11-15T18:00:00Z',nextSunriseUtc:'2026-11-16T06:00:00Z'};
  Object.defineProperty(input,'availability',{enumerable:true,get(){return ++modes===1?'AVAILABLE':'UNAVAILABLE';}});
  Object.defineProperty(input,'weekday',{enumerable:true,get(){return ++weekdays===1?'SUNDAY':'MONDAY';}});
  Object.defineProperty(input,'sunriseUtc',{enumerable:true,get(){return ++sunrises===1?'2026-11-15T06:00:00Z':'BAD';}});
  const out=buildPlanetaryHours(input);
  assert.equal(out.availability,'AVAILABLE');assert.equal(out.weekday,'SUNDAY');
  assert.equal(out.dayRuler,'SUN');assert.equal(out.hours[0].ruler,'SUN');
  assert.equal(weekdays,1);assert.equal(modes,1);assert.equal(sunrises,1);
});
