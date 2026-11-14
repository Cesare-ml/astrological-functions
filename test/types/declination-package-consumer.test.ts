import { calculateDeclinationContacts, type DeclinationContactOptions } from 'astrological-functions/declination-contacts';
import { calculateSourcedDeclinationContacts, type DeclinationSnapshot } from 'astrological-functions/sourced-declination-contacts';
import {
  calculateDeclinationContactsWithProvider,
  type ExperimentalDeclinationProvider,
  type DeclinationWithProviderOptions,
  type DeclinationProviderResponse,
} from 'astrological-functions/declination-provider';

const options = {
  direction: 'SKY_TO_NATAL',
  sourcePoints: [{ name: 'Sun', declinationDeg: 18 }],
  targetPoints: [{ name: 'Moon', declinationDeg: -18 }],
  contactDefinitions: [{ id: 'CONTRA_PARALLEL', maxOrbDeg: 0.2 }],
} as const satisfies DeclinationContactOptions;
const contact = calculateDeclinationContacts(options);
const orb: number | undefined = contact.contacts[0]?.absoluteOrbDeg;
void orb;
const provenance = {
  providerId: 'VIRGOSTARS_EPHEMERIS',
  engineVersion: 'synthetic', kernelSetId: 'synthetic', timeModelId: 'synthetic',
} as const;
const coordinates = {
  origin: 'EARTH_GEOCENTER', kind: 'EQUATORIAL_DECLINATION',
  frame: 'ICRS', frameEpochUtc: null, corrections: 'GEOMETRIC',
} as const;
const snapshot = {
  snapshotId: 'A', datetimeUtc: '2000-01-01T12:00:00Z',
  coordinates, provenance,
  points: [{ name: 'Sun', declinationDeg: 18 }],
} as const satisfies DeclinationSnapshot;
const sourced = calculateSourcedDeclinationContacts({
  direction: 'A_TO_B', sourceSnapshot: snapshot,
  targetSnapshot: { ...snapshot, snapshotId: 'B' },
  contactDefinitions: [{ id: 'PARALLEL', maxOrbDeg: 1 }],
});
const sourceVersion: string = sourced.sourceContext.provenance.engineVersion;
void sourceVersion;
const provider: ExperimentalDeclinationProvider = {
  async getGeocentricEquatorialDeclination(request): Promise<DeclinationProviderResponse> {
    return {
      snapshotId: request.snapshotId, datetimeUtc: request.datetimeUtc,
      bodyId: request.bodyId, declinationDeg: 18,
      coordinates: request.coordinates, provenance: request.expectedProvenance,
    };
  },
};
const request = {
  direction: 'SKY_TO_NATAL',
  source: { snapshotId: 'A', datetimeUtc: '2000-01-01T12:00:00Z', bodyIds: ['Sun'] },
  target: { snapshotId: 'B', datetimeUtc: '2001-01-01T12:00:00Z', bodyIds: ['Moon'] },
  coordinates: {
    origin: 'EARTH_GEOCENTER', kind: 'EQUATORIAL_DECLINATION',
    frame: 'ICRS', corrections: 'GEOMETRIC',
  },
  expectedProvenance: provenance,
  contactDefinitions: [{ id: 'PARALLEL', maxOrbDeg: 1 }],
  provider, signal: new AbortController().signal,
} as const satisfies DeclinationWithProviderOptions;
const outcome = calculateDeclinationContactsWithProvider(request);
const typed: Promise<import('astrological-functions/sourced-declination-contacts').SourcedDeclinationContactsResult> = outcome;
void typed;
// @ts-expect-error unsupported contact name
calculateDeclinationContacts({ ...options, contactDefinitions: [{ id: 'SQUARE', maxOrbDeg: 1 }] });
// @ts-expect-error sourced contract refuses unsupported frame
calculateSourcedDeclinationContacts({ direction: 'A_TO_B', sourceSnapshot: { ...snapshot, coordinates: { ...coordinates, frame: 'ECLIPTIC_OF_DATE' } }, targetSnapshot: snapshot, contactDefinitions: [{ id: 'PARALLEL', maxOrbDeg: 1 }] });
// @ts-expect-error provider cannot declare Swiss as its source
calculateDeclinationContactsWithProvider({ ...request, expectedProvenance: { ...provenance, providerId: 'SWISS' } });
// @ts-expect-error signal must implement AbortSignal
calculateDeclinationContactsWithProvider({ ...request, signal: { aborted: true } });
// @ts-expect-error private source implementation subpath intentionally not exported
import { calculateDeclinationContactsWithProvider as privateSource } from 'astrological-functions/src/declination-provider-gate.mjs';
void privateSource;
