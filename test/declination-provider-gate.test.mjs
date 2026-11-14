import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDeclinationContactsWithProvider } from '../src/declination-provider-gate.mjs';

const utc1 = '2000-02-29T12:00:00.123Z';
const utc2 = '2026-11-14T12:06:00Z';
const coordinates = Object.freeze({ origin: 'EARTH_GEOCENTER', kind: 'EQUATORIAL_DECLINATION',
  frame: 'ICRS', corrections: 'GEOMETRIC' });
const expectedProvenance = Object.freeze({ providerId: 'VIRGOSTARS_EPHEMERIS',
  engineVersion: 'rust-synthetic', kernelSetId: 'kernel-synthetic', timeModelId: 'time-synthetic' });
const source = { snapshotId: 'source', datetimeUtc: utc1, bodyIds: ['Sun'] };
const target = { snapshotId: 'target', datetimeUtc: utc2, bodyIds: ['Moon'] };
const contactDefinitions = [{ id: 'CONTRA_PARALLEL', maxOrbDeg: 0.5 }];
const values = { Sun: 18, Moon: -18.2, Venus: -18.1 };
const response = request => ({ snapshotId: request.snapshotId, bodyId: request.bodyId,
  datetimeUtc: request.datetimeUtc, declinationDeg: values[request.bodyId],
  coordinates: request.coordinates, provenance: request.expectedProvenance });
const fake = (f = response) => ({ getGeocentricEquatorialDeclination: async request => f(request) });
const input = provider => ({ direction: 'A_TO_B', source, target, coordinates,
  expectedProvenance, contactDefinitions, provider });
const calculate = (patch = {}, provider = fake()) => calculateDeclinationContactsWithProvider({ ...input(provider), ...patch });
async function fails(promise, code) {
  await assert.rejects(promise, error => error?.name === 'AstrologyError' && error.code === code);
}

test('mock provider supplies typed geocentric declinations in source-then-target order', async () => {
  const calls = [];
  const out = await calculate({}, fake(r => { calls.push(r); return response(r); }));
  assert.deepEqual(calls.map(r => [r.snapshotId, r.bodyId]), [['source', 'Sun'], ['target', 'Moon']]);
  assert.equal(out.contract, 'SourcedDeclinationContactsResult');
  assert.equal(out.facts.contacts.length, 1);
  assert.equal(out.facts.contacts[0].contactId, 'CONTRA_PARALLEL');
  assert.ok(Math.abs(out.facts.contacts[0].absoluteOrbDeg - 0.2) < 1e-12);
  for (const request of calls) {
    assert.equal(request.coordinates.frameEpochUtc, null);
    assert.equal(request.expectedProvenance.kernelSetId, 'kernel-synthetic');
    assert.equal(Object.isFrozen(request), true);
    assert.equal(Object.isFrozen(request.coordinates), true);
    assert.equal(Object.isFrozen(request.expectedProvenance), true);
  }
  assert.equal(Object.isFrozen(out.facts.contacts), true);
});

test('time-varying true equator accepts identical UTC only and pins request epochs', async () => {
  const selection = { ...target, datetimeUtc: utc1 };
  const calls = [];
  const out = await calculate({ target: selection,
    coordinates: { ...coordinates, frame: 'TRUE_EQUATOR_OF_DATE' } },
  fake(r => { calls.push(r); return response(r); }));
  assert.equal(out.sourceContext.coordinates.frameEpochUtc, utc1);
  assert.deepEqual(calls.map(c => c.coordinates.frameEpochUtc), [utc1, utc1]);
});

test('different-epoch of-date requests are rejected before touching provider', async () => {
  let calls = 0;
  await fails(calculate({ coordinates: { ...coordinates, frame: 'TRUE_EQUATOR_OF_DATE' } },
    fake(r => { calls++; return response(r); })), 'INCOMPATIBLE_DECLINATION_FRAMES');
  assert.equal(calls, 0);
});

