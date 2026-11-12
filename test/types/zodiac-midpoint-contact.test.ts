import { calculateZodiacMidpointContacts, type ZodiacMidpointContactsFacts } from '../../src/zodiac-midpoint-contact.mjs';
const facts: Readonly<ZodiacMidpointContactsFacts> = calculateZodiacMidpointContacts({
  firstLongitudeDeg:350,secondLongitudeDeg:10,targetLongitudeDeg:0,maxOrbDeg:3
});
const tuple: readonly [number, number] = facts.midpointAxis.axisLongitudesDeg;
const matches: readonly number[] = facts.matchingAxisLongitudesDeg;
const contact: boolean = facts.contacts[0].withinOrb;
void [tuple,matches,contact];
// @ts-expect-error Explicit orb required.
calculateZodiacMidpointContacts({firstLongitudeDeg:0,secondLongitudeDeg:30,targetLongitudeDeg:15});
// @ts-expect-error A longitude must be numeric.
calculateZodiacMidpointContacts({firstLongitudeDeg:'0',secondLongitudeDeg:30,targetLongitudeDeg:15,maxOrbDeg:1});
// @ts-expect-error Return contact facts are readonly.
facts.contacts[0].withinOrb = false;
// @ts-expect-error No derived sky/ephemeris calculations.
facts.longitudeSpeedDegPerDay;
