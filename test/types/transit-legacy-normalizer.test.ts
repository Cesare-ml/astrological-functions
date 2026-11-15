import {normalizeLegacyTransitSnapshot, type LegacyNatalSnapshotWithZodiac,
  type TransitSnapshotNormalizationResult} from '../../src/transit-legacy-normalizer.mjs';
import {calculateTransitFacts} from '../../src/transit-facts.mjs';

const proven={engineVersion:'mock-rust',kernelSetId:'kernel',timeModel:'TT-test'} as const;
const metadata={...proven,center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT'} as const;
const chart:LegacyNatalSnapshotWithZodiac={
  contract:'NatalChartResult',contractVersion:'0.1.0-experimental',
  datetimeUtc:'2000-01-01T12:00:00Z',
  zodiac:{type:'TROPICAL'},ephemerisProvenance:proven,
  bodies:{Sun:{name:'Sun',longitudeDeg:359,ephemerisMetadata:metadata}}
};
const result:TransitSnapshotNormalizationResult=normalizeLegacyTransitSnapshot({
  chart,selectedBodyNames:['Sun']});
const aspects=calculateTransitFacts({birthTimeKnown:true,natal:result.snapshot,
  sky:result.snapshot,aspectDefinitions:[]});
const count:number=aspects.aspects.length;
void count;
// @ts-expect-error legacy format without zodiac is not safely normalizable
const missingZodiac:LegacyNatalSnapshotWithZodiac={
  contract:'NatalChartResult',contractVersion:'0.1.0-experimental',
  datetimeUtc:'2000-01-01T12:00:00Z',ephemerisProvenance:proven,
  bodies:{Sun:{name:'Sun',longitudeDeg:1,ephemerisMetadata:metadata}}
};
void missingZodiac;
// @ts-expect-error sidereal source requires an explicit ayanamsa id
const badSidereal:LegacyNatalSnapshotWithZodiac={...chart,zodiac:{type:'SIDEREAL'}};
void badSidereal;
const badFrame:LegacyNatalSnapshotWithZodiac={...chart,bodies:{
  Sun:{name:'Sun',longitudeDeg:1,ephemerisMetadata:{...metadata,
    // @ts-expect-error J2000 body metadata is not apparent-of-date
    frame:'J2000'}}
}};
void badFrame;