test('all ordinary input errors are rejected before the first provider call', async () => {
  let calls = 0;
  const provider = fake(r => { calls++; return response(r); });
  const bad = [
    [{ source: { ...source, datetimeUtc: '2026-02-30T12:00:00Z' } }, 'INVALID_DECLINATION_PROVIDER_INPUT'],
    [{ source: { ...source, bodyIds: [] } }, 'INVALID_DECLINATION_PROVIDER_INPUT'],
    [{ source: { ...source, bodyIds: ['Sun', 'Sun'] } }, 'INVALID_DECLINATION_PROVIDER_INPUT'],
    [{ source: { ...source, bodyIds: ['__proto__', 'constructor', ...new Array(31).fill('X')] } }, 'INVALID_DECLINATION_PROVIDER_INPUT'],
    [{ source: { ...source, snapshotId: ' ' } }, 'INVALID_DECLINATION_PROVIDER_INPUT'],
    [{ target: { ...target, datetimeUtc: '2026-11-14T24:00:00Z' } }, 'INVALID_DECLINATION_PROVIDER_INPUT'],
    [{ coordinates: { ...coordinates, frame: 'ECLIPTIC_OF_DATE' } }, 'INVALID_DECLINATION_PROVIDER_INPUT'],
    [{ coordinates: { ...coordinates, origin: 'HELIOCENTER' } }, 'INVALID_DECLINATION_PROVIDER_INPUT'],
    [{ expectedProvenance: { ...expectedProvenance, timeModelId: '' } }, 'INVALID_DECLINATION_PROVIDER_INPUT'],
    [{ expectedProvenance: { ...expectedProvenance, providerId: 'SWISS_EPHEMERIS' } }, 'INVALID_DECLINATION_PROVIDER_INPUT'],
    [{ direction: 'NATAL_TO_SKY' }, 'INVALID_DECLINATION_DIRECTION'],
    [{ contactDefinitions: [{ id: 'PARALLEL' }] }, 'INVALID_DECLINATION_CONTACT'],
    [{ contactDefinitions: [{ id: 'PARALLEL', maxOrbDeg: NaN }] }, 'INVALID_DECLINATION_CONTACT'],
    [{ contactDefinitions: [{ id: 'SQUARE', maxOrbDeg: 1 }] }, 'INVALID_DECLINATION_CONTACT'],
    [{ contactDefinitions: [{ id: 'PARALLEL', maxOrbDeg: 1 }, { id: 'PARALLEL', maxOrbDeg: 2 }] }, 'INVALID_DECLINATION_CONTACT'],
  ];
  for (const [patch, code] of bad) {
    await fails(calculate(patch, provider), code);
  }
  assert.equal(calls, 0);
});

test('missing and invalid provider fail without fallback', async () => {
  await fails(calculate({ provider: null }), 'MISSING_DECLINATION_PROVIDER');
  await fails(calculate({ provider: { getGeocentricEquatorialDeclination: true } }), 'MISSING_DECLINATION_PROVIDER');
  await fails(calculateDeclinationContactsWithProvider(null), 'INVALID_DECLINATION_PROVIDER_INPUT');
});

test('provider body, snapshot and UTC identity mismatches fail closed at first response', async () => {
  for (const patch of [{ snapshotId: 'wrong' }, { bodyId: 'Mars' }, { datetimeUtc: utc2 }]) {
    let count = 0;
    await fails(calculate({}, fake(r => { count++; return { ...response(r), ...patch }; })), 'INVALID_DECLINATION_PROVIDER_RESULT');
    assert.equal(count, 1);
  }
});

test('provider missing, nonfinite, out-of-range or coerced declinations fail closed', async () => {
  for (const value of [null, undefined, NaN, Infinity, -Infinity, 91, -91, '18']) {
    let count = 0;
    await fails(calculate({}, fake(r => { count++; return { ...response(r), declinationDeg: value }; })), 'INVALID_DECLINATION_PROVIDER_RESULT');
    assert.equal(count, 1);
  }
  await fails(calculate({}, fake(() => null)), 'INVALID_DECLINATION_PROVIDER_RESULT');
});

test('all frame and correction discrepancies from provider fail before subsequent body calls', async () => {
  const patches = [{ frame: 'TRUE_EQUATOR_OF_DATE' }, { frameEpochUtc: utc1 },
    { kind: 'ECLIPTIC_LATITUDE' }, { origin: 'BARYCENTER' }, { corrections: 'APPARENT' }];
  for (const patch of patches) {
    let count = 0;
    await fails(calculate({}, fake(r => {
      count++;
      return { ...response(r), coordinates: { ...r.coordinates, ...patch } };
    })), 'INCOMPATIBLE_DECLINATION_PROVIDER_FRAME');
    assert.equal(count, 1);
  }
});

