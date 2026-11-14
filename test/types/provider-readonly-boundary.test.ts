import type { ApparentGeocentricState, EphemerisProvider, NatalInput, ExperimentalNatalResult } from '../../src/ephemeris-provider.js';

// Compile with strict TypeScript: these are compile-time immutability contracts,
// not a claim that external JS/WASM implementations cannot mutate their objects.
declare const state: ApparentGeocentricState;
declare const input: NatalInput;
declare const provider: EphemerisProvider;

// @ts-expect-error Provider position is readonly.
state.longitudeDeg = 10;
// @ts-expect-error Provider latitude is readonly.
state.latitudeDeg = 2;
// @ts-expect-error Provider speed is readonly.
state.longitudeSpeedDegPerDay = 1;
// @ts-expect-error Provider metadata reference cannot be replaced.
state.metadata = { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' };
// @ts-expect-error Natal instant cannot be reassigned.
input.datetimeUtc = '2026-11-12T00:00:00Z';
// @ts-expect-error Natal body list cannot be mutated.
input.bodyNames.push('Mars');

async function verifyProviderResult() {
  const result = await provider.getGeocentricEcliptic({
    datetimeUtc: '2026-11-12T00:00:00Z',
    bodyName: 'Sun',
    corrections: 'APPARENT',
    frame: 'ECLIPTIC_OF_DATE',
  });
  // @ts-expect-error Awaited provider result is readonly.
  result.longitudeDeg = 0;
  // @ts-expect-error Awaited metadata reference cannot be replaced.
  result.metadata = { center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' };
}
void verifyProviderResult;

// Runtime freezes the natal result, each body record and its metadata.
declare const chart: ExperimentalNatalResult;
// @ts-expect-error Result instant is readonly.
chart.datetimeUtc = '2026-11-13T00:00:00Z';
// @ts-expect-error The result body map cannot be replaced.
chart.bodies = {};
// @ts-expect-error A body longitude cannot be rewritten by consumers.
chart.bodies.Sun.longitudeDeg = 90;
// @ts-expect-error A body speed cannot be rewritten by consumers.
chart.bodies.Sun.longitudeSpeedDegPerDay = 0;
// @ts-expect-error A body identifier cannot be rewritten by consumers.
chart.bodies.Sun.name = 'Moon';
// @ts-expect-error Provenance object cannot be replaced.
chart.ephemerisProvenance = { engineVersion: null, kernelSetId: null, timeModel: null };
// @ts-expect-error Warning array cannot be replaced.
chart.warnings = [];
