import type { ZodiacMidpointAxisFacts } from './zodiac-midpoint-axis.mjs';

export interface ZodiacMidpointCatalogPoint {
  readonly name: string;
  readonly longitudeDeg: number;
}

export interface ZodiacMidpointCatalogInput {
  readonly points: readonly ZodiacMidpointCatalogPoint[];
}

export interface ZodiacMidpointCatalogPair {
  /** Unique names in deterministic case-sensitive code-unit order. */
  readonly firstName: string;
  readonly secondName: string;
  readonly midpointAxis: Readonly<ZodiacMidpointAxisFacts>;
}

export interface ZodiacMidpointCatalogFacts {
  readonly contract: 'ZodiacMidpointCatalog';
  readonly contractVersion: '0.1.0-experimental';
  readonly points: readonly Readonly<ZodiacMidpointCatalogPoint>[];
  readonly pairs: readonly Readonly<ZodiacMidpointCatalogPair>[];
  readonly pairCount: number;
  readonly calculationBasis: 'ECLIPTIC_LONGITUDE_GEOMETRY';
  readonly interpretation: 'FACTS_ONLY';
}

export declare function calculateZodiacMidpointCatalog(
  input: ZodiacMidpointCatalogInput,
): Readonly<ZodiacMidpointCatalogFacts>;
