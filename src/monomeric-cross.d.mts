export type TraditionalPlanet = 'SUN' | 'MOON' | 'MERCURY' | 'VENUS' | 'MARS' | 'JUPITER' | 'SATURN';
export type MonomericCrossRole = 'master' | 'square-left' | 'square-right' | 'opposite';
export type MonomericCrossInput = Readonly<{
  hourRuler: TraditionalPlanet;
  planetLongitudesDeg: Record<TraditionalPlanet, number>;
  houseCuspsDeg: readonly number[];
  houseSystemId: string;
}>;
export type MonomericCrossArm = Readonly<{
  role: MonomericCrossRole;
  offsetDeg: number;
  longitudeDeg: number;
  signIndex: number;
  degreeWithinSign: number;
  /** Coordinate for display; must not be used as an unverified historical catalog ordinal. */
  geometricDegreeIndex: number;
  house: number;
  signRuler: TraditionalPlanet;
  rulerLongitudeDeg: number;
  rulerHouse: number;
}>;
export type MonomericCrossGeometry = Readonly<{
  contract: 'MonomericCrossGeometry';
  contractVersion: '1.0.0';
  hourRuler: TraditionalPlanet;
  houseSystemId: string;
  catalogStatus: 'UNRESOLVED';
  arms: readonly MonomericCrossArm[];
}>;
export class MonomericCrossError extends Error { code: string; constructor(code: string, message: string); }
export const TRADITIONAL_SIGN_RULERS: readonly TraditionalPlanet[];
export function buildMonomericCrossGeometry(input: MonomericCrossInput): MonomericCrossGeometry;
