import { compareHousePlacementsWithPinnedSource } from '../../src/house-source-consistency.mjs';
import type { DeclaredHouseSource, PinnedHouseComparisonInput } from '../../src/house-source-consistency.mjs';
import type { HouseCuspSnapshot } from '../../src/house-method-comparison.mjs';
const utc = '2026-11-12T21:15:03Z';
const basis = { type: 'TROPICAL' } as const;
const source: DeclaredHouseSource = {
  datetimeUtc: utc, frame: 'ECLIPTIC_OF_DATE', longitudeBasis: basis,
  observerType: 'TOPOCENTRIC', observer: {latitudeDeg:44,longitudeDegEast:11},
  engineVersion: 'TEST_V1', kernelSetId: 'SYNTHETIC', timeModel: 'TEST_TIME',
  corrections: 'APPARENT', calculationProfileId: 'CANONICAL_V1',
};
const snapshot: HouseCuspSnapshot = {
  datetimeUtc: utc, frame: 'ECLIPTIC_OF_DATE', longitudeBasis: basis,
  houseSystem: 'WHOLE_SIGN', provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
  cuspsDeg: [0,30,60,90,120,150,180,210,240,270,300,330],
};
const input: PinnedHouseComparisonInput = {
  birthTimeKnown:true, left:{snapshot,source},
  right:{snapshot:{...snapshot,houseSystem:'EQUAL_ASCENDANT'},source},
  points:[{id:'SUN',longitudeDeg:10}],
};
const result = compareHousePlacementsWithPinnedSource(input);
const status: 'MATCHING_CALLER_DECLARED_SOURCE_NOT_INDEPENDENTLY_VERIFIED' = result.status;
const changed: number = result.comparison.changedCount;
void status; void changed;
// @ts-expect-error unknown birth times cannot produce houses
const badTime: PinnedHouseComparisonInput = {...input,birthTimeKnown:false};
void badTime;
// @ts-expect-error no geometric J2000 fallback
const badFrame: DeclaredHouseSource = {...source,frame:'J2000'};
void badFrame;
// @ts-expect-error source must declare an explicit apparent correction model
const badCorrections: DeclaredHouseSource = {...source,corrections:'GEOMETRIC'};
void badCorrections;
// @ts-expect-error non-topocentric observers unsupported
const badObserver: DeclaredHouseSource = {...source,observerType:'GEOCENTRIC'};
void badObserver;
// @ts-expect-error caller results are readonly
result.comparison.changedCount = 42;
