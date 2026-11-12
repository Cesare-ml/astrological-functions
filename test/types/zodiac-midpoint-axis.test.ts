import { calculateZodiacMidpointAxis, type ZodiacMidpointAxisFacts } from '../../src/zodiac-midpoint-axis.mjs';

const facts: Readonly<ZodiacMidpointAxisFacts> = calculateZodiacMidpointAxis({
  firstLongitudeDeg: 350,
  secondLongitudeDeg: 10,
});
const axis: readonly [number, number] = facts.axisLongitudesDeg;
const optionalShort: number | null = facts.shortArcMidpointDeg;
const provenance: 'ECLIPTIC_LONGITUDE_GEOMETRY' = facts.calculationBasis;
void [axis, optionalShort, provenance];

// @ts-expect-error Both endpoints must be explicitly supplied.
calculateZodiacMidpointAxis({firstLongitudeDeg: 10});
// @ts-expect-error Longitude must be numeric.
calculateZodiacMidpointAxis({firstLongitudeDeg: '10', secondLongitudeDeg: 350});
// @ts-expect-error Axis endpoints are read-only.
facts.axisLongitudesDeg[0] = 5;
// @ts-expect-error No astronomical values are derived here.
facts.longitudeSpeedDegPerDay;
