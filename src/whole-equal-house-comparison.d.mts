import type { LongitudeBasis } from './whole-sign-house-cusps.mjs';
import type {
  HouseMethodComparisonResult,
} from './house-method-comparison.mjs';

/**
 * Composes already-declared zodiac geometry only.
 * Caller guarantees the Ascendant and supplied points share the same basis.
 */
export interface WholeEqualComparisonInput {
  readonly ascendantLongitudeDeg: number;
  readonly birthTimeKnown: true;
  readonly datetimeUtc: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: LongitudeBasis;
  readonly points: readonly Readonly<{ id: string; longitudeDeg: number }>[];
}

/** Original comparison status remains caller-asserted, not scientifically verified. */
export declare function compareWholeSignAndEqualFromAscendant(
  input: WholeEqualComparisonInput,
): Readonly<HouseMethodComparisonResult>;
