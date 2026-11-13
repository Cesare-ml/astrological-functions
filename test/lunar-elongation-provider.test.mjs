import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLunarElongationWithProvider } from 'astrological-functions/lunar-provider';

const INSTANT = '2026-11-12T12:30:00Z';
const PIN = Object.freeze({
  engineVersion: 'rust-mock-v1', kernelSetId: 'synthetic-kernel', timeModelId: 'mock-tdb-v1',
});
function provider({ sun = 359, moon = 1, mutate = (state) => state } = {}) {
  const requests = [];
  return {
    requests,
    async getGeocentricEcliptic(request) {
      requests.push(request);
      const state = {
        longitudeDeg: request.bodyName === 'Sun' ? sun : moon,
        latitudeDeg: request.bodyName === 'Sun' ? 0 : 5,
        metadata: {
          bodyName: request.bodyName, datetimeUtc: request.datetimeUtc,
          center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT', ...PIN,
        },
      };
      return mutate(state);
    },
  };
}
const run = (p, patch = {}) => calculateLunarElongationWithProvider({
  datetimeUtc: INSTANT, zodiac: 'TROPICAL', expectedEphemeris: PIN, provider: p, ...patch,
});

test('isolated mock provider yields a directed, typed immutable sector snapshot', async () => {
  const p = provider();
  const facts = await run(p);
  assert.deepEqual(p.requests.map(request => request.bodyName), ['Sun', 'Moon']);
  assert.deepEqual(p.requests.map(request => request.datetimeUtc), [INSTANT, INSTANT]);
  assert.deepEqual(p.requests.map(request => request.center), ['EARTH', 'EARTH']);
  assert.deepEqual(p.requests.map(request => request.kernelSetId), [
    PIN.kernelSetId, PIN.kernelSetId,
  ]);
  assert.deepEqual(p.requests.map(request => request.timeModelId), [
    PIN.timeModelId, PIN.timeModelId,
  ]);
  assert.ok(p.requests.every(request => Object.isFrozen(request)));
  assert.equal(facts.sectors.directedElongationDeg, 2);
  assert.equal(facts.sectors.sectorId, 'NEW');
  assert.equal(facts.positions.Moon.latitudeDeg, 5);
  assert.equal(facts.ephemeris.kernelSetId, PIN.kernelSetId);
  assert.ok(Object.isFrozen(facts));
  assert.ok(Object.isFrozen(facts.ephemeris));
  assert.ok(Object.isFrozen(facts.positions));
  assert.ok(Object.isFrozen(facts.positions.Sun));
  assert.ok(Object.isFrozen(facts.sectors));
});

test('direction and wrap cannot be replaced by unsigned angular separation', async () => {
  const facts = await run(provider({ sun: 10, moon: 280 }));
  assert.equal(facts.sectors.directedElongationDeg, 270);
  assert.equal(facts.sectors.sectorId, 'LAST_QUARTER');
});

test('reject missing, invalid, normalized or timezone-less timestamps before provider call', async () => {
  const p = provider();
  for (const datetimeUtc of [undefined, null, '2026-11-12', '2026-11-12T12:30:00+01:00',
    '2026-02-30T12:30:00Z', '2026-11-12T24:30:00Z', 'not a date',
    '2026-11-12T12:30:00.1234Z']) {
    await assert.rejects(() => run(p, { datetimeUtc }), e => e.code === 'INVALID_UTC');
  }
  assert.equal(p.requests.length, 0);
});

test('reject absent/invalid provider, non-tropical zodiac and missing provenance pin', async () => {
  const p = provider();
  await assert.rejects(() => run(p, { zodiac: 'SIDEREAL' }),
    e => e.code === 'UNSUPPORTED_LUNAR_ZODIAC');
  await assert.rejects(() => run(p, { zodiac: undefined }),
    e => e.code === 'UNSUPPORTED_LUNAR_ZODIAC');
  await assert.rejects(() => run(null), e => e.code === 'MISSING_PROVIDER');
  for (const expectedEphemeris of [null, {}, { ...PIN, engineVersion: '' },
    { ...PIN, kernelSetId: null }, { ...PIN, timeModelId: '' }]) {
    await assert.rejects(() => run(p, { expectedEphemeris }),
      e => e.code === 'INVALID_EPHEMERIS_PIN');
  }
  assert.equal(p.requests.length, 0);
});

test('reject swapped body, wrong UTC, center, frame and corrections without Moon fallback', async () => {
  for (const patch of [
    { bodyName: 'Moon' },
    { datetimeUtc: '2026-11-12T12:31:00Z' },
    { center: 'SUN' },
    { frame: 'J2000' },
    { corrections: 'GEOMETRIC' },
  ]) {
    const p = provider({ mutate: state => ({
      ...state, metadata: { ...state.metadata, ...patch },
    }) });
    await assert.rejects(() => run(p), e => e.code === 'INCOMPATIBLE_EPHEMERIS');
    assert.equal(p.requests.length, 1);
  }
});

test('reject mismatched engine version, kernel and time model before Moon fallback', async () => {
  for (const patch of [
    { engineVersion: 'different' },
    { kernelSetId: 'different' },
    { timeModelId: 'different' },
  ]) {
    const p = provider({ mutate: state => ({
      ...state, metadata: { ...state.metadata, ...patch },
    }) });
    await assert.rejects(() => run(p), e => e.code === 'INCOMPATIBLE_EPHEMERIS');
    assert.equal(p.requests.length, 1);
  }
});