test('all provenance discrepancies from provider fail before subsequent body calls', async () => {
  for (const field of ['providerId', 'engineVersion', 'kernelSetId', 'timeModelId']) {
    let count = 0;
    await fails(calculate({}, fake(r => {
      count++;
      return { ...response(r), provenance: { ...r.expectedProvenance, [field]: 'forged' } };
    })), 'INCOMPATIBLE_DECLINATION_PROVIDER_PROVENANCE');
    assert.equal(count, 1);
  }
  await fails(calculate({}, fake(r => ({ ...response(r), provenance: undefined }))),
    'INCOMPATIBLE_DECLINATION_PROVIDER_PROVENANCE');
});

test('asynchronous mutation of caller body IDs and metadata cannot alter queued requests', async () => {
  const bodies = ['Sun', 'Venus'];
  const from = { ...source, bodyIds: bodies };
  const provenance = { ...expectedProvenance };
  const methods = [{ id: 'CONTRA_PARALLEL', maxOrbDeg: 0.5 }];
  const observed = [];
  const provider = { getGeocentricEquatorialDeclination: async r => {
    observed.push(r);
    if (observed.length === 1) {
      bodies.push('Mars');
      bodies[1] = 'Jupiter';
      provenance.engineVersion = 'wrong';
      methods[0].maxOrbDeg = 0;
    }
    return response(r);
  } };
  const out = await calculate({ source: from, expectedProvenance: provenance,
    contactDefinitions: methods }, provider);
  assert.deepEqual(observed.map(x => x.bodyId), ['Sun', 'Venus', 'Moon']);
  assert.equal(out.sourceContext.provenance.engineVersion, 'rust-synthetic');
  assert.equal(out.facts.contacts.length, 1);
  assert.equal(out.facts.contacts[0].configuredMaxOrbDeg, 0.5);
});

test('same side may request __proto__, constructor and toString as independent body IDs', async () => {
  const ids = ['__proto__', 'constructor', 'toString'];
  const got = [];
  const out = await calculate({ source: { ...source, bodyIds: ids } }, fake(r => {
    got.push(r.bodyId);
    return { ...response(r), declinationDeg: r.bodyId === 'Moon' ? -18.2 : 18 };
  }));
  assert.deepEqual(got, [...ids, 'Moon']);
  assert.deepEqual(out.facts.contacts.map(x => x.source.name), ids);
});

test('rejected provider promise propagates and no partial results are returned', async () => {
  let count = 0;
  const failure = new Error('rust adapter unavailable');
  await assert.rejects(calculate({}, { getGeocentricEquatorialDeclination: async () => {
    count++;
    throw failure;
  } }), error => error === failure);
  assert.equal(count, 1);
});

test('invalid response on later body causes failure before target snapshot starts', async () => {
  const calls = [];
  await fails(calculate({ source: { ...source, bodyIds: ['Sun', 'Venus'] } },
    fake(r => { calls.push(r.bodyId); return r.bodyId === 'Venus'
      ? { ...response(r), declinationDeg: Infinity } : response(r); })), 'INVALID_DECLINATION_PROVIDER_RESULT');
  assert.deepEqual(calls, ['Sun', 'Venus']);
});


test('provider method is pinned once before first await even if provider mutates it', async () => {
  const requests = [];
  const provider = {
    async getGeocentricEquatorialDeclination(request) {
      assert.equal(this, provider, 'preserve method receiver for stateful adapters');
      requests.push(request.bodyId);
      if (requests.length === 1) {
        this.getGeocentricEquatorialDeclination = async secondRequest => ({
          ...response(secondRequest), declinationDeg: 18.2,
        });
      }
      return response(request);
    },
  };
  const out = await calculate({}, provider);
  assert.deepEqual(requests, ['Sun', 'Moon']);
  assert.equal(out.facts.contacts.length, 1);
  assert.equal(out.facts.contacts[0].contactId, 'CONTRA_PARALLEL');
});

test('provider accessor is read once, never re-evaluated for each celestial body', async () => {
  let accesses = 0;
  const calls = [];
  const provider = {
    get getGeocentricEquatorialDeclination() {
      accesses += 1;
      return async request => {
        calls.push(request.bodyId);
        return response(request);
      };
    },
  };
  const out = await calculate({}, provider);
  assert.deepEqual(calls, ['Sun', 'Moon']);
  assert.equal(accesses, 1);
  assert.equal(out.facts.contacts.length, 1);
});

test('a provider that removes its public method after first await still completes with pinned callable', async () => {
  const calls = [];
  const provider = {
    async getGeocentricEquatorialDeclination(request) {
      calls.push(request.bodyId);
      if (calls.length === 1) delete this.getGeocentricEquatorialDeclination;
      return response(request);
    },
  };
  const out = await calculate({}, provider);
  assert.deepEqual(calls, ['Sun', 'Moon']);
  assert.equal(out.facts.contacts.length, 1);
});

