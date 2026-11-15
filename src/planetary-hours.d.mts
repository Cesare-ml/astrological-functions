/** Caller-owned local civil weekday at sunrise (never inferred from UTC). */
export type PlanetaryWeekday =
  | 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY'
  | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
export type ChaldeanRuler =
  | 'SUN' | 'MOON' | 'MARS' | 'MERCURY' | 'JUPITER' | 'VENUS' | 'SATURN';
export type UnavailableSunEventReason = 'POLAR_DAY' | 'POLAR_NIGHT' | 'SUN_EVENTS_UNAVAILABLE';

export type PlanetaryHoursInput =
  | Readonly<{
      availability: 'AVAILABLE';
      weekday: PlanetaryWeekday;
      sunriseUtc: string;
      sunsetUtc: string;
      nextSunriseUtc: string;
    }>
  | Readonly<{
      availability: 'UNAVAILABLE';
      weekday: PlanetaryWeekday;
      reason: UnavailableSunEventReason;
    }>;

export type PlanetaryHour = Readonly<{
  number: number;
  segment: 'DAY' | 'NIGHT';
  segmentHour: number;
  ruler: ChaldeanRuler;
  startUtc: string;
  endUtc: string;
  durationMs: number;
}>;

type PlanetaryHoursMetadata = Readonly<{
  contract: 'PlanetaryHoursSchedule';
  contractVersion: '0.1.0-experimental';
  method: 'CHALDEAN_UNEQUAL_HOURS';
  sunEventsEvidence: 'CALLER_SUPPLIED_NOT_ASTRONOMICALLY_VERIFIED';
  weekday: PlanetaryWeekday;
  dayRuler: ChaldeanRuler;
  hours: readonly PlanetaryHour[];
}>;

export type PlanetaryHoursResult =
  | (PlanetaryHoursMetadata & Readonly<{
      availability: 'AVAILABLE';
      sunriseUtc: string;
      sunsetUtc: string;
      nextSunriseUtc: string;
    }>)
  | (PlanetaryHoursMetadata & Readonly<{
      availability: 'UNAVAILABLE';
      reason: UnavailableSunEventReason;
    }>);

export class PlanetaryHoursError extends Error {
  readonly code:
    | 'INVALID_INPUT' | 'INVALID_AVAILABILITY' | 'INVALID_WEEKDAY'
    | 'INVALID_UTC' | 'INVALID_SUN_EVENTS' | 'INVALID_REASON' | 'INVALID_SCHEDULE';
  constructor(code: PlanetaryHoursError['code'], message: string);
}

export function buildPlanetaryHours(input: PlanetaryHoursInput): PlanetaryHoursResult;

/** Lookup only within one caller-supplied sunrise→next-sunrise schedule. */
export type PlanetaryHourLookupInput = Readonly<{
  schedule: PlanetaryHoursResult;
  instantUtc: string;
}>;

type PlanetaryHourLookupMetadata = Readonly<{
  contract: 'PlanetaryHourLookup';
  contractVersion: '0.1.0-experimental';
  instantUtc: string;
  sunEventsEvidence: 'CALLER_SUPPLIED_NOT_ASTRONOMICALLY_VERIFIED';
}>;

export type PlanetaryHourLookupResult =
  | (PlanetaryHourLookupMetadata & Readonly<{
      status: 'FOUND';
      hour: PlanetaryHour;
      elapsedMs: number;
      remainingMs: number;
    }>)
  | (PlanetaryHourLookupMetadata & Readonly<{
      status: 'OUTSIDE_SCHEDULE';
      hour: null;
    }>)
  | (PlanetaryHourLookupMetadata & Readonly<{
      status: 'UNAVAILABLE';
      reason: UnavailableSunEventReason;
      hour: null;
    }>);

export function lookupPlanetaryHour(input: PlanetaryHourLookupInput): PlanetaryHourLookupResult;
