import type { ZodiacMidpointAxisFacts } from './zodiac-midpoint-axis.mjs';
import type { ZodiacMidpointContactFact } from './zodiac-midpoint-contact.mjs';

export interface ZodiacMidpointTargetPoint {
  readonly name: string;
  readonly longitudeDeg: number;
}
export interface ZodiacMidpointTargetSweepInput {
  readonly firstLongitudeDeg: number;
  readonly secondLongitudeDeg: number;
  readonly targetPoints: readonly ZodiacMidpointTargetPoint[];
  /** Explicit inclusive conjunction-to-axis orb, from 0 to 90 degrees. */
  readonly maxOrbDeg: number;
}
export interface ZodiacMidpointTargetResult {
  readonly name: string;
  readonly longitudeDeg: number;
  readonly contacts: readonly [Readonly<ZodiacMidpointContactFact>, Readonly<ZodiacMidpointContactFact>];
  readonly matchingAxisLongitudesDeg: readonly number[];
  readonly nearestAxisSeparationDeg: number;
  readonly hasContact: boolean;
}
export interface ZodiacMidpointTargetSweepFacts {
  readonly contract:'ZodiacMidpointTargetSweep';
  readonly contractVersion:'0.1.0-experimental';
  readonly midpointAxis:Readonly<ZodiacMidpointAxisFacts>;
  readonly maxOrbDeg:number;
  readonly targets:readonly Readonly<ZodiacMidpointTargetResult>[];
  readonly matchedTargetNames:readonly string[];
  readonly targetCount:number;
  readonly matchCount:number;
  readonly hasContact:boolean;
  readonly calculationBasis:'ECLIPTIC_LONGITUDE_GEOMETRY';
  readonly interpretation:'FACTS_ONLY';
}
export declare function calculateZodiacMidpointTargetSweep(
  input:ZodiacMidpointTargetSweepInput,
):Readonly<ZodiacMidpointTargetSweepFacts>;
