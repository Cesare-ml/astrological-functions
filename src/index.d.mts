/** Typed ESM contract for the package root. Experimental and subject to change. */
export class AstrologyError extends Error {
  constructor(code: string, message: string);
  readonly code: string;
}

export function normalize360(degrees: number): number;
/** Signed shortest difference from a to b, in [-180, 180). */
export function signedAngularDistance(a: number, b: number): number;
export function angularSeparation(a: number, b: number): number;
export function zodiacSignIndex(longitude: number): number;
export function dodecatemoriaLongitude(longitude: number): number;

export interface HousePlacement {
  readonly house: number;
  readonly startDeg: number;
  readonly endDeg: number;
  readonly distanceFromCuspDeg: number;
}
/** Cusps must be twelve finite longitudes in forward zodiac order. */
export function locateLongitudeInHouses(longitude: number, cusps: readonly number[]): HousePlacement;

export interface AstrologyPointInput {
  readonly name: string;
  readonly longitudeDeg: number;
  readonly type?: string | null;
}
export interface AspectDefinitionInput {
  readonly id: string;
  readonly angleDeg: number;
  readonly maxOrbDeg: number;
}
export type CrossAspectDirection = "A_TO_B" | "B_TO_A" | "SKY_TO_NATAL";
export interface CrossAspectInput {
  readonly direction: CrossAspectDirection;
  readonly sourcePoints: readonly AstrologyPointInput[];
  readonly targetPoints: readonly AstrologyPointInput[];
  readonly aspectDefinitions: readonly AspectDefinitionInput[];
}
export interface AstrologyPointFact {
  readonly name: string;
  readonly longitudeDeg: number;
  readonly type: string;
}
export interface CrossAspectFact {
  readonly direction: CrossAspectDirection;
  readonly source: AstrologyPointFact;
  readonly target: AstrologyPointFact;
  readonly aspectId: string;
  readonly exactAngleDeg: number;
  readonly actualAngleDeg: number;
  readonly signedOrbDeg: number;
  readonly absoluteOrbDeg: number;
  readonly configuredMaxOrbDeg: number;
}
/** Computes directional geometric facts only; no interpretation is performed. */
export function calculateCrossAspects(input: CrossAspectInput): readonly CrossAspectFact[];

export interface ApparentEclipticState {
  readonly longitudeDeg: number;
  readonly latitudeDeg: number;
  readonly longitudeSpeedDegPerDay?: number | null;
  readonly metadata: {
    readonly center: "EARTH" | string;
    readonly frame: "ECLIPTIC_OF_DATE" | string;
    readonly corrections: "APPARENT" | string;
    readonly [key: string]: unknown;
  };
}
export interface NatalEphemerisProvider {
  getGeocentricEcliptic(input: {
    readonly datetimeUtc: string;
    readonly bodyName: string;
    readonly corrections: "APPARENT";
    readonly frame: "ECLIPTIC_OF_DATE";
  }): Promise<ApparentEclipticState>;
}
export interface CalculateNatalWithProviderInput {
  readonly datetimeUtc: string;
  readonly latitudeDeg: number;
  readonly longitudeDegEast: number;
  readonly bodyNames: readonly string[];
  readonly provider: NatalEphemerisProvider;
}
export interface NatalBodyFact {
  readonly name: string;
  readonly longitudeDeg: number;
  readonly latitudeDeg: number;
  readonly zodiacSignIndex: number;
  readonly longitudeSpeedDegPerDay: number | null;
  readonly ephemerisMetadata: Readonly<Record<string, unknown>>;
}
export interface NatalChartResult {
  readonly contract: "NatalChartResult";
  readonly contractVersion: "0.1.0-experimental";
  readonly datetimeUtc: string;
  readonly latitudeDeg: number;
  readonly longitudeDegEast: number;
  readonly bodies: Readonly<Record<string, NatalBodyFact>>;
  readonly houses: null;
  readonly angles: null;
  readonly warnings: readonly {
    readonly code: "houses_unavailable";
    readonly message: string;
  }[];
}
/**
 * Experimental provider boundary. Requires Earth-centered apparent
 * ecliptic-of-date positions; incompatible provider metadata is rejected.
 */
export function calculateNatalWithProvider(
  input: CalculateNatalWithProviderInput,
): Promise<NatalChartResult>;
