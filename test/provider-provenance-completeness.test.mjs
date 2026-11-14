import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalWithProvider } from '../src/index.mjs';

const input = {
  datetimeUtc: '2026-11-12T00:00:00Z',
  latitudeDeg: 0,
  longitudeDegEast: 0,
  bodyNames: ['Sun', 'Moon'],
};
const baseMetadata = {
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
};
function provider(metadataForBody) {
  return {
    getGeocentricEcliptic: async ({ bodyName }) => ({
      longitudeDeg: bodyName === 'Sun' ? 12 : 28,
      latitudeDeg: 0,
      metadata: { ...baseMetadata, ...metadataForBody(bodyName) },
    }),
  };
}

test('partial provenance fails closed even for a single body', async () => {
  await assert.rejects(
    () => calculateNatalWithProvider({
      ...input, bodyNames: ['Sun'],
      provider: provider(() => ({ engineVersion: 'test-engine' })),
    }),
    error => error.code === 'INVALID_EPHEMERIS_RESULT',
  );
});

test('complete but inconsistent provenance across bodies is rejected', async () => {
  await assert.rejects(
    () => calculateNatalWithProvider({
      ...input,
      provider: provider(name => ({
        engineVersion: 'test-engine', kernelSetId: name, timeModel: 'test-time',
      })),
    }),
    error => error.code === 'INCONSISTENT_EPHEMERIS',
  );
});

test('complete consistent provenance is retained', async () => {
  const result = await calculateNatalWithProvider({
    ...input,
    provider: provider(() => ({
      engineVersion: 'test-engine', kernelSetId: 'test-kernel', timeModel: 'test-time',
    })),
  });
  assert.deepEqual({ ...result.ephemerisProvenance }, {
    engineVersion: 'test-engine', kernelSetId: 'test-kernel', timeModel: 'test-time',
  });
});

test('all-absent provenance remains allowed for synthetic mocks', async () => {
  const result = await calculateNatalWithProvider({
    ...input, provider: provider(() => ({})),
  });
  assert.deepEqual({ ...result.ephemerisProvenance }, {
    engineVersion: null, kernelSetId: null, timeModel: null,
  });
});
