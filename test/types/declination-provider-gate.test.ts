import { calculateDeclinationContactsWithProvider } from '../../src/declination-provider-gate.mjs';
import type {
  DeclinationProviderRequest,
  DeclinationProviderResponse,
  DeclinationWithProviderOptions,
  ExperimentalDeclinationProvider,
} from '../../src/declination-provider-gate.mjs';

const provider: ExperimentalDeclinationProvider = {
  async getGeocentricEquatorialDeclination(request: DeclinationProviderRequest): Promise<DeclinationProviderResponse> {
    return {
      snapshotId: request.snapshotId,
      datetimeUtc: request.datetimeUtc,
      bodyId: request.bodyId,
      declinationDeg: 18,
      coordinates: request.coordinates,
      provenance: request.expectedProvenance,
    };
  },
};
const options = {
  direction: 'A_TO_B',
  source: { snapshotId: 'A', datetimeUtc: '2000-01-01T12:00:00Z', bodyIds: ['Sun'] },
  target: { snapshotId: 'B', datetimeUtc: '2005-01-01T12:00:00Z', bodyIds: ['Moon'] },
  coordinates: {
    origin: 'EARTH_GEOCENTER', kind: 'EQUATORIAL_DECLINATION',
    frame: 'ICRS', corrections: 'GEOMETRIC',
  },
  expectedProvenance: {
    providerId: 'VIRGOSTARS_EPHEMERIS',
    engineVersion: 'synthetic', kernelSetId: 'synthetic', timeModelId: 'synthetic',
  },
  contactDefinitions: [{ id: 'PARALLEL', maxOrbDeg: 1 }],
  provider,
} as const satisfies DeclinationWithProviderOptions;
const result = calculateDeclinationContactsWithProvider(options);
const contacts: Promise<import('../../src/sourced-declination-contacts.mjs').SourcedDeclinationContactsResult> = result;
void contacts;

// @ts-expect-error fail typing for unsupported direction
calculateDeclinationContactsWithProvider({ ...options, direction: 'UNSPECIFIED' });
// @ts-expect-error fail typing for ecliptic coordinate kind
calculateDeclinationContactsWithProvider({ ...options, coordinates: { ...options.coordinates, kind: 'ECLIPTIC_LATITUDE' } });
// @ts-expect-error fail typing for unknown provider provenance
calculateDeclinationContactsWithProvider({ ...options, expectedProvenance: { ...options.expectedProvenance, providerId: 'SWISS_EPHEMERIS' } });
// @ts-expect-error provider method is required
calculateDeclinationContactsWithProvider({ ...options, provider: {} });
// @ts-expect-error valid provider response must identify the originating snapshot
const invalidResponse: DeclinationProviderResponse = { datetimeUtc: '2000-01-01T12:00:00Z', bodyId: 'Sun', declinationDeg: 18, coordinates: {
  ...options.coordinates, frameEpochUtc: null,
}, provenance: options.expectedProvenance };
void invalidResponse;