test('provider result declination is sampled once before validation and use', async () => {
  let reads = 0;
  const provider = fake(request => {
    if (request.bodyId !== 'Sun') return response(request);
    const data = response(request);
    Object.defineProperty(data, 'declinationDeg', {
      enumerable: true,
      get() { return ++reads === 1 ? 18 : -18; },
    });
    return data;
  });
  const out = await calculate({}, provider);
  assert.equal(out.facts.contacts.length, 1);
  assert.equal(out.facts.contacts[0].contactId, 'CONTRA_PARALLEL');
  assert.equal(out.facts.contacts[0].source.declinationDeg, 18);
  assert.equal(reads, 1);
});

test('caller provenance identifiers are validated and snapshotted in one read', async () => {
  let reads = 0;
  const provenance = { ...expectedProvenance };
  Object.defineProperty(provenance, 'engineVersion', {
    enumerable: true,
    get() { return ++reads === 1 ? 'rust-synthetic' : 'unvalidated-engine'; },
  });
  const out = await calculate({ expectedProvenance: provenance });
  assert.equal(out.sourceContext.provenance.engineVersion, 'rust-synthetic');
  assert.equal(reads, 1);
});

test('coordinate frame getter cannot switch basis after its validation', async () => {
  let reads = 0;
  const coord = { ...coordinates };
  Object.defineProperty(coord, 'frame', {
    enumerable: true,
    get() { return ++reads === 1 ? 'ICRS' : 'TRUE_EQUATOR_OF_DATE'; },
  });
  const out = await calculate({ coordinates: coord });
  assert.equal(out.sourceContext.coordinates.frame, 'ICRS');
  assert.equal(out.targetContext.coordinates.frameEpochUtc, null);
  assert.equal(reads, 1);
});

test('source body ID list getter cannot swap the requested bodies after validation', async () => {
  let reads = 0;
  const sourceSelection = { ...source };
  Object.defineProperty(sourceSelection, 'bodyIds', {
    enumerable: true,
    get() { return ++reads === 1 ? ['Sun'] : ['Venus']; },
  });
  const calls = [];
  const out = await calculate({ source: sourceSelection }, fake(r => {
    calls.push(r.bodyId);
    return response(r);
  }));
  assert.deepEqual(calls, ['Sun', 'Moon']);
  assert.equal(out.facts.contacts.length, 1);
  assert.equal(reads, 1);
});

test('orb getter cannot loosen or tighten a definition after validation', async () => {
  let reads = 0;
  const definition = { id: 'CONTRA_PARALLEL' };
  Object.defineProperty(definition, 'maxOrbDeg', {
    enumerable: true,
    get() { return ++reads === 1 ? 0.5 : 0.01; },
  });
  const out = await calculate({ contactDefinitions: [definition] });
  assert.equal(out.facts.contacts.length, 1);
  assert.equal(out.facts.contacts[0].configuredMaxOrbDeg, 0.5);
  assert.equal(reads, 1);
});

test('already-aborted signal prevents every astronomy request', async () => {
  const controller = new AbortController();
  controller.abort('switch-chart');
  let calls = 0;
  await fails(calculate({ signal: controller.signal }, fake(r => {
    calls++; return response(r);
  })), 'DECLINATION_PROVIDER_ABORTED');
  assert.equal(calls, 0);
});

test('abort an unresolved provider response promptly without fetching target', async () => {
  const controller = new AbortController();
  const calls = [];
  let resolvePending;
  const provider = { getGeocentricEquatorialDeclination(request) {
    calls.push(request);
    return new Promise(resolve => { resolvePending = () => resolve(response(request)); });
  } };
  const pending = calculate({ signal: controller.signal }, provider);
  assert.deepEqual(calls.map(c => c.bodyId), ['Sun']);
  assert.equal(calls[0].signal, controller.signal);
  controller.abort();
  await fails(pending, 'DECLINATION_PROVIDER_ABORTED');
  resolvePending();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(calls.map(c => c.bodyId), ['Sun']);
});

test('abort in a provider callback prevents remaining bodies and target', async () => {
  const controller = new AbortController();
  const calls = [];
  await fails(calculate({ signal: controller.signal,
    source: { ...source, bodyIds: ['Sun', 'Venus'] } }, fake(r => {
    calls.push(r.bodyId);
    controller.abort('close-tab');
    return response(r);
  })), 'DECLINATION_PROVIDER_ABORTED');
  assert.deepEqual(calls, ['Sun']);
});

