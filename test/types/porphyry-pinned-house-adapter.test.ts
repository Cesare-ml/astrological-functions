import { adaptPorphyryForPinnedHouseComparison } from '../../src/porphyry-pinned-house-adapter.mjs';
import type { PorphyryPinnedAdapterInput, PorphyryProducerResult } from '../../src/porphyry-pinned-house-adapter.mjs';
import type { DeclaredHouseSource, SourcedHouseSnapshot } from '../../src/house-source-consistency.mjs';

const timestamp = '2026-11-13T12:00:00Z';
const nativeSource = {
  engineVersion: 'SYNTHETIC_RUST', kernelSetId: 'SYNTHETIC_KERNEL',
  timeModel: 'TEST_TIME', frame: 'ECLIPTIC_OF_DATE', zodiac: 'TROPICAL',
  observerType: 'TOPOCENTRIC', observer: {latitudeDeg:44, longitudeDegEast:11},
} as const;
const result: PorphyryProducerResult = {
  contract: 'PorphyryHouseCusps', contractVersion: '0.1.0-experimental',
  houseSystem: 'PORPHYRY', datetimeUtc:timestamp,
  angles: {ascendantDeg:10, icDeg:105, descendantDeg:190, midheavenDeg:285},
  cuspsDeg:[10,41.666666666666664,73.33333333333333,105,
    133.33333333333334,161.66666666666666,190,221.66666666666666,
    253.33333333333334,285,313.3333333333333,341.6666666666667],
  quadrantSpansDeg:[95,85,95,85], source:nativeSource,
  interpretation:'FACTS_ONLY', validation:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED',
};
const source: DeclaredHouseSource = {
  datetimeUtc:timestamp,frame:'ECLIPTIC_OF_DATE',longitudeBasis:{type:'TROPICAL'},
  observerType:'TOPOCENTRIC',observer:{latitudeDeg:44,longitudeDegEast:11},
  engineVersion:'SYNTHETIC_RUST',kernelSetId:'SYNTHETIC_KERNEL',
  timeModel:'TEST_TIME',corrections:'APPARENT',calculationProfileId:'CANONICAL_V1',
};
const input: PorphyryPinnedAdapterInput = {porphyry:result,source,birthTimeKnown:true};
const snapshot: Readonly<SourcedHouseSnapshot> = adaptPorphyryForPinnedHouseComparison(input);
const method = snapshot.snapshot.houseSystem;
void method;
// @ts-expect-error known birth-time assertion is required
const unknownBirthTime: PorphyryPinnedAdapterInput = {...input,birthTimeKnown:false};
void unknownBirthTime;
// @ts-expect-error geometric J2000 cannot substitute ecliptic of date
const badFrame: DeclaredHouseSource = {...source,frame:'J2000'};
void badFrame;
// @ts-expect-error no inferred geometric fallback
const badCorrection: DeclaredHouseSource = {...source,corrections:'GEOMETRIC'};
void badCorrection;
// @ts-expect-error the returned source is readonly
snapshot.source.kernelSetId = 'CHANGED';
