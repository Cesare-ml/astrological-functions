import type {
  LongitudeEnclosureProvider,LongitudeEnclosureRequest,
  LongitudeEnclosureResponse,LongitudeEnclosureCapabilities,
  EnclosureCoordinates,SynastryEnclosureProviderInput,
  SynastryProviderUncertaintyResult,
} from '../../src/synastry-enclosure-provider.mjs';
import type { SynastryAspectsOnlyResult } from '../../src/synastry-aspects-only.mjs';

declare const aspectsOnlyResult:SynastryAspectsOnlyResult;
declare const response:LongitudeEnclosureResponse;
declare const providerResult:SynastryProviderUncertaintyResult;

const coords:EnclosureCoordinates={
  center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT',
};
const caps:LongitudeEnclosureCapabilities={
  contract:'LongitudeEnclosureProviderCapabilities',
  contractVersion:'0.1.0-experimental',
  continuousCoverage:'PROVIDER_ASSERTED_FULL_INTERVAL_INCLUDING_STATIONS',
  coordinates:coords,
};
const provider:LongitudeEnclosureProvider={
  capabilities:caps,
  getContinuousLongitudeEnclosure(request:Readonly<LongitudeEnclosureRequest>){
    const bodyNames:readonly string[]=request.bodyNames;
    void bodyNames;
    return Promise.resolve(response);
  },
};
const input:SynastryEnclosureProviderInput={
  aspectsOnlyResult,
  provider,
  intervalA:{startUtc:'2026-01-01T00:00:00Z',endUtc:'2026-01-01T23:59:59Z'},
  intervalB:{startUtc:'2026-02-01T12:00:00Z',endUtc:'2026-02-01T12:00:00Z'},
};
const status:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED'=providerResult.status;
const output:Promise<Readonly<SynastryProviderUncertaintyResult>>=
  import('../../src/synastry-enclosure-provider.mjs').then(m=>
    m.analyzeSynastryUncertaintyWithProvider(input));
void output;void status;

// @ts-expect-error interval B is required, even for one known-time chart
const missingInterval:SynastryEnclosureProviderInput={
  aspectsOnlyResult,provider,
  intervalA:{startUtc:'2026-01-01T00:00:00Z',endUtc:'2026-01-01T23:59:59Z'},
};
const badCoordinates:EnclosureCoordinates={
  center:'EARTH',
  // @ts-expect-error J2000 geometric coordinates cannot be used as apparent of date
  frame:'J2000',
  corrections:'APPARENT',
};
const badCapabilities:LongitudeEnclosureCapabilities={
  contract:'LongitudeEnclosureProviderCapabilities',
  contractVersion:'0.1.0-experimental',
  // @ts-expect-error sample-only coverage cannot satisfy continuous interval contract
  continuousCoverage:'DISCRETE_SAMPLES',
  coordinates:coords,
};
const badResponse:LongitudeEnclosureResponse={
  contract:'LongitudeEnclosureResponse',contractVersion:'0.1.0-experimental',
  chart:'A',intervalStartUtc:'2026-01-01T00:00:00Z',
  intervalEndUtc:'2026-01-01T23:59:59Z',representativeUtc:'2026-01-01T12:00:00Z',
  // @ts-expect-error provider response must explicitly assert full interval including stations
  coverage:'SAMPLES_ONLY',
  coordinates:coords,
  ephemerisProvenance:{engineVersion:'synthetic',kernelSetId:'synthetic',timeModel:'UTC'},
  coverageEvidence:{algorithmId:'synthetic',method:'PROVIDER_DECLARED_CONTINUOUS_BOUNDS',
    stationHandling:'INCLUDED',errorIncludedInArcs:true,maxLongitudeErrorDeg:0},
  bodies:{Sun:{startDeg:358,spanDeg:3}},
};
void missingInterval;void badCoordinates;void badCapabilities;void badResponse;
