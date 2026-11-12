import type { ZodiacMidpointAxisFacts } from './zodiac-midpoint-axis.mjs';

export interface ZodiacMidpointContactsInput {
  readonly firstLongitudeDeg: number;
  readonly secondLongitudeDeg: number;
  readonly targetLongitudeDeg: number;
  /** Explicit, inclusive conjunction-to-axis orb in [0°, 90°]. */
  readonly maxOrbDeg: number;
}

export interface ZodiacMidpointContactFact {
  readonly longitudeDeg: number;
  readonly separationDeg: number;
  readonly withinOrb: boolean;
}

export interface ZodiacMidpointContactsFacts {
  readonly contract: 'ZodiacMidpointContacts';
  readonly contractVersion: '0.1.0-experimental';
  readonly midpointAxis: Readonly<ZodiacMidpointAxisFacts>;
  readonly targetLongitudeDeg: number;
  readonly maxOrbDeg: number;
  readonly contacts: readonly [Readonly<ZodiacMidpointContactFact>, Readonly<ZodiacMidpointContactFact>];
  readonly matchingAxisLongitudesDeg: readonly number[];
  readonly hasContact: boolean;
  readonly calculationBasis: 'ECLIPTIC_LONGITUDE_GEOMETRY';
  readonly interpretation: 'FACTS_ONLY';
}

export declare function calculateZodiacMidpointContacts(
  input: ZodiacMidpointContactsInput
): Readonly<ZodiacMidpointContactsFacts>;
