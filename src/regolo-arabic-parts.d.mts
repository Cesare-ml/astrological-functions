import type { RegoloLotInput } from './regolo-kleroi.mjs';
import type { RegoloArabicPartDefinition } from './regolo-arabic-parts-catalog.mjs';

export interface RegoloArabicPartsInput extends RegoloLotInput {
  /** Optional. Only parts requiring house cusps become unavailable if omitted. */
  readonly houseCuspsDeg?: readonly number[];
  readonly midheavenLongitudeDeg?: number;
  readonly descendantLongitudeDeg?: number;
  /** Position of the appropriate source lunation, supplied by the caller. */
  readonly newMoonLongitudeDeg?: number;
}

export interface RegoloArabicPartResult {
  readonly id: string;
  readonly group: RegoloArabicPartDefinition['group'];
  readonly nameIt: string;
  readonly sourceLine: number;
  readonly sourceFormula: string;
  readonly effectiveTerms: readonly string[];
  readonly notes: readonly string[];
  readonly status: 'AVAILABLE' | 'UNAVAILABLE_MISSING_INPUT';
  readonly longitudeDeg: number | null;
  readonly zodiacSignIndex: number | null;
  readonly missing: readonly string[];
}

export interface RegoloArabicPartsResult {
  readonly contract: 'RegoloArabicPartsResult';
  readonly contractVersion: '0.1.0-experimental';
  readonly method: 'REGOLO_LEGACY_ARABIC_PARTS_V1';
  readonly source: Readonly<{
    repository: string; commit: string; file: string; method: string;
  }>;
  readonly sect: RegoloLotInput['sect'];
  readonly zodiac: RegoloLotInput['zodiac'];
  readonly chartContextId: string;
  readonly entries: readonly Readonly<RegoloArabicPartResult>[];
  readonly availableCount: number;
  readonly warnings: readonly string[];
}

export declare const REGOLO_ARABIC_PARTS_SOURCE: RegoloArabicPartsResult['source'];
export declare function calculateRegoloArabicParts(input: RegoloArabicPartsInput): Readonly<RegoloArabicPartsResult>;
export { REGOLO_ARABIC_PARTS_CATALOG } from './regolo-arabic-parts-catalog.mjs';
