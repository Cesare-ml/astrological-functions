import { compareWholeSignAndEqualFromAscendant } from 'astrological-functions/whole-equal-house-comparison';
import { compareHouseMethodPlacements } from 'astrological-functions/house-method-comparison';
import type {
  WholeEqualComparisonInput,
} from 'astrological-functions/whole-equal-house-comparison';
import type {
  HouseMethodComparisonResult,
  HouseMethodComparisonInput,
} from 'astrological-functions/house-method-comparison';

const input: WholeEqualComparisonInput = {
  ascendantLongitudeDeg: 345,
  birthTimeKnown: true,
  datetimeUtc: '2026-11-12T21:15:03Z',
  frame: 'ECLIPTIC_OF_DATE',
  longitudeBasis: { type: 'TROPICAL' },
  points: [{ id: 'SUN', longitudeDeg: 355 }],
};
const result: HouseMethodComparisonResult = compareWholeSignAndEqualFromAscendant(input);
const frozenHouse: number = result.facts[0].leftHouse;
void frozenHouse;
const comparison: HouseMethodComparisonInput = {
  birthTimeKnown: true,
  left: result.left,
  right: result.right,
  points: input.points,
};
compareHouseMethodPlacements(comparison);

// @ts-expect-error Unknown birth time is not a valid source for house geometry.
const invalidUnknown: WholeEqualComparisonInput = { ...input, birthTimeKnown: false };
// @ts-expect-error Sidereal must name an ayanamsa.
const invalidSidereal: WholeEqualComparisonInput = { ...input, longitudeBasis: { type: 'SIDEREAL' } };
// @ts-expect-error Results are immutable.
result.facts[0].rightHouse = 12;
// @ts-expect-error Cusp longitudes are readonly.
result.left.cuspsDeg[0] = 0;
void invalidUnknown;
void invalidSidereal;
