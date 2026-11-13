import type { LongitudeBasis } from './whole-sign-house-cusps.mjs';
import type {
  DeclaredHouseSource, PinnedHouseComparisonResult,
} from './house-source-consistency.mjs';

/**
 * All angles and positions must already be in longitudeBasis.
 * Sources are independently caller-declared, never inferred from each other.
 */
export interface PinnedWholeEqualInput {
  readonly birthTimeKnown: true;
  readonly ascendantLongitudeDeg: number;
  readonly datetimeUtc: string;
  readonly frame: 'ECLIPTIC_OF_DATE';
  readonly longitudeBasis: LongitudeBasis;
  readonly points: readonly Readonly<{ id: string; longitudeDeg: number }>[];
  readonly wholeSignSource: Readonly<DeclaredHouseSource>;
  readonly equalAscendantSource: Readonly<DeclaredHouseSource>;
}

/** Returns the existing experimental pinned comparison contract, not a verification certificate. */
export declare function compareWholeSignEqualWithPinnedSources(
  input: PinnedWholeEqualInput,
): Readonly<PinnedHouseComparisonResult>;
