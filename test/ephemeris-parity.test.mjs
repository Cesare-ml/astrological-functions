import test from 'node:test';
import assert from 'node:assert/strict';
import { compareApparentEphemerisProviders, EphemerisParityError } from '../src/ephemeris-parity.mjs';

const datetimeUtc = '2026-01-01T00:00:00Z';
const tolerances = Object.freeze({
  longitudeArcsec: 1, latitudeArcsec: 1,
  longitudeSpeedArcsecPerDay: 1, latitudeSpeedArcsecPerDay: 1,
  distanceAu: 0.000001, distanceSpeedAuPerDay: 0.000001,
});
const metadata = Object.freeze({
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
  engineVersion: 'synthetic-reference-1', kernelSetId: 'test-kernel', timeModel: 'synthetic-time',
});
function state(overrides = {}, meta = metadata) {
  return { longitudeDeg: 359.9999, latitudeDeg: 0, longitudeSpeedDegPerDay: 0,
    latitudeSpeedDegPerDay: 0, distanceAu: 1, distanceSpeedAuPerDay: 0,
    ...overrides, metadata: meta };
}
function providers(ref = state(), cand = state()) {
  return {
    referenceProvider: { async getGeocentricEcliptic() { return ref; } },
    candidateProvider: { async getGeocentricEcliptic() { return cand; } },
  };
}
function query(ref = state(), cand = state(), other = {}) {
  return { datetimeUtc, bodyNames: ['Sun'], ...providers(ref, cand), tolerances, ...other };
}
function rejectsCode(errorCode) {
  return error => error instanceof EphemerisParityError && error.code === errorCode;
}

test('zero-degree wrap preserves signed subarcsecond longitude residual', async () => {
  const result = await compareApparentEphemerisProviders(query(state(), state({ longitudeDeg: 0.0001 })));
  assert.equal(result.status, 'PASS');
  assert.equal(result.failed, 0);
  assert.ok(Math.abs(result.comparisons[0].residual.longitudeArcsec - 0.72) < 1e-9);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.comparisons[0].residual));
});

test('reverse wrap, negative speed and distance exceedance are reported without falling back', async () => {
  const result = await compareApparentEphemerisProviders(query(
    state({ longitudeDeg: 0.0001 }),
    state({ longitudeDeg: 359.9999, longitudeSpeedDegPerDay: -0.01, distanceAu: 1.01 }),
  ));
  assert.equal(result.status, 'FAIL');
  assert.equal(result.failed, 1);
  assert.ok(Math.abs(result.comparisons[0].residual.longitudeArcsec + 0.72) < 1e-9);
  assert.ok(result.comparisons[0].residual.longitudeSpeedArcsecPerDay < 0);
  assert.ok(result.comparisons[0].residual.distanceAu > 0);
});

