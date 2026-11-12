/** Experimental consumer-only composition; no astronomical calculations. */
import type { TransitSnapshotInput, TransitAspectDefinition, TransitAspectFactsResult } from './transit-facts.mjs';
import type { TransitPositionProvider, TransitSkyProviderInput } from './transit-provider.mjs';

export interface TransitCompositionInput extends Omit<TransitSkyProviderInput,'provider'> {
  readonly birthTimeKnown: true;
  readonly natal: TransitSnapshotInput;
  /** Optional explicit natal body subset; omission preserves all valid natal bodies. */
  readonly natalBodyNames?: readonly string[];
  readonly aspectDefinitions: readonly TransitAspectDefinition[];
  readonly provider: TransitPositionProvider;
}
export interface TransitFactsWithProviderResult {
  readonly contract: 'TransitFactsWithProviderResult';
  readonly contractVersion: '0.1.0-experimental';
  readonly status: 'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
  readonly facts: TransitAspectFactsResult;
  readonly warnings: readonly Readonly<{
    code: 'EPHEMERIS_ACCURACY_NOT_VERIFIED';
    message: string;
  }>[];
}
export declare function calculateTransitFactsWithProvider(input: Readonly<TransitCompositionInput>): Promise<TransitFactsWithProviderResult>;
