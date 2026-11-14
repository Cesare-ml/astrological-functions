import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from '../src/index.mjs';

const input = {
  datetimeUtc: '2026-11-10T12:00:00Z',
  latitudeDeg: 44,
  longitudeDegEast: 12,
  bodyNames: ['Sun', 'Moon'],
};
const metadata = (values = {}) => ({
  center: 'EARTH',
  frame: 'ECLIPTIC_OF_DATE',
  corrections: 'APPARENT',
  ...values,
});
function providerWithMetadata(first, second) {
  let index = 0;
  return {
    async getGeocentricEcliptic() {
      const responseMetadata = index++ === 0 ? first : second;
      return { longitudeDeg: 42, latitudeDeg: 0, metadata: responseMetadata };
    },
  };
}

test('matching engine, kernel and time model can assemble one chart', async () => {
  const first = metadata({engineVersion:'rust-0.1', kernelSetId:'de441-test', timeModel:'TDB-1'});
  const second = metadata({engineVersion:'rust-0.1', kernelSetId:'de441-test', timeModel:'TDB-1'});
  const result = await calculateNatalWithProvider({...input, provider:providerWithMetadata(first, second)});
  assert.deepEqual(Object.keys(result.bodies), ['Sun', 'Moon']);
  assert.equal(result.bodies.Moon.ephemerisMetadata.kernelSetId, 'de441-test');
});

test('rejects mixed versions, kernel sets and time models', async () => {
  for (const key of ['engineVersion', 'kernelSetId', 'timeModel']) {
    const base = {engineVersion:'rust-0.1', kernelSetId:'kernel-A', timeModel:'TDB-1'};
    const different = {...base, [key]:base[key]+'-other'};
    await assert.rejects(
      calculateNatalWithProvider({...input, provider:providerWithMetadata(metadata(base), metadata(different))}),
      error => error.code === 'INCONSISTENT_EPHEMERIS', key);
  }
});

test('rejects mixing missing and present provenance in either order', async () => {
  const complete = {engineVersion:'rust-0.1', kernelSetId:'kernel-A', timeModel:'TDB-1'};
  for (const [first, second] of [
    [metadata(), metadata(complete)],
    [metadata(complete), metadata()],
  ]) {
    await assert.rejects(
      calculateNatalWithProvider({...input, provider:providerWithMetadata(first, second)}),
      error => error.code === 'INCONSISTENT_EPHEMERIS');
  }
});

test('rejects malformed nonempty provenance fields', async () => {
  for (const malformed of ['  ', 12, false]) {
    await assert.rejects(
      calculateNatalWithProvider({...input, provider:providerWithMetadata(
        metadata({kernelSetId:malformed}), metadata())}),
      error => error.code === 'INVALID_EPHEMERIS_RESULT');
  }
});

test('providers omitting all optional provenance remain compatible', async () => {
  const result = await calculateNatalWithProvider({...input,
    provider:providerWithMetadata(metadata(), metadata())});
  assert.equal(result.bodies.Sun.longitudeDeg, 42);
  assert.equal(result.bodies.Moon.longitudeDeg, 42);
});