test('abort signal is passed by identity with each immutable request when supplied', async () => {
  const controller = new AbortController();
  const seen = [];
  const out = await calculate({ signal: controller.signal }, fake(r => {
    seen.push(r);
    return response(r);
  }));
  assert.equal(out.facts.contacts.length, 1);
  assert.equal(seen.length, 2);
  assert.ok(seen.every(r => r.signal === controller.signal && Object.isFrozen(r)));
});

test('no abort signal leaves legacy provider request shape unchanged', async () => {
  const requests = [];
  const out = await calculate({}, fake(r => { requests.push(r); return response(r); }));
  assert.equal(out.facts.contacts.length, 1);
  assert.ok(requests.every(r => !Object.hasOwn(r, 'signal')));
});

test('invalid abort signal is rejected before requesting astronomical data', async () => {
  let calls = 0;
  const provider = fake(r => { calls++; return response(r); });
  for (const signal of [null, false, {}, { aborted: false },
    { aborted: true, addEventListener: () => {} },
    { aborted: false, addEventListener: () => {}, removeEventListener: true }]) {
    await fails(calculate({ signal }, provider), 'INVALID_DECLINATION_ABORT_SIGNAL');
  }
  assert.equal(calls, 0);
});

test('abort event listeners are removed on success and provider rejection', async () => {
  const controller = new AbortController();
  const signal = controller.signal;
  const nativeAdd = signal.addEventListener.bind(signal);
  const nativeRemove = signal.removeEventListener.bind(signal);
  let adds = 0, removes = 0;
  signal.addEventListener = (...args) => { adds++; return nativeAdd(...args); };
  signal.removeEventListener = (...args) => { removes++; return nativeRemove(...args); };
  const ok = await calculate({ signal });
  assert.equal(ok.facts.contacts.length, 1);
  assert.equal(adds, 2);
  assert.equal(removes, 2);
  const failure = new Error('provider unavailable');
  await assert.rejects(calculate({ signal }, {
    getGeocentricEquatorialDeclination: async () => { throw failure; },
  }), error => error === failure);
  assert.equal(adds, 3);
  assert.equal(removes, 3);
});


test('provider callable with a non-call own .call property works without AbortSignal', async () => {
  const requests = [];
  const provider = {
    async getGeocentricEquatorialDeclination(request) {
      assert.equal(this, provider);
      requests.push(request.bodyId);
      return response(request);
    },
  };
  provider.getGeocentricEquatorialDeclination.call = null;
  const out = await calculate({}, provider);
  assert.deepEqual(requests, ['Sun', 'Moon']);
  assert.equal(out.facts.contacts.length, 1);
});

test('provider callable with a non-call own .call property works with AbortSignal', async () => {
  const requests = [];
  const provider = {
    async getGeocentricEquatorialDeclination(request) {
      assert.equal(this, provider);
      requests.push(request.bodyId);
      return response(request);
    },
  };
  provider.getGeocentricEquatorialDeclination.call = false;
  const out = await calculate({ signal: new AbortController().signal }, provider);
  assert.deepEqual(requests, ['Sun', 'Moon']);
  assert.equal(out.facts.contacts.length, 1);
});

test('own .call override cannot spoof the selected declination implementation', async () => {
  const actuallyCalled = [];
  let intercepted = 0;
  const provider = {
    async getGeocentricEquatorialDeclination(request) {
      actuallyCalled.push(request.bodyId);
      return response(request);
    },
  };
  provider.getGeocentricEquatorialDeclination.call = () => {
    intercepted++;
    throw new Error('shadowed .call must not be consulted');
  };
  const out = await calculate({}, provider);
  assert.equal(intercepted, 0);
  assert.deepEqual(actuallyCalled, ['Sun', 'Moon']);
  assert.equal(out.facts.contacts.length, 1);
});

test('mutating own .call after first provider await does not alter later requests', async () => {
  const seen = [];
  async function method(request) {
    seen.push(request.bodyId);
    if (request.bodyId === 'Sun') {
      method.call = () => { throw new Error('dynamic shadow must not be invoked'); };
    }
    return response(request);
  }
  const provider = { getGeocentricEquatorialDeclination: method };
  const out = await calculate({ signal: new AbortController().signal }, provider);
  assert.deepEqual(seen, ['Sun', 'Moon']);
  assert.equal(out.facts.contacts.length, 1);
});
