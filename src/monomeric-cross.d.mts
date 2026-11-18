export type TraditionalPlanet = 'SUN' | 'MOON' | 'MERCURY' | 'VENUS' | 'MARS' | 'JUPITER' | 'SATURN';
export type DomicileRank = 'PRIMARY' | 'SECONDARY';
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
  signRulerDomicile: DomicileRank;
  rulerLongitudeDeg: number;
  rulerHouse: number;
}>;
export type MonomericCrossGeometry = Readonly<{
  contract: 'MonomericCrossGeometry';
  contractVersion: '1.1.0';
  hourRuler: TraditionalPlanet;
  houseSystemId: string;
  catalogStatus: 'UNRESOLVED';
  arms: readonly MonomericCrossArm[];
}>;
export class MonomericCrossError extends Error { code: string; constructor(code: string, message: string); }
export const TRADITIONAL_SIGN_RULERS: readonly TraditionalPlanet[];
export const TRADITIONAL_SIGN_DOMICILES: readonly Readonly<{planet: TraditionalPlanet; domicile: DomicileRank}>[];
export function buildMonomericCrossGeometry(input: MonomericCrossInput): MonomericCrossGeometry;
