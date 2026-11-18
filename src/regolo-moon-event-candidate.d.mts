import type {RegoloAstroSourcePin} from './regolo-lots-astronomy-bridge.mjs';

/** Source JSON from Python VirgoStarsEvents.get_synods_at, VSEPH-P0. */
export type P0MoonRecord = Readonly<{
  body: 'Moon';
  source_id: number | null;
  cycle_start_utc: string | null;
  next_cycle_start_utc: string | null;
  phase_thresholds_utc: readonly string[] | null;
  phase: Readonly<{code: string | null; started_at_utc: string | null; status: string}>;
  coverage: Readonly<{status: 'unreviewed'; warnings: readonly string[]}>;
  status: 'recorded' | 'no_preceding_recorded_cycle';
}>;

export type VirgoStarsP0MoonSnapshot = Readonly<{
  requested_at_utc: string;
  dataset: Readonly<{
    id: null;
    sha256: string;
    format: 'VSEPH-P0';
    coverage_certified: false;
  }>;
  synods: Readonly<{Moon: P0MoonRecord; [body: string]: unknown}>;
  new_moon: P0MoonRecord | null;
}>;

export type VirgoStarsMoonPositionEngine = Readonly<{
  /** Actual VirgoStars-Ephemeris Node Engine.calcUt signature. */
  calcUt(jdUt: number, ipl: number, flags?: number): Readonly<{
    xx: readonly number[];
    rflag: number;
    timeSource: string;
    notes?: readonly string[];
  }>;
}>;

export type RegoloRecordedMoonCandidateInput = Readonly<{
  datetimeUtc: string;
  snapshot: VirgoStarsP0MoonSnapshot;
  expectedDatasetSha256: string;
  expectedEphemeris: RegoloAstroSourcePin;
  ut1MinusUtcAtEventSeconds: number;
  expectedTimeSource: string;
  maxConjunctionResidualDeg: number;
  engine: VirgoStarsMoonPositionEngine;
}>;

export type RegoloRecordedMoonCandidateStatus =
  | 'NO_PRECEDING_RECORDED_MOON'
  | 'STALE_RECORDED_ANCHOR'
  | 'COVERAGE_WARNING_BLOCKED'
  | 'CANDIDATE_UNREVIEWED_COVERAGE'
  | 'REJECTED_CONJUNCTION_RESIDUAL';

export type RegoloRecordedMoonCandidate = Readonly<{
  sourceRowId: number;
  recordedAnchorUtc: string;
  ageDays: number;
  nextRecordedAnchorUtc: string | null;
  eventJdUt?: number;
  sunLongitudeDeg?: number;
  moonLongitudeDeg?: number;
  signedGapDeg?: number;
  conjunctionResidualDeg?: number;
  expectedTimeSource?: string;
  ut1MinusUtcAtEventSeconds?: number;
}>;

export type RegoloRecordedMoonCandidateResult = Readonly<{
  contract: 'RegoloRecordedMoonCandidateV1';
  contractVersion: '0.1.0-experimental';
  status: RegoloRecordedMoonCandidateStatus;
  requestedAtUtc: string;
  dataset: Readonly<{
    format: 'VSEPH-P0';
    sha256: string;
    coverageCertified: false;
  }>;
  expectedEphemeris: RegoloAstroSourcePin;
  /** Deliberately unavailable until a separately reviewed source gate exists. */
  precedingNewMoon: Readonly<{
    availability: 'UNAVAILABLE'; reason: 'NOT_COMPUTED' | 'OUT_OF_RANGE';
  }>;
  candidate: RegoloRecordedMoonCandidate | null;
  scientificEvidence: 'UNREVIEWED_P0_ARCHIVE_AND_INJECTED_ENGINE';
  warnings: readonly string[];
}>;

export declare function inspectRegoloRecordedNewMoon(
  input: RegoloRecordedMoonCandidateInput,
): RegoloRecordedMoonCandidateResult;
