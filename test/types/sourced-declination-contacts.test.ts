import { calculateSourcedDeclinationContacts } from '../../src/sourced-declination-contacts.mjs';
import type {
  DeclinationSnapshot,
  SourcedDeclinationContactOptions,
  SourcedDeclinationContactsResult,
} from '../../src/sourced-declination-contacts.mjs';

const source = {
  snapshotId: 'A', datetimeUtc: '2026-11-14T12:06:00Z',
  coordinates: {
    origin: 'EARTH_GEOCENTER', kind: 'EQUATORIAL_DECLINATION',
    frame: 'ICRS', frameEpochUtc: null, corrections: 'GEOMETRIC',
  },
  provenance: { providerId: 'VIRGOSTARS_EPHEMERIS', engineVersion: 'test', kernelSetId: 'test', timeModelId: 'test' },
  points: [{ name: 'Sun', declinationDeg: 18 }],
} as const satisfies DeclinationSnapshot;
const options = {
  direction: 'SKY_TO_NATAL', sourceSnapshot: source,
  targetSnapshot: { ...source, snapshotId: 'B', points: [{ name: 'Moon', declinationDeg: -18 }] },
  contactDefinitions: [{ id: 'CONTRA_PARALLEL', maxOrbDeg: 0 }],
} as const satisfies SourcedDeclinationContactOptions;
const facts: SourcedDeclinationContactsResult = calculateSourcedDeclinationContacts(options);
const frame: 'ICRS' | 'TRUE_EQUATOR_OF_DATE' = facts.sourceContext.coordinates.frame;
void frame;
// @ts-expect-error unsupported frame literal
calculateSourcedDeclinationContacts({ ...options, sourceSnapshot: { ...source, coordinates: { ...source.coordinates, frame: 'ECLIPTIC_OF_DATE' } } });
// @ts-expect-error unsupported provider identifier
calculateSourcedDeclinationContacts({ ...options, sourceSnapshot: { ...source, provenance: { ...source.provenance, providerId: 'OTHER' } } });
// @ts-expect-error mutable contact result is not exposed
facts.facts.contacts.push(facts.facts.contacts[0]!);
// @ts-expect-error ICRS frame epoch must be explicitly null
calculateSourcedDeclinationContacts({ ...options, sourceSnapshot: { ...source, coordinates: { ...source.coordinates, frameEpochUtc: '2026-11-14T12:06:00Z' } } });
