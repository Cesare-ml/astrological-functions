import {calculateTransitFactsWithProvider, type TransitCompositionInput,
  type TransitFactsWithProviderResult} from '../../src/transit-composition.mjs';
import type {TransitPositionProvider} from '../../src/transit-provider.mjs';
const metadata={center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT',
  engineVersion:'mock-v1',kernelSetId:'kernel-fixture',timeModel:'time-fixture'} as const;
const provider:TransitPositionProvider={
  capabilities:{...metadata, contract:'TransitPositionProviderCapabilities', contractVersion:'0.1.0-experimental'},
  async getGeocentricEcliptic(request){return {datetimeUtc:request.datetimeUtc,bodyName:request.bodyName,
    longitudeDeg:1,latitudeDeg:0,metadata};}
};
const input:TransitCompositionInput={
  birthTimeKnown:true,datetimeUtc:'2026-11-12T19:00:00Z',
  zodiac:{type:'TROPICAL'},bodyNames:['Mars'],expectedEphemeris:metadata,provider,
  natal:{datetimeUtc:'2000-01-01T12:00:00Z',zodiac:{type:'TROPICAL'},
    points:[{name:'Sun',longitudeDeg:359}],ephemeris:metadata},
  aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:3}]
};
const result:Promise<TransitFactsWithProviderResult>=calculateTransitFactsWithProvider(input);
void result;
// @ts-expect-error unknown birth time cannot claim exact facts
calculateTransitFactsWithProvider({...input,birthTimeKnown:false});
// @ts-expect-error incompatible geometric frame is disallowed at typing boundary
calculateTransitFactsWithProvider({...input,expectedEphemeris:{...metadata,frame:'J2000'}});
// @ts-expect-error the sidereal ayanamsa needs an explicitly named version
calculateTransitFactsWithProvider({...input,zodiac:{type:'SIDEREAL'}});
// @ts-expect-error the aspect rules must be explicit
calculateTransitFactsWithProvider({birthTimeKnown:true,natal:input.natal,datetimeUtc:input.datetimeUtc,
  zodiac:input.zodiac,bodyNames:input.bodyNames,expectedEphemeris:metadata,provider});

const selected:TransitCompositionInput={...input,natalBodyNames:['Sun']};
void calculateTransitFactsWithProvider(selected);
// @ts-expect-error natal selections must be arrays, not strings
calculateTransitFactsWithProvider({...input,natalBodyNames:'Sun'});
