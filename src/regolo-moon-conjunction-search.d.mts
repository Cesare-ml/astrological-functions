import type {RegoloAstroSourcePin} from './regolo-lots-astronomy-bridge.mjs';

export type RegoloConjunctionPositionEngine = Readonly<{
  /** Actual VirgoStars-Ephemeris Node Engine.calcUt UT1 signature. */
  calcUt(jdUt: number, ipl: number, flags?: number): Readonly<{
    xx: readonly number[];
    rflag: number;
    timeSource: string;
    notes?: readonly string[];
  }>;
}>;

export type RegoloPrecedingConjunctionSearchInput = Readonly<{
  datetimeUtc: string;
  /** Exact JD UT1 consistent with datetimeUtc and UT1−UTC at birth. */
  birthJdUt: number;
  ut1MinusUtcAtBirthSeconds: number;
  expectedEphemeris: RegoloAstroSourcePin;
  /** Named policy, e.g. IERS_LEAP_SECONDS; no hidden time-model fallback. */
  expectedTimeSourcePolicy: string;
  lookbackDays: number;
  sampleStepHours: number;
  rootToleranceSeconds: number;
  maxIterations: number;
  maxConjunctionResidualDeg: number;
  engine: RegoloConjunctionPositionEngine;
}>;

export type RegoloConjunctionCandidate = Readonly<{
  /** Refined event, *not* independently verified as a UTC instant. */
  jdUt: number;
  sunLongitudeDeg: number;
  moonLongitudeDeg: number;
  signedElongationDeg: number;
  timeSource: string;
  iterations: number;
  bracketWidthSeconds: number;
  localLongitudeSweepDeg: number;
}>;

export type RegoloPrecedingConjunctionSearchResult = Readonly<{
  contract: 'RegoloPrecedingConjunctionSearchV1';
  contractVersion: '0.1.0-experimental';
  status: 'CANDIDATE_UNVERIFIED_ASTRONOMY' | 'NON_CONVERGENT' | 'NO_CONJUNCTION_BRACKET';
  datetimeUtc: string;
  birthJdUt: number;
  expectedEphemeris: RegoloAstroSourcePin;
  expectedTimeSourcePolicy: string;
  lookbackDays: number;
  sampleStepHours: number;
  rootToleranceSeconds: number;
  sampledPoints: number;
  candidateBrackets: number;
  candidate: RegoloConjunctionCandidate | null;
  /** Always unavailable until independent verification of a true event. */
  precedingNewMoon: Readonly<{
    availability: 'UNAVAILABLE';
    reason: 'NOT_COMPUTED' | 'NON_CONVERGENT';
  }>;
  scientificEvidence: 'UNVERIFIED_INJECTED_VIRGOSTARS_ENGINE';
  warnings: readonly string[];
}>;

export declare function searchRegoloPrecedingConjunction(
  input: RegoloPrecedingConjunctionSearchInput,
): RegoloPrecedingConjunctionSearchResult;
