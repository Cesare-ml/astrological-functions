import { calculateTransitFacts, type TransitSnapshotInput, type TransitAspectFactsResult } from '../../src/transit-facts.mjs';
const ephemeris = {
  engineVersion:'mock-v1', kernelSetId:'de441-test', timeModel:'TT-test',
  center:'EARTH', frame:'ECLIPTIC_OF_DATE', corrections:'APPARENT'
} as const;
const natal:TransitSnapshotInput={datetimeUtc:'2000-01-01T00:00:00Z',
  ephemeris, zodiac:{type:'TROPICAL'},points:[{name:'Sun',longitudeDeg:3}]};
const sky:TransitSnapshotInput={datetimeUtc:'2026-11-12T20:00:00Z',
  ephemeris, zodiac:{type:'TROPICAL'},points:[{name:'Mars',longitudeDeg:2,longitudeSpeedDegPerDay:-0.1}]};
const result:TransitAspectFactsResult=calculateTransitFacts({birthTimeKnown:true,natal,sky,
  aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:3}]});
const dir:'SKY_TO_NATAL'=result.aspects[0]!.direction;
void dir;
// @ts-expect-error no implicit unknown birth-time trust
calculateTransitFacts({birthTimeKnown:false,natal,sky,aspectDefinitions:[]});
// @ts-expect-error no geometric J2000 metadata
const invalid:TransitSnapshotInput={datetimeUtc:'2026-11-12T20:00:00Z',zodiac:{type:'TROPICAL'},points:[],ephemeris:{...ephemeris,frame:'J2000'}};
void invalid;
// @ts-expect-error no sidereal zodiac without ayanamsa
const sidereal:TransitSnapshotInput={...natal,zodiac:{type:'SIDEREAL'}};
void sidereal;
