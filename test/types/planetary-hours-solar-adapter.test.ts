import {
  preparePlanetaryHoursFromSolarEvents,
  SolarEventAdapterError,
} from '../../src/planetary-hours-solar-adapter.mjs';
import type {
  SolarEventAdapterInput,
  SolarEventSnapshot,
  PlanetaryHoursSolarAdapterResult,
} from '../../src/planetary-hours-solar-adapter.mjs';

const input: SolarEventAdapterInput = {
  weekday: 'SUNDAY',
  observer: {latitudeDeg: 45, longitudeDegEast: 12, elevationMeters: 100},
  model: {
    horizonDefinitionId: 'SOLAR_UPPER_LIMB',
    refractionModelId: 'NONE',
    eventAlgorithmId: 'SYNTHETIC_TEST',
  },
  source: {
    engineId: 'VIRGOSTARS_EPHEMERIS',
    engineVersion: '0.0.0-test',
    kernelSetId: 'SYNTHETIC',
    timeModelId: 'UTC_SYNTHETIC',
    evidence: 'CALLER_ASSERTED_NOT_VERIFIED',
  },
  events: {
    availability: 'AVAILABLE', sunriseUtc: '2026-11-15T06:00:00Z',
    sunsetUtc: '2026-11-15T18:00:00Z', nextSunriseUtc: '2026-11-16T06:00:00Z',
  },
};

const result: PlanetaryHoursSolarAdapterResult = preparePlanetaryHoursFromSolarEvents(input);
const latitude: number = result.observer.latitudeDeg;
const source: string = result.source.engineVersion;
const code: string = new SolarEventAdapterError('INVALID_SOURCE','invalid').code;
void latitude; void source; void code;

if (result.schedule.availability === 'AVAILABLE') {
  const time: string = result.schedule.sunriseUtc;
  void time;
} else {
  const reason: string = result.schedule.reason;
  void reason;
}

// @ts-expect-error readonly input observer
input.observer.latitudeDeg = 0;
// @ts-expect-error output is immutable
result.model.refractionModelId = 'UNSPECIFIED';
// @ts-expect-error engine ID is restricted to future VirgoStars producer
preparePlanetaryHoursFromSolarEvents({...input, source: {...input.source, engineId: 'SWISS'}});
// @ts-expect-error status AVAILABLE requires complete time instants
const malformed: SolarEventSnapshot = {availability: 'AVAILABLE',sunriseUtc:'2026-11-15T06:00:00Z'};
void malformed;
// @ts-expect-error unavailable status forbids inventing times
const invalidPolar: SolarEventSnapshot = {availability: 'UNAVAILABLE',reason:'POLAR_DAY',sunriseUtc:'2026-11-15T06:00:00Z'};
void invalidPolar;
// @ts-expect-error source must explicitly label unverified status
preparePlanetaryHoursFromSolarEvents({...input, source: {...input.source, evidence: 'VALIDATED'}});
