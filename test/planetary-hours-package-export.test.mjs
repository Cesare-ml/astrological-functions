import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlanetaryHours, lookupPlanetaryHour } from 'astrological-functions/planetary-hours';
import { preparePlanetaryHoursFromSolarEvents } from 'astrological-functions/planetary-hours-solar-adapter';

test('consumer-accessible planetary-hours subpath preserves Chaldean unequal hours', () => {
  const schedule = buildPlanetaryHours({
    availability:'AVAILABLE', weekday:'SUNDAY',
    sunriseUtc:'2024-01-07T06:00:00.000Z',
    sunsetUtc:'2024-01-07T18:00:00.000Z',
    nextSunriseUtc:'2024-01-08T06:00:00.000Z',
  });
  assert.equal(schedule.hours.length,24);
  assert.equal(schedule.hours[0].ruler,'SUN');
  assert.equal(schedule.sunEventsEvidence,'CALLER_SUPPLIED_NOT_ASTRONOMICALLY_VERIFIED');
  assert.equal(lookupPlanetaryHour({schedule,instantUtc:'2024-01-07T06:30:00.000Z'}).hour.ruler,'SUN');
  assert.equal(lookupPlanetaryHour({schedule,instantUtc:'2024-01-08T06:00:00.000Z'}).status,'OUTSIDE_SCHEDULE');
});

test('consumer-accessible solar adapter remains a caller-asserted source handshake', () => {
  const result = preparePlanetaryHoursFromSolarEvents({
    weekday:'SUNDAY',
    observer:{latitudeDeg:41.9, longitudeDegEast:12.5, elevationMeters:20},
    model:{horizonDefinitionId:'USNO_MINUS_50_ARCMIN', refractionModelId:'STANDARD', eventAlgorithmId:'EXPERIMENTAL'},
    source:{engineId:'VIRGOSTARS_EPHEMERIS',engineVersion:'0.1.0',kernelSetId:'TEST_ONLY',timeModelId:'EXPLICIT_UT1_TT_TDB',evidence:'CALLER_ASSERTED_NOT_VERIFIED'},
    events:{availability:'AVAILABLE',sunriseUtc:'2024-01-07T06:00:00.000Z',sunsetUtc:'2024-01-07T18:00:00.000Z',nextSunriseUtc:'2024-01-08T06:00:00.000Z'},
  });
  assert.equal(result.contract,'PlanetaryHoursSolarAdapter');
  assert.equal(result.scientificEvidence,'CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED');
  assert.equal(result.schedule.hours.length,24);
});
