import type {AstroComHouseSystemId, AstroComHouseMethodResult} from './astro-com-house-selector.mjs';
import type {ExternalSunDeclination} from './declination-arc-house-cusps.mjs';

export interface AstroComProviderIdentity {
  readonly engineVersion: string;
  readonly kernelSetId: string;
  readonly timeModel: string;
}

export interface AstroComHouseProviderRequestBase {
  readonly datetimeUtc: string;
  readonly birthTimeKnown: true;
  readonly ut1JulianDay: number;
  readonly ttJulianDay: number;
  readonly latitudeDeg: number;
  readonly longitudeDegEast: number;
  readonly expectedProvider: AstroComProviderIdentity;
}

export type AstroComHouseProviderRequest = AstroComHouseProviderRequestBase & (
  | Readonly<{houseSystem: 'SUNSHINE'; sun: ExternalSunDeclination}>
  | Readonly<{houseSystem: Exclude<AstroComHouseSystemId, 'SUNSHINE'>; sun?: never}>
);

export interface AstroComHouseAngleSource extends AstroComProviderIdentity {
  readonly model: 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME';
  readonly ut1JulianDay: number;
  readonly ttJulianDay: number;
  readonly latitudeDeg: number;
  readonly longitudeDegEast: number;
  readonly armcDeg: number;
  readonly ascendantDeg: number;
  readonly midheavenDeg: number;
  readonly trueObliquityDeg: number;
}

export type AstroComHouseAngleRequest = Readonly<Pick<AstroComHouseProviderRequestBase,
  'ut1JulianDay'|'ttJulianDay'|'latitudeDeg'|'longitudeDegEast'>>;

export interface AstroComHouseAngleProvider {
  calculateHouseAngles(input: AstroComHouseAngleRequest):
    AstroComHouseAngleSource | Promise<AstroComHouseAngleSource>;
}

export interface AstroComProviderHouseResult {
  readonly contract: 'AstroComProviderHouseResult';
  readonly contractVersion: '0.1.0-experimental';
  readonly datetimeUtc: string;
  readonly houseSystem: AstroComHouseSystemId;
  readonly angleSource: Readonly<AstroComHouseAngleSource>;
  readonly result: AstroComHouseMethodResult;
  readonly validation: 'CALLER_ASSERTED_PROVIDER_NOT_INDEPENDENTLY_VERIFIED';
}

/** Experimental provider boundary, not real Rust/DE441 validation. */
export declare function calculateAstroComHouseFromProvider(
  request: AstroComHouseProviderRequest,
  provider: AstroComHouseAngleProvider,
): Promise<Readonly<AstroComProviderHouseResult>>;
