import type {
  PlanetaryWeekday,
  UnavailableSunEventReason,
  PlanetaryHoursResult,
} from './planetary-hours.mjs';

export type SolarEventObserver = Readonly<{
  latitudeDeg: number;
  longitudeDegEast: number;
  elevationMeters: number;
}>;

export type SolarEventModel = Readonly<{
  /** Caller-supplied identifier of the solar limb / horizon convention. */
  horizonDefinitionId: string;
  /** Explicit refraction convention, such as NONE. */
  refractionModelId: string;
  /** Algorithm identifier asserted by the producing caller, not authenticated. */
  eventAlgorithmId: string;
}>;

export type SolarEventSource = Readonly<{
  engineId: 'VIRGOSTARS_EPHEMERIS';
  engineVersion: string;
  kernelSetId: string;
  timeModelId: string;
  evidence: 'CALLER_ASSERTED_NOT_VERIFIED';
}>;

export type SolarEventSnapshot =
  | Readonly<{
      availability: 'AVAILABLE';
      sunriseUtc: string;
      sunsetUtc: string;
      nextSunriseUtc: string;
    }>
  | Readonly<{
      availability: 'UNAVAILABLE';
      reason: UnavailableSunEventReason;
    }>;

export type SolarEventAdapterInput = Readonly<{
  weekday: PlanetaryWeekday;
  observer: SolarEventObserver;
  model: SolarEventModel;
  source: SolarEventSource;
  events: SolarEventSnapshot;
}>;

export type PlanetaryHoursSolarAdapterResult = Readonly<{
  contract: 'PlanetaryHoursSolarAdapter';
  contractVersion: '0.1.0-experimental';
  scientificEvidence: 'CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED';
  weekday: PlanetaryWeekday;
  observer: SolarEventObserver;
  model: SolarEventModel;
  source: SolarEventSource;
  schedule: PlanetaryHoursResult;
}>;

export class SolarEventAdapterError extends Error {
  readonly code:
    | 'INVALID_INPUT'
    | 'INVALID_OBSERVER'
    | 'INVALID_MODEL'
    | 'INVALID_SOURCE'
    | 'INVALID_EVENTS';
  constructor(code: SolarEventAdapterError['code'], message: string);
}

export function preparePlanetaryHoursFromSolarEvents(
  input: SolarEventAdapterInput,
): PlanetaryHoursSolarAdapterResult;
