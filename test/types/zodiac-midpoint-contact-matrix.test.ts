import {
  calculateZodiacMidpointContactMatrix,
  type ZodiacMidpointContactMatrixFacts,
  type ZodiacMidpointMatchedCell,
} from '../../src/zodiac-midpoint-contact-matrix.mjs';

const matrix: Readonly<ZodiacMidpointContactMatrixFacts> = calculateZodiacMidpointContactMatrix({
  sourcePoints: [{name: 'Sun', longitudeDeg: 350}, {name:'Moon', longitudeDeg:10}],
  targetPoints: [{name:'Mars', longitudeDeg:0}],
  maxOrbDeg: 2,
});
const first: Readonly<ZodiacMidpointMatchedCell> | undefined = matrix.matchedCells[0];
const pairNames: readonly string[] = matrix.rows.map(r => r.firstName);
const axis: readonly [number, number] = matrix.rows[0].midpointAxis.axisLongitudesDeg;
const targetOrb: number = matrix.rows[0].targetSweep.maxOrbDeg;
const numberOfMatches: number = matrix.matchedCellCount;
void [first, pairNames, axis, targetOrb, numberOfMatches];

// @ts-expect-error Both source and target sets must be explicit.
calculateZodiacMidpointContactMatrix({sourcePoints:[],maxOrbDeg:1});
// @ts-expect-error An explicit orb is required.
calculateZodiacMidpointContactMatrix({sourcePoints:[],targetPoints:[]});
// @ts-expect-error Longitude must be numeric, never a string.
calculateZodiacMidpointContactMatrix({sourcePoints:[{name:'Sun',longitudeDeg:'10'}],targetPoints:[{name:'Mars',longitudeDeg:0}],maxOrbDeg:1});
// @ts-expect-error Match count is immutable.
matrix.matchedCellCount=3;
// @ts-expect-error Matched cell is immutable.
matrix.matchedCells[0].targetName='Changed';
// @ts-expect-error Astronomical velocity is not derived from midpoint geometry.
matrix.longitudeSpeedDegPerDay;
