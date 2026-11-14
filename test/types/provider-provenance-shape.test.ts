import type { ApparentGeocentricState } from '../../src/ephemeris-provider.js';

const base = {
  center: 'EARTH',
  frame: 'ECLIPTIC_OF_DATE',
  corrections: 'APPARENT',
} as const;

const synthetic: ApparentGeocentricState = {
  longitudeDeg: 12, latitudeDeg: 0, metadata: base,
};
const pinned: ApparentGeocentricState = {
  longitudeDeg: 12, latitudeDeg: 0,
  metadata: { ...base, engineVersion: 'rust-1', kernelSetId: 'de440', timeModel: 'tdb-v1' },
};
const missingKernel: ApparentGeocentricState = {
  longitudeDeg: 12, latitudeDeg: 0,
  // @ts-expect-error Partial provenance is invalid.
  metadata: { ...base, engineVersion: 'rust-1', timeModel: 'tdb-v1' },
};
const nullKernel: ApparentGeocentricState = {
  longitudeDeg: 12, latitudeDeg: 0,
  // @ts-expect-error Null kernel identity is invalid under strictNullChecks.
  metadata: { ...base, engineVersion: 'rust-1', kernelSetId: null, timeModel: 'tdb-v1' },
};
void synthetic; void pinned; void missingKernel; void nullKernel;
