/** Symbolic chart-coordinate arithmetic; does not compute astronomical positions or sect. */
export type ClassicalSect = 'DAY' | 'NIGHT';
export type ClassicalZodiac = 'TROPICAL' | 'SIDEREAL';

interface ClassicalLotsSharedInput {
  /** Caller-asserted known birth time; false/unknown cannot yield trusted lots. */
  readonly birthTimeKnown: true;
  /** Explicitly established day/night chart sect, never inferred by this module. */
  readonly sect: ClassicalSect;
  /** Nonempty identifier for the shared chart context, not a personal record. */
  readonly chartContextId: string;
  /** All three coordinates must use the same zodiac, frame and instant. */
  readonly ascendantLongitudeDeg: number;
  readonly sunLongitudeDeg: number;
  readonly moonLongitudeDeg: number;
}

/** Sidereal coordinates must declare the ayanamsa that produced them. */
export type ClassicalLotsInput = ClassicalLotsSharedInput & (
  { readonly zodiac: 'TROPICAL'; readonly ayanamsaId?: never; readonly ayanamsaVersion?: never } |
  { readonly zodiac: 'SIDEREAL'; readonly ayanamsaId: string; readonly ayanamsaVersion: string }
);

export interface ClassicalLotFact {
  readonly id: 'FORTUNE' | 'SPIRIT';
  readonly longitudeDeg: number;
  readonly zodiacSignIndex: number;
}

export interface ClassicalLotsResult {
  readonly contract: 'ClassicalLotsResult';
  readonly contractVersion: '0.2.0-experimental';
  readonly method: 'SECT_REVERSAL_V1';
  readonly sect: ClassicalSect;
  readonly zodiac: ClassicalZodiac;
  readonly chartContextId: string;
  readonly ayanamsa: Readonly<{ id: string; version: string }> | null;
  readonly lots: Readonly<{
    fortune: Readonly<ClassicalLotFact & { readonly id: 'FORTUNE' }>;
    spirit: Readonly<ClassicalLotFact & { readonly id: 'SPIRIT' }>;
  }>;
  readonly warnings: readonly ['CALLER_ASSERTED_SHARED_CHART_AND_SECT_NOT_VERIFIED'];
}

export declare function calculateClassicalLots(input: ClassicalLotsInput): Readonly<ClassicalLotsResult>;
