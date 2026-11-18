import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlanetaryHours, lookupPlanetaryHour } from 'astrological-functions/planetary-hours';

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
