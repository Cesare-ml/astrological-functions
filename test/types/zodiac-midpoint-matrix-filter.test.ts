import {
  filterZodiacMidpointContactMatrix,
  type ZodiacMidpointMatrixViewFacts,
} from '../../src/zodiac-midpoint-matrix-filter.mjs';
import type { ZodiacMidpointContactMatrixFacts } from '../../src/zodiac-midpoint-contact-matrix.mjs';

declare const matrix: Readonly<ZodiacMidpointContactMatrixFacts>;
const view: Readonly<ZodiacMidpointMatrixViewFacts> = filterZodiacMidpointContactMatrix({
  matrix,
  sourceNames: ['Sun', 'Moon'],
  targetNames: null,
  maxOrbDeg: 2,
  excludePairMembers: true,
});
const rows: readonly string[] = view.rows.map(row => row.firstName);
const matched: readonly number[] = view.matchedCells[0].matchingAxisLongitudesDeg;
const sourceVersion: '0.1.0-experimental' = view.sourceContractVersion;
const filterOrb: number = view.filters.maxOrbDeg;
void [rows, matched, sourceVersion, filterOrb];

// @ts-expect-error No hidden default for exclusion policy.
filterZodiacMidpointContactMatrix({matrix,sourceNames:null,targetNames:null,maxOrbDeg:1});
// @ts-expect-error Orb is numeric, not a string.
filterZodiacMidpointContactMatrix({matrix,sourceNames:null,targetNames:null,maxOrbDeg:'1',excludePairMembers:false});
// @ts-expect-error The source list may contain only strings.
filterZodiacMidpointContactMatrix({matrix,sourceNames:[42],targetNames:null,maxOrbDeg:1,excludePairMembers:false});
// @ts-expect-error Return facts are readonly.
view.matchedCellCount=1;
// @ts-expect-error Deep nested matched cell is readonly.
view.matchedCells[0].targetName='Mars';
// @ts-expect-error No new ephemeris-derived values are calculated here.
view.longitudeSpeedDegPerDay;
