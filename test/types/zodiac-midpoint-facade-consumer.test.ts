import {
  calculateZodiacMidpointAxis,
  calculateZodiacMidpointContacts,
  calculateZodiacMidpointCatalog,
  calculateZodiacMidpointTargetSweep,
  calculateZodiacMidpointContactMatrix,
  filterZodiacMidpointContactMatrix,
  type ZodiacMidpointContactMatrixFacts,
  type ZodiacMidpointMatrixViewFacts,
  type ZodiacMidpointCatalogFacts,
} from '../../src/experimental/zodiac-midpoints.mjs';

const axis=calculateZodiacMidpointAxis({firstLongitudeDeg:350,secondLongitudeDeg:10});
const contact=calculateZodiacMidpointContacts({
  firstLongitudeDeg:350,secondLongitudeDeg:10,targetLongitudeDeg:0,maxOrbDeg:2,
});
const catalog: Readonly<ZodiacMidpointCatalogFacts>=calculateZodiacMidpointCatalog({
  points:[{name:'Moon',longitudeDeg:10},{name:'Sun',longitudeDeg:350}],
});
const sweep=calculateZodiacMidpointTargetSweep({
  firstLongitudeDeg:350,secondLongitudeDeg:10,
  targetPoints:[{name:'Mars',longitudeDeg:0}],maxOrbDeg:2,
});
const matrix: Readonly<ZodiacMidpointContactMatrixFacts>=calculateZodiacMidpointContactMatrix({
  sourcePoints:[{name:'Moon',longitudeDeg:10},{name:'Sun',longitudeDeg:350}],
  targetPoints:[{name:'Mars',longitudeDeg:0}],maxOrbDeg:2,
});
const view: Readonly<ZodiacMidpointMatrixViewFacts>=filterZodiacMidpointContactMatrix({
  matrix,sourceNames:null,targetNames:null,maxOrbDeg:2,excludePairMembers:true,
});
const points: readonly [number,number]=axis.axisLongitudesDeg;
const matches: readonly number[]=contact.matchingAxisLongitudesDeg;
const columns: readonly string[]=sweep.matchedTargetNames;
const pairCount: number=catalog.pairCount;
const cellCount: number=view.matchedCellCount;
void [points,matches,columns,pairCount,cellCount];

// @ts-expect-error The original midpoint axis endpoints must be explicit numbers.
calculateZodiacMidpointAxis({firstLongitudeDeg:'350',secondLongitudeDeg:10});
// @ts-expect-error A contact requires a target longitude.
calculateZodiacMidpointContacts({firstLongitudeDeg:0,secondLongitudeDeg:10,maxOrbDeg:1});
// @ts-expect-error Target points require numeric longitude.
calculateZodiacMidpointTargetSweep({firstLongitudeDeg:0,secondLongitudeDeg:10,targetPoints:[{name:'Mars',longitudeDeg:'10'}],maxOrbDeg:1});
// @ts-expect-error No implicit midpoint matrix orb.
calculateZodiacMidpointContactMatrix({sourcePoints:[],targetPoints:[]});
// @ts-expect-error The view requires an explicit self-contact policy.
filterZodiacMidpointContactMatrix({matrix,sourceNames:null,targetNames:null,maxOrbDeg:1});
// @ts-expect-error Immutable result facts cannot be mutated.
view.matchedCells[0].targetName='changed';
// @ts-expect-error Geometry-only facade never supplies ephemeris velocities.
view.longitudeSpeedDegPerDay;