test('Sun/Moon may not come from different kernels in one result', async () => {
  const p = provider({ mutate: state => state.metadata.bodyName === 'Moon'
    ? { ...state, metadata: { ...state.metadata, kernelSetId: 'wrong-kernel' } }
    : state });
  await assert.rejects(() => run(p), e => e.code === 'INCOMPATIBLE_EPHEMERIS');
  assert.equal(p.requests.length, 2);
});

test('finite geocentric longitude and latitude required; no numeric strings', async () => {
  for (const longitudeDeg of [NaN, Infinity, '2', undefined]) {
    const p = provider({ mutate: state => ({ ...state, longitudeDeg }) });
    await assert.rejects(() => run(p), e => e.code === 'INVALID_PROVIDER_POSITION');
  }
  for (const latitudeDeg of [-91, 91, NaN, '0', Infinity, undefined]) {
    const p = provider({ mutate: state => ({ ...state, latitudeDeg }) });
    await assert.rejects(() => run(p), e => e.code === 'INVALID_PROVIDER_POSITION');
  }
});

test('provider failure surfaces as typed error without retry or fallback', async () => {
  let calls = 0;
  const p = { getGeocentricEcliptic: async () => { calls++; throw new Error('secret'); } };
  await assert.rejects(() => run(p), e => e.code === 'EPHEMERIS_PROVIDER_FAILED' &&
    !e.message.includes('secret'));
  assert.equal(calls, 1);
});

test('results are fully detached from mutable input provenance', async () => {
  const expectedEphemeris = { ...PIN };
  const p = provider();
  const facts = await run(p, { expectedEphemeris });
  expectedEphemeris.kernelSetId = 'modified';
  assert.equal(facts.ephemeris.kernelSetId, PIN.kernelSetId);
  assert.equal(facts.positions.Sun.bodyName, 'Sun');
  assert.equal(facts.positions.Moon.bodyName, 'Moon');
});

test('caller-specific pin is actually forwarded, not replaced by a provider default', async () => {
  const alternate = {
    engineVersion: PIN.engineVersion,
    kernelSetId: 'another-pinned-kernel',
    timeModelId: 'another-time-model',
  };
  const p = provider();
  await assert.rejects(() => run(p, { expectedEphemeris: alternate }),
    e => e.code === 'INCOMPATIBLE_EPHEMERIS');
  assert.equal(p.requests.length, 1);
  assert.equal(p.requests[0].kernelSetId, alternate.kernelSetId);
  assert.equal(p.requests[0].timeModelId, alternate.timeModelId);
});

test('Moon provider exceptions are typed and never return a partial lunar result', async () => {
  const requests = [];
  const p = {
    async getGeocentricEcliptic(request) {
      requests.push(request.bodyName);
      if (request.bodyName === 'Moon') throw new Error('internal provider details');
      return {
        longitudeDeg: 35, latitudeDeg: 0,
        metadata: {
          bodyName: request.bodyName,
          datetimeUtc: request.datetimeUtc,
          center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
          ...PIN,
        },
      };
    },
  };
  await assert.rejects(() => run(p), e =>
    e.code === 'EPHEMERIS_PROVIDER_FAILED' &&
    !e.message.includes('internal provider details'));
  assert.deepEqual(requests, ['Sun', 'Moon']);
});

test('snapshots UTC, provider identity and method across async Sun/Moon fetches', async () => {
  const requests = [];
  const input = {
    datetimeUtc: INSTANT,
    zodiac: 'TROPICAL',
    expectedEphemeris: { ...PIN },
    provider: null,
  };
  const originalProvider = {
    async getGeocentricEcliptic(request) {
      requests.push(request);
      if (request.bodyName === 'Sun') {
        input.datetimeUtc = '2026-11-12T12:31:00Z';
        input.provider = {
          getGeocentricEcliptic: async () => { throw Error('wrong provider selected'); },
        };
        originalProvider.getGeocentricEcliptic = async () => {
          throw Error('method replaced between await points');
        };
      }
      return {
        longitudeDeg: request.bodyName === 'Sun' ? 359 : 1,
        latitudeDeg: 0,
        metadata: {
          bodyName: request.bodyName,
          datetimeUtc: request.datetimeUtc,
          center: request.center,
          frame: request.frame,
          corrections: request.corrections,
          ...PIN,
        },
      };
    },
  };
  input.provider = originalProvider;
  const result = await calculateLunarElongationWithProvider(input);
  assert.equal(result.datetimeUtc, INSTANT);
  assert.equal(result.sectors.directedElongationDeg, 2);
  assert.deepEqual(requests.map(request => request.bodyName), ['Sun', 'Moon']);
  assert.ok(requests.every(request => request.datetimeUtc === INSTANT));
  assert.ok(requests.every(request => request.center === 'EARTH'));
});

test('explicit Earth center survives the mock-provider request boundary', async () => {
  const requests = [];
  const p = {
    async getGeocentricEcliptic(request) {
      requests.push(request);
      assert.equal(request.center, 'EARTH');
      return {
        longitudeDeg: request.bodyName === 'Sun' ? 350 : 80,
        latitudeDeg: 0,
        metadata: {
          bodyName: request.bodyName,
          datetimeUtc: request.datetimeUtc,
          center: request.center,
          frame: request.frame,
          corrections: request.corrections,
          ...PIN,
        },
      };
    },
  };
  const result = await run(p);
  assert.equal(result.sectors.sectorId, 'FIRST_QUARTER');
  assert.deepEqual(requests.map(request => request.center), ['EARTH', 'EARTH']);
});
