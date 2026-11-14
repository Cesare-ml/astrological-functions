import type {
  DodecatemoriaFacts,
  DodecatemoriaMethod,
  DodecatemoriaZodiac,
} from './dodecatemoria-methods.mjs';

export interface DodecatemoriaBatchPoint {
  readonly id: string;
  /** Longitude already expressed in the batch's declared zodiac. */
  readonly longitudeDeg: number;
}

export interface DodecatemoriaBatchInput {
  /** Dense, ordered collection with 1..64 unique, trimmed ids (max 128 chars). */
  readonly points: ReadonlyArray<Readonly<DodecatemoriaBatchPoint>>;
  readonly zodiac: DodecatemoriaZodiac;
  readonly method: DodecatemoriaMethod;
}

export interface DodecatemoriaBatchPointFacts {
  readonly id: string;
  readonly facts: Readonly<DodecatemoriaFacts>;
}

export interface DodecatemoriaBatchFacts {
  readonly contract: 'DodecatemoriaBatchFacts';
  readonly contractVersion: '1';
  readonly zodiac: DodecatemoriaZodiac;
  readonly method: DodecatemoriaMethod;
  readonly points: ReadonlyArray<Readonly<DodecatemoriaBatchPointFacts>>;
}

export declare function calculateDodecatemoriaBatchFacts(
  input: DodecatemoriaBatchInput,
): Readonly<DodecatemoriaBatchFacts>;
