import { buildPlanetaryHours, PlanetaryHoursError } from '../../src/planetary-hours.mjs';
import type { PlanetaryHoursInput, PlanetaryHoursResult, PlanetaryHour } from '../../src/planetary-hours.mjs';

const available: PlanetaryHoursInput = {
  availability: 'AVAILABLE', weekday: 'SUNDAY',
  sunriseUtc: '2026-11-15T06:00:00Z',
  sunsetUtc: '2026-11-15T18:00:00Z',
  nextSunriseUtc: '2026-11-16T06:00:00Z',
};
const unavailable: PlanetaryHoursInput = {
  availability: 'UNAVAILABLE', weekday: 'SATURDAY', reason: 'POLAR_NIGHT',
};
const result: PlanetaryHoursResult = buildPlanetaryHours(available);
const fallback: PlanetaryHoursResult = buildPlanetaryHours(unavailable);
const ruler: string = result.dayRuler;
const errorCode: string = new PlanetaryHoursError('INVALID_UTC','bad').code;
void ruler; void errorCode;
if (result.availability === 'AVAILABLE') {
  const atSunset: string = result.sunsetUtc;
  const first: PlanetaryHour | undefined = result.hours[0];
  void atSunset; void first;
  // @ts-expect-error available result has no reason
  void result.reason;
} else {
  const reason: string = result.reason;
  void reason;
  // @ts-expect-error unavailable result has no sunrise
  void result.sunriseUtc;
}
if (fallback.availability === 'UNAVAILABLE') {
  const reason: string = fallback.reason;
  void reason;
}
// @ts-expect-error readonly hour list
result.hours.push({});
// @ts-expect-error incorrect weekday
buildPlanetaryHours({...available, weekday:'MON'});
// @ts-expect-error available input needs all 3 sun event instants
buildPlanetaryHours({availability:'AVAILABLE',weekday:'SUNDAY',sunriseUtc:'2026-11-15T06:00:00Z'});
// @ts-expect-error unsupported reason
buildPlanetaryHours({availability:'UNAVAILABLE',weekday:'MONDAY',reason:'CLOUDY'});
