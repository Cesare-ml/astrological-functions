/** Explicitly opt-in compatibility adapter, not an ephemeris or aspect engine. */
import type { TransitSnapshotInput, TransitZodiac } from './transit-facts.mjs';

export interface LegacyTransitBody {
  readonly name: string;
  readonly longitudeDeg: number;
  readonly longitudeSpeedDegPerDay?: number | null;
  readonly ephemerisMetadata: Readonly<{
    center: 'EARTH';
    frame: 'ECLIPTIC_OF_DATE';
    corrections: 'APPARENT';
    engineVersion: string;
    kernelSetId: string;
    timeModel: string;
  }>;
}
export interface LegacyNatalSnapshotWithZodiac {
  readonly contract: 'NatalChartResult';
  readonly contractVersion: '0.1.0-experimental';
  readonly datetimeUtc: string;
  /** Required extension: do not guess zodiac omitted by older snapshots. */
  readonly zodiac: TransitZodiac;
  readonly ephemerisProvenance: Readonly<{
    engineVersion: string;
    kernelSetId: string;
    timeModel: string;
  }>;
  readonly bodies: Readonly<Record<string, LegacyTransitBody>>;
}
export interface TransitSnapshotNormalizationResult {
  readonly contract: 'TransitSnapshotNormalizationResult';
  readonly contractVersion: '0.1.0-experimental';
  readonly status: 'SOURCE_ASSERTED_NOT_INDEPENDENTLY_VERIFIED';
  readonly sourceContract: 'NatalChartResult';
  readonly selectedBodyNames: readonly string[];
  readonly snapshot: TransitSnapshotInput;
  readonly warnings: readonly Readonly<{
    code:'LEGACY_SOURCE_NOT_INDEPENDENTLY_VERIFIED';
    message:string;
  }>[];
}
export declare function normalizeLegacyTransitSnapshot(input: Readonly<{
  chart:LegacyNatalSnapshotWithZodiac;
  selectedBodyNames:readonly string[];
}>): TransitSnapshotNormalizationResult;
