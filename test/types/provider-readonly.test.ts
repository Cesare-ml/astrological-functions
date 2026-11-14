import type { EphemerisProvider, EphemerisRequest, NatalInput, ExperimentalNatalResult } from '../../src/ephemeris-provider.js';

const request: EphemerisRequest = {
  datetimeUtc: '2026-11-10T12:00:00Z',
  bodyName: 'Sun',
  corrections: 'APPARENT',
  frame: 'ECLIPTIC_OF_DATE'
};
// @ts-expect-error Provider requests must not be mutated.
request.bodyName = 'Moon';

const provider: EphemerisProvider = {
  async getGeocentricEcliptic(input) {
    // @ts-expect-error A WASM adapter must not rewrite request semantics.
    input.corrections = 'GEOMETRIC';
    return {
      longitudeDeg: 42,
      latitudeDeg: 0,
      metadata: { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' }
    };
  }
};

const natalInput: NatalInput = {
  datetimeUtc: '2026-11-10T12:00:00Z',
  latitudeDeg: 44,
  longitudeDegEast: 12,
  bodyNames: ['Sun', 'Moon'] as const,
  provider
};
// @ts-expect-error Body identifiers are read-only through the public contract.
natalInput.bodyNames.push('Mars');

declare const result: ExperimentalNatalResult;
// @ts-expect-error Chart provenance is a frozen snapshot.
result.ephemerisProvenance.kernelSetId = 'changed';
// @ts-expect-error Warning records are frozen at runtime.
result.warnings[0].code = 'changed';
// @ts-expect-error Body metadata snapshots are frozen at runtime.
result.bodies.Sun.ephemerisMetadata.frame = 'J2000';
