import { compareWholeSignAndEqualFromAscendant } from '../../src/whole-equal-house-comparison.mjs';
import type {
  WholeEqualComparisonInput,
} from '../../src/whole-equal-house-comparison.mjs';
import type {
  HouseMethodComparisonResult,
} from '../../src/house-method-comparison.mjs';

const input: WholeEqualComparisonInput = {
  ascendantLongitudeDeg: 345,
  birthTimeKnown: true,
  datetimeUtc: '2026-11-12T21:15:03Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
  points: [{ id: 'SUN', longitudeDeg: 355 }],
};
const result: HouseMethodComparisonResult = compareWholeSignAndEqualFromAscendant(input);
const changed: boolean = result.facts[0].changed;
void changed;

compareWholeSignAndEqualFromAscendant({
  ...input,
  longitudeBasis: { type: 'SIDEREAL', ayanamsaId: 'TEST_V1' },
});

// @ts-expect-error Birth time must be known and narrowed to literal true.
const unknown: WholeEqualComparisonInput = { ...input, birthTimeKnown: false };
// @ts-expect-error Sidereal basis requires explicit named ayanamsa.
const invalidSidereal: WholeEqualComparisonInput = { ...input, longitudeBasis: { type: 'SIDEREAL' } };
// @ts-expect-error Never mutate returned house assignments.
result.facts[0].leftHouse = 3;
// @ts-expect-error Never mutate returned cusp longitudes.
result.left.cuspsDeg[0] = 123;
void unknown;
void invalidSidereal;
