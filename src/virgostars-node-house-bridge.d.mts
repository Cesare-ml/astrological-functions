import type {AstroComHouseAngleRequest, AstroComHouseAngleSource,
  AstroComHouseAngleProvider, AstroComProviderIdentity} from './astro-com-house-provider.mjs';

/** The upstream createHouseAngleProvider() API, excluding its auxiliary angles. */
export interface VirgoStarsNativeHouseAngleResult extends AstroComHouseAngleRequest {
  readonly model: 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME';
  readonly armcDeg: number;
  readonly ascendantDeg: number;
  readonly midheavenDeg: number;
  readonly trueObliquityDeg: number;
}

export interface VirgoStarsNativeHouseAngleProvider {
  calculateHouseAngles(input: AstroComHouseAngleRequest):
    VirgoStarsNativeHouseAngleResult | Promise<VirgoStarsNativeHouseAngleResult>;
}

/** These values are caller assertions: the upstream binding does NOT return them. */
export interface CallerVerifiedNodeBinding {
  readonly upstreamCommitSha: string;
  readonly nativeAddonSha256: string;
  /** External context label, NOT evidence that house angles were DE441-computed. */
  readonly kernelSetId: string;
}

export interface VirgoStarsNodeHouseAttestation extends CallerVerifiedNodeBinding {
  readonly repository: 'Cesare-ml/VirgoStars-Ephemeris';
  readonly kernelRole: 'CALLER_CONTEXT_ONLY_HOUSE_ANGLES_DO_NOT_READ_DE441';
  readonly provenanceStatus: 'CALLER_ASSERTED_BINARY_IDENTITY_NOT_INDEPENDENTLY_VERIFIED';
}

export interface VirgoStarsNodeHouseBridge extends AstroComHouseAngleProvider {
  readonly expectedProvider: Readonly<AstroComProviderIdentity>;
  readonly attestation: Readonly<VirgoStarsNodeHouseAttestation>;
  calculateHouseAngles(input: AstroComHouseAngleRequest):
    Readonly<AstroComHouseAngleSource> | Promise<Readonly<AstroComHouseAngleSource>>;
}

/** Structural-only, opt-in bridge; does not load or authenticate the Rust addon. */
export declare function bindVirgoStarsNodeHouseAngles(
  nativeProvider: VirgoStarsNativeHouseAngleProvider,
  binding: CallerVerifiedNodeBinding,
): Readonly<VirgoStarsNodeHouseBridge>;
