/** Geometry-only sectors; not illumination, astronomical phase timestamps or synodic D1/R2/R3/D4. */
export type LunarSectorId =
  | 'NEW' | 'WAXING_CRESCENT' | 'FIRST_QUARTER' | 'WAXING_GIBBOUS'
  | 'FULL' | 'WANING_GIBBOUS' | 'LAST_QUARTER' | 'WANING_CRESCENT';

export type LunarLongitudeContext =
  | Readonly<{
      center: 'EARTH';
      frame: 'ECLIPTIC_OF_DATE';
      corrections: 'APPARENT';
      zodiac: 'TROPICAL';
      ayanamsaId?: never;
    }>
  | Readonly<{
      center: 'EARTH';
      frame: 'ECLIPTIC_OF_DATE';
      corrections: 'APPARENT';
      zodiac: 'SIDEREAL';
      ayanamsaId: string;
    }>;

export interface LunarElongationInput {
  /** Both positions must refer to the same instant and identical coordinate convention. */
  readonly sunLongitudeDeg: number;
  readonly moonLongitudeDeg: number;
  readonly context: LunarLongitudeContext;
}

export interface LunarElongationSectors {
  readonly contract: 'LunarElongationSectors';
  readonly contractVersion: '0.1.0-experimental';
  readonly method: 'DIRECTED_LONGITUDE_EIGHT_SECTORS';
  readonly context: LunarLongitudeContext;
  readonly sunLongitudeDeg: number;
  readonly moonLongitudeDeg: number;
  /** Moon minus Sun, normalized to [0, 360). */
  readonly directedElongationDeg: number;
  readonly sectorIndex: number;
  readonly sectorId: LunarSectorId;
  readonly sectorCenterDeg: number;
  /** Signed shortest deviation from the sector's central longitude. */
  readonly signedDistanceFromSectorCenterDeg: number;
}

export declare function calculateLunarElongationSectors(
  input: LunarElongationInput,
): Readonly<LunarElongationSectors>;
