import type { LunarElongationSectors } from './lunar-elongation.mjs';

export interface LunarProviderPosition {
  readonly longitudeDeg: number;
  readonly latitudeDeg: number;
  readonly metadata: Readonly<{
    bodyName: 'Sun' | 'Moon';
    datetimeUtc: string;
    center: 'EARTH';
    frame: 'ECLIPTIC_OF_DATE';
    corrections: 'APPARENT';
    engineVersion: string;
    kernelSetId: string;
    timeModelId: string;
  }>;
}

export interface LunarGeocentricProvider {
  getGeocentricEcliptic(input: Readonly<{
    datetimeUtc: string;
    bodyName: 'Sun' | 'Moon';
    frame: 'ECLIPTIC_OF_DATE';
    corrections: 'APPARENT';
  }>): Promise<LunarProviderPosition>;
}

export interface LunarProviderPin {
  readonly engineVersion: string;
  readonly kernelSetId: string;
  readonly timeModelId: string;
}

export interface LunarElongationProviderInput {
  readonly datetimeUtc: string;
  /** Sidereal projection is deliberately not yet accepted by this provider gate. */
  readonly zodiac: 'TROPICAL';
  readonly expectedEphemeris: Readonly<LunarProviderPin>;
  readonly provider: LunarGeocentricProvider;
}

export interface LunarElongationProviderResult {
  readonly contract: 'LunarElongationWithProvider';
  readonly contractVersion: '0.1.0-experimental';
  readonly datetimeUtc: string;
  readonly ephemeris: Readonly<LunarProviderPin>;
  readonly positions: Readonly<{
    Sun: Readonly<{ bodyName: 'Sun'; longitudeDeg: number; latitudeDeg: number }>;
    Moon: Readonly<{ bodyName: 'Moon'; longitudeDeg: number; latitudeDeg: number }>;
  }>;
  readonly sectors: Readonly<LunarElongationSectors>;
}

export declare function calculateLunarElongationWithProvider(
  input: LunarElongationProviderInput,
): Promise<Readonly<LunarElongationProviderResult>>;
