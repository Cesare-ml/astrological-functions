import { compareWholeSignEqualWithPinnedSources } from '../../src/pinned-whole-equal-comparison.mjs';
import type { PinnedWholeEqualInput } from '../../src/pinned-whole-equal-comparison.mjs';
import type { DeclaredHouseSource } from '../../src/house-source-consistency.mjs';

const source: DeclaredHouseSource = {
  datetimeUtc: '2026-11-12T21:15:03Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
  observerType: 'TOPOCENTRIC',
  observer: { latitudeDeg: 44, longitudeDegEast: 11 },
  engineVersion: 'TEST_RUST_V1',
  kernelSetId: 'SYNTHETIC_KERNEL_V1',
  timeModel: 'TEST_TIME_V1',
  corrections: 'APPARENT',
  calculationProfileId: 'CANONICAL_V1',
};

const input: PinnedWholeEqualInput = {
  birthTimeKnown: true,
  ascendantLongitudeDeg: 345,
  datetimeUtc: source.datetimeUtc,
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: source.longitudeBasis,
  points: [{ id: 'SUN', longitudeDeg: 355 }],
  wholeSignSource: source,
  equalAscendantSource: source,
};
const result = compareWholeSignEqualWithPinnedSources(input);
const changes: number = result.comparison.changedCount;
void changes;
compareWholeSignEqualWithPinnedSources({ ...input, longitudeBasis:
  { type: 'SIDEREAL', ayanamsaId: 'SYNTHETIC_V1' } });

// @ts-expect-error Known birth time is a mandatory literal true.
const badBirthTime: PinnedWholeEqualInput = { ...input, birthTimeKnown: false };
// @ts-expect-error Both source envelopes are mandatory.
const missingSource: PinnedWholeEqualInput = { ...input, equalAscendantSource: undefined };
// @ts-expect-error Sidereal basis requires a named ayanamsa.
const badSidereal: PinnedWholeEqualInput = { ...input, longitudeBasis: { type: 'SIDEREAL' } };
// @ts-expect-error A declared source must use apparent corrections.
const badCorrection: DeclaredHouseSource = { ...source, corrections: 'GEOMETRIC' };
// @ts-expect-error Results must be readonly.
result.comparison.changedCount = 10;
// @ts-expect-error Returned longitude arrays are readonly.
result.comparison.left.cuspsDeg[0] = 0;

void badBirthTime;
void missingSource;
void badSidereal;
void badCorrection;
