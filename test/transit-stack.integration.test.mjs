import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTransitFacts } from '../src/transit-facts.mjs';
import { getTransitSkySnapshotWithProvider } from '../src/transit-provider.mjs';
import { calculateTransitFactsWithProvider } from '../src/transit-composition.mjs';

const metadata = Object.freeze({ center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
  engineVersion: 'isolated-rust-fixture', kernelSetId: 'synthetic-kernel', timeModel: 'TT-fixture' });
function fixture() {
  const requests = [];
  const provider = {
    capabilities: { contract: 'TransitPositionProviderCapabilities', contractVersion: '0.1.0-experimental', ...metadata },
    async getGeocentricEcliptic(request) {
      requests.push(request);
      return { datetimeUtc: request.datetimeUtc, bodyName: request.bodyName,
        longitudeDeg: request.bodyName === 'Mars' ? 359 : 181,
        latitudeDeg: 0, metadata: { ...metadata } };
    }
  };
  return { requests, input: {
    birthTimeKnown: true, provider, datetimeUtc: '2026-11-12T19:00:00Z',
    zodiac: { type: 'TROPICAL' }, expectedEphemeris: { ...metadata },
    natal: { datetimeUtc: '2000-01-01T12:00:00Z', zodiac: { type: 'TROPICAL' }, ephemeris: { ...metadata },
      points: [{ name: 'Sun', longitudeDeg: 1 }, { name: 'Moon', longitudeDeg: 181 }] },
    bodyNames: ['Mars'], natalBodyNames: ['Sun'],
    aspectDefinitions: [{ id: 'conj', angleDeg: 0, maxOrbDeg: 2 }, { id: 'opp', angleDeg: 180, maxOrbDeg: 2 }]
  }};
}

test('composed facts equal manual provider-then-pure pipeline and retain warning', async () => {
  const { input, requests } = fixture();
  const assembled = await calculateTransitFactsWithProvider(input);
  const sky = await getTransitSkySnapshotWithProvider({
    provider: input.provider, datetimeUtc: input.datetimeUtc, zodiac: input.zodiac,
    bodyNames: input.bodyNames, expectedEphemeris: input.expectedEphemeris
  });
  const pure = calculateTransitFacts({ birthTimeKnown: true,
    natal: { ...input.natal, points: input.natal.points.filter(p => input.natalBodyNames.includes(p.name)) },
    sky: sky.sky, aspectDefinitions: input.aspectDefinitions });
  assert.deepEqual(assembled.facts, pure);
  assert.equal(assembled.facts.direction, 'SKY_TO_NATAL');
  assert.deepEqual(assembled.facts.aspects.map(a => [a.source.name, a.target.name, a.aspectId]), [['Mars', 'Sun', 'conj']]);
  assert.equal(assembled.status, 'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED');
  assert.deepEqual(assembled.warnings.map(w => w.code), ['EPHEMERIS_ACCURACY_NOT_VERIFIED']);
  assert.equal(requests.length, 2);
  assert.ok(Object.isFrozen(assembled.facts.sky.points));
});

test('a versioned sidereal request is rejected before either provider or aspect evaluation', async () => {
  const { input, requests } = fixture();
  input.zodiac = { type: 'SIDEREAL', ayanamsaId: 'LAHIRI-v1' };
  input.natal.zodiac = { type: 'SIDEREAL', ayanamsaId: 'LAHIRI-v1' };
  await assert.rejects(calculateTransitFactsWithProvider(input), e => e.code === 'UNSUPPORTED_ZODIAC_CONVERSION');
  assert.equal(requests.length, 0);
});

test('an invalid natal selection cannot make provider calls or create partial facts', async () => {
  const { input, requests } = fixture();
  input.natalBodyNames = ['MissingBody'];
  await assert.rejects(calculateTransitFactsWithProvider(input), e => e.code === 'INVALID_BODIES');
  assert.equal(requests.length, 0);
});

test('inconsistent per-body engine assertions abort the combined pipeline atomically', async () => {
  const { input, requests } = fixture();
  input.bodyNames = ['Mars', 'Venus'];
  const original = input.provider.getGeocentricEcliptic;
  input.provider.getGeocentricEcliptic = async request => {
    const output = await original(request);
    return request.bodyName === 'Venus' ? { ...output, metadata: { ...output.metadata, kernelSetId: 'untrusted-kernel' } } : output;
  };
  await assert.rejects(calculateTransitFactsWithProvider(input), e => e.code === 'INCONSISTENT_EPHEMERIS');
  assert.equal(requests.length, 2);
});
