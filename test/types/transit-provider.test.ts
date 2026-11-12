import {getTransitSkySnapshotWithProvider, type TransitSkyProviderInput,
  type TransitPositionProvider, type TransitSkyProviderResult} from '../../src/transit-provider.mjs';
const metadata = { center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT',engineVersion:'v',kernelSetId:'k',timeModel:'tt' } as const;
const provider: TransitPositionProvider = {
  capabilities:{...metadata,contract:'TransitPositionProviderCapabilities',contractVersion:'0.1.0-experimental'},
  async getGeocentricEcliptic(request) {
    return {bodyName:request.bodyName, datetimeUtc:request.datetimeUtc,longitudeDeg:1,
      latitudeDeg:0,metadata};
  }
};
const params: TransitSkyProviderInput = {datetimeUtc:'2026-11-12T19:00:00Z',
  zodiac:{type:'TROPICAL'},bodyNames:['Sun'],expectedEphemeris:metadata,provider};
const result: Promise<TransitSkyProviderResult> = getTransitSkySnapshotWithProvider(params);
void result;
// @ts-expect-error wrong coordinate frame must not type-check
const wrongFrame: TransitSkyProviderInput = {...params, expectedEphemeris:{...metadata,frame:'J2000'}};
void wrongFrame;
// @ts-expect-error unversioned sidereal ayanamsa must not type-check
const wrongZodiac: TransitSkyProviderInput = {...params, zodiac:{type:'SIDEREAL'}};
void wrongZodiac;
// @ts-expect-error even a versioned sidereal ayanamsa is unsupported by raw-of-date provider
const unsupportedSidereal: TransitSkyProviderInput = {...params, zodiac:{type:'SIDEREAL',ayanamsaId:'LAHIRI-v1'}};
void unsupportedSidereal;
// @ts-expect-error only the experimental version is valid
const wrongProvider: TransitPositionProvider = {...provider, capabilities:{...provider.capabilities,contractVersion:'1.0'}};
void wrongProvider;
