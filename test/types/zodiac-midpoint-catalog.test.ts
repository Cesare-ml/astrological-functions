import { calculateZodiacMidpointCatalog, type ZodiacMidpointCatalogFacts } from '../../src/zodiac-midpoint-catalog.mjs';

const points = [{name:'Sun',longitudeDeg:359},{name:'Moon',longitudeDeg:1}] as const;
const result: Readonly<ZodiacMidpointCatalogFacts> = calculateZodiacMidpointCatalog({points});
const pairAxis: readonly [number, number] = result.pairs[0].midpointAxis.axisLongitudesDeg;
const pairName: string = result.pairs[0].firstName;
const count: number = result.pairCount;
void [pairAxis,pairName,count];
// @ts-expect-error A catalog requires a named list of points.
calculateZodiacMidpointCatalog({});
// @ts-expect-error Names are strings, never numeric body IDs.
calculateZodiacMidpointCatalog({points:[{name:123,longitudeDeg:0},{name:'Sun',longitudeDeg:30}]});
// @ts-expect-error Raw input longitudes are numeric, not strings.
calculateZodiacMidpointCatalog({points:[{name:'Moon',longitudeDeg:'20'},{name:'Sun',longitudeDeg:0}]});
// @ts-expect-error Result pair count is readonly.
result.pairCount=42;
// @ts-expect-error Nested point longitude is readonly.
result.points[0].longitudeDeg=11;
// @ts-expect-error No speculative synodic motion supplied by geometry.
result.synodicMotion;
