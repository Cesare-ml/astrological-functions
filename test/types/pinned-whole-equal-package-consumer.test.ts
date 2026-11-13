import { compareWholeSignEqualWithPinnedSources } from 'astrological-functions/pinned-whole-equal-comparison';
import type { PinnedWholeEqualInput } from 'astrological-functions/pinned-whole-equal-comparison';
import type { PinnedHouseComparisonResult } from '../../src/house-source-consistency.mjs';

const source = {
  datetimeUtc: '2026-11-13T12:00:00Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
  observerType: 'TOPOCENTRIC',
  observer: { latitudeDeg: 44.8, longitudeDegEast: 11.9 },
  engineVersion: 'SYNTHETIC_RUST_V1',
  kernelSetId: 'SYNTHETIC_KERNEL',
  timeModel: 'SYNTHETIC_TIME_V1',
  corrections: 'APPARENT',
  calculationProfileId: 'CANONICAL_V1',
} as const;

const input: PinnedWholeEqualInput = {
  birthTimeKnown: true,
  ascendantLongitudeDeg: 345,
  datetimeUtc: source.datetimeUtc,
  frame: source.frame,
  longitudeBasis: source.longitudeBasis,
  points: [{ id: 'SUN', longitudeDeg: 355 }],
  wholeSignSource: source,
  equalAscendantSource: source,
};
const result: PinnedHouseComparisonResult = compareWholeSignEqualWithPinnedSources(input);
const matching: 'MATCHING_CALLER_DECLARED_SOURCE_NOT_INDEPENDENTLY_VERIFIED' = result.status;
void matching;

// @ts-expect-error Birth time must be the literal true.
const badBirthTime: PinnedWholeEqualInput = { ...input, birthTimeKnown: false };
// @ts-expect-error Both independent source declarations must be present.
const missingRight: PinnedWholeEqualInput = { ...input, equalAscendantSource: undefined };
// @ts-expect-error No implicit or missing sidereal ayanamsa.
const invalidSidereal: PinnedWholeEqualInput = { ...input, longitudeBasis: { type: 'SIDEREAL' } };
// @ts-expect-error The provider must explicitly assert apparent corrections.
const badCorrection: PinnedWholeEqualInput = { ...input, equalAscendantSource: { ...source, corrections: 'GEOMETRIC' } };
// @ts-expect-error Returned planetary placements are readonly.
result.comparison.facts[0].leftHouse = 5;
// @ts-expect-error Astronomical source snapshots are readonly.
result.source.observer.longitudeDegEast = 12;
void badBirthTime;
void missingRight;
void invalidSidereal;
void badCorrection;