test('requests are explicit and each body is compared independently', async () => {
  const calls = [];
  const referenceProvider = { async getGeocentricEcliptic(input) {
    calls.push(['reference', input]); return state();
  } };
  const candidateProvider = { async getGeocentricEcliptic(input) {
    calls.push(['candidate', input]); return state();
  } };
  const result = await compareApparentEphemerisProviders({
    datetimeUtc, bodyNames: ['Sun', 'Moon'], referenceProvider, candidateProvider, tolerances,
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.total, 2);
  assert.deepEqual(calls.map(([source, input]) => [source, input.bodyName]), [
    ['reference', 'Sun'], ['candidate', 'Sun'], ['reference', 'Moon'], ['candidate', 'Moon'],
  ]);
  for (const [, input] of calls) {
    assert.equal(input.frame, 'ECLIPTIC_OF_DATE');
    assert.equal(input.corrections, 'APPARENT');
    assert.ok(Object.isFrozen(input));
  }
});

test('geometric, topocentric and wrong-frame results fail closed', async () => {
  for (const changed of [
    { corrections: 'GEOMETRIC' }, { center: 'SSB' }, { frame: 'J2000' },
  ]) {
    await assert.rejects(
      compareApparentEphemerisProviders(query(state(), state({}, { ...metadata, ...changed }))),
      rejectsCode('INCOMPATIBLE_EPHEMERIS'),
    );
  }
});

test('missing provenance, finite speeds and physical units are mandatory', async () => {
  await assert.rejects(compareApparentEphemerisProviders(query(state(), state({}, {
    ...metadata, kernelSetId: '',
  }))), rejectsCode('MISSING_PROVENANCE'));
  for (const changed of [
    { longitudeSpeedDegPerDay: undefined }, { latitudeSpeedDegPerDay: undefined },
    { distanceSpeedAuPerDay: Number.NaN }, { latitudeDeg: Number.NaN },
    { distanceAu: 0 }, { longitudeDeg: 360 },
  ]) {
    await assert.rejects(compareApparentEphemerisProviders(query(state(), state(changed))),
      rejectsCode('INVALID_STATE'));
  }
});

test('reject invalid dates, duplicate bodies, self-comparison and invalid tolerance budgets', async () => {
  await assert.rejects(compareApparentEphemerisProviders(query(state(), state(), {
    datetimeUtc: '2026-01-01 00:00:00',
  })), rejectsCode('INVALID_UTC'));
  await assert.rejects(compareApparentEphemerisProviders(query(state(), state(), {
    bodyNames: ['Sun', 'Sun'],
  })), rejectsCode('INVALID_BODIES'));
  const same = providers().referenceProvider;
  await assert.rejects(compareApparentEphemerisProviders(query(state(), state(), {
    referenceProvider: same, candidateProvider: same,
  })), rejectsCode('INVALID_PROVIDER'));
  await assert.rejects(compareApparentEphemerisProviders(query(state(), state(), {
    tolerances: { ...tolerances, longitudeArcsec: -1 },
  })), rejectsCode('INVALID_TOLERANCE'));
});

test('zero tolerances accept exact zero values and reject any delta', async () => {
  const zero = { longitudeArcsec: 0, latitudeArcsec: 0,
    longitudeSpeedArcsecPerDay: 0, latitudeSpeedArcsecPerDay: 0,
    distanceAu: 0, distanceSpeedAuPerDay: 0 };
  const same = await compareApparentEphemerisProviders(query(
    state({ longitudeDeg: 0 }), state({ longitudeDeg: 0 }), { tolerances: zero },
  ));
  assert.equal(same.status, 'PASS');
  const changed = await compareApparentEphemerisProviders(query(
    state({ longitudeDeg: 0 }), state({ longitudeDeg: 0.001 }), { tolerances: zero },
  ));
  assert.equal(changed.status, 'FAIL');
});

test('provider errors propagate with no fabricated candidate or fallback', async () => {
  const referenceProvider = { async getGeocentricEcliptic() { throw new Error('missing kernel'); } };
  await assert.rejects(compareApparentEphemerisProviders(query(state(), state(), {
    referenceProvider,
  })), /missing kernel/);
});

test('all six polar fields have signed residuals and individually enforce thresholds', async () => {
  const reference = state({
    longitudeDeg: 42, latitudeDeg: -3, longitudeSpeedDegPerDay: 0.2,
    latitudeSpeedDegPerDay: -0.4, distanceAu: 1.5, distanceSpeedAuPerDay: 0.02,
  });
  const candidate = state({
    longitudeDeg: 42 + 0.5 / 3600,
    latitudeDeg: -3 - 0.25 / 3600,
    longitudeSpeedDegPerDay: 0.2 - 0.4 / 3600,
    latitudeSpeedDegPerDay: -0.4 + 0.75 / 3600,
    distanceAu: 1.5000004,
    distanceSpeedAuPerDay: 0.0200007,
  });
  const report = await compareApparentEphemerisProviders(query(reference, candidate));
  assert.equal(report.contract, 'APPARENT_EPHEMERIS_PARITY_V2');
  assert.equal(report.status, 'PASS');
  assert.deepEqual(Object.keys(report.comparisons[0].residual), [
    'longitudeArcsec', 'latitudeArcsec', 'longitudeSpeedArcsecPerDay',
    'latitudeSpeedArcsecPerDay', 'distanceAu', 'distanceSpeedAuPerDay',
  ]);
  const { residual } = report.comparisons[0];
  for (const [field, expected] of Object.entries({
    longitudeArcsec: 0.5, latitudeArcsec: -0.25,
    longitudeSpeedArcsecPerDay: -0.4, latitudeSpeedArcsecPerDay: 0.75,
    distanceAu: 0.0000004, distanceSpeedAuPerDay: 0.0000007,
  })) {
    assert.ok(Math.abs(residual[field] - expected) < 1e-9,
      `${field}: expected ${expected}, got ${residual[field]}`);
  }
  for (const field of Object.keys(tolerances)) {
    const reduced = { ...tolerances, [field]: Math.abs(residual[field]) / 2 };
    const fail = await compareApparentEphemerisProviders(
      query(reference, candidate, { tolerances: reduced }),
    );
    assert.equal(fail.status, 'FAIL', `Should reject ${field} limit`);
    assert.equal(fail.failed, 1);
  }
});

test('latitude and radial speed deltas never pass silently when other fields agree', async () => {
  for (const delta of [
    { latitudeSpeedDegPerDay: 0.005 },
    { distanceSpeedAuPerDay: -0.005 },
  ]) {
    const result = await compareApparentEphemerisProviders(query(state(), state(delta)));
    assert.equal(result.status, 'FAIL');
    assert.equal(result.failed, 1);
  }
});

test('all six tolerances are mandatory and must be nonnegative finite', async () => {
  for (const field of ['latitudeSpeedArcsecPerDay', 'distanceSpeedAuPerDay']) {
    for (const invalid of [undefined, -1, NaN, Infinity]) {
      await assert.rejects(compareApparentEphemerisProviders(query(
        state(), state(), { tolerances: { ...tolerances, [field]: invalid } },
      )), rejectsCode('INVALID_TOLERANCE'));
    }
  }
});

test('UTC calendar dates reject normalization rollover but preserve valid fractional epochs', async () => {
  for (const invalid of [
    '2026-02-30T00:00:00Z',
    '2026-04-31T00:00:00Z',
    '2026-13-01T00:00:00Z',
    '2026-01-01T24:00:00Z',
    '2026-01-01T00:00:60Z',
  ]) {
    await assert.rejects(
      compareApparentEphemerisProviders(query(state(), state(), { datetimeUtc: invalid })),
      rejectsCode('INVALID_UTC'),
      invalid,
    );
  }
  const valid = await compareApparentEphemerisProviders(
    query(state(), state(), { datetimeUtc: '2024-02-29T00:00:00.123456Z' }),
  );
  assert.equal(valid.status, 'PASS');
  assert.equal(valid.datetimeUtc, '2024-02-29T00:00:00.123456Z');
});

test('metadata accessors are captured once before source validation and reporting', async () => {
  const volatile = { ...metadata };
  let reads = 0;
  Object.defineProperty(volatile, 'engineVersion', { get() {
    reads++;
    return reads === 1 ? 'pinned-reference' : '';
  }});
  const result = await compareApparentEphemerisProviders(query(state({}, volatile), state()));
  assert.equal(reads, 1);
  assert.equal(result.comparisons[0].reference.engineVersion, 'pinned-reference');
});

test('provider function getter is pinned before comparing multiple bodies', async () => {
  const request = query(state(), state(), { bodyNames: ['Sun', 'Moon'] });
  let reads = 0;
  Object.defineProperty(request.referenceProvider, 'getGeocentricEcliptic', { get() {
    reads++;
    return async () => state();
  }});
  const result = await compareApparentEphemerisProviders(request);
  assert.equal(result.total, 2);
  assert.equal(reads, 1);
});
