import { buildPlanetaryHours, lookupPlanetaryHour } from '../../src/planetary-hours.mjs';
import type {
  PlanetaryHourLookupInput, PlanetaryHourLookupResult, PlanetaryHoursResult,
  PlanetaryHour,
} from '../../src/planetary-hours.mjs';

const schedule: PlanetaryHoursResult = buildPlanetaryHours({
  availability: 'AVAILABLE', weekday: 'SUNDAY',
  sunriseUtc: '2026-11-15T06:00:00Z',
  sunsetUtc: '2026-11-15T18:00:00Z',
  nextSunriseUtc: '2026-11-16T06:00:00Z',
});
const input: PlanetaryHourLookupInput = { schedule, instantUtc: '2026-11-15T07:00:00Z' };
const result: PlanetaryHourLookupResult = lookupPlanetaryHour(input);

if (result.status === 'FOUND') {
  const ruler: string = result.hour.ruler;
  const ms: number = result.remainingMs;
  const hour: PlanetaryHour = result.hour;
  void ruler; void ms; void hour;
  // @ts-expect-error a found lookup has no unavailability reason
  void result.reason;
} else if (result.status === 'UNAVAILABLE') {
  const reason: string = result.reason;
  const hour: null = result.hour;
  void reason; void hour;
  // @ts-expect-error unavailable lookup has no elapsed milliseconds
  void result.elapsedMs;
} else {
  const absent: null = result.hour;
  void absent;
  // @ts-expect-error outside lookup has no remaining milliseconds
  void result.remainingMs;
}

// @ts-expect-error schedules are readonly
schedule.hours.push(schedule.hours[0]);
// @ts-expect-error lookup input requires a UTC instant
lookupPlanetaryHour({schedule});
// @ts-expect-error lookup instant must be a string
lookupPlanetaryHour({schedule,instantUtc:Date.now()});
