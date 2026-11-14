import test from 'node:test';
import assert from 'node:assert/strict';
import { compareApparentEphemerisProviders, EphemerisParityError } from '../src/ephemeris-parity.mjs';

const datetimeUtc = '2026-01-01T00:00:00Z';
const tolerances = Object.freeze({
  longitudeArcsec: 1, latitudeArcsec: 1,
  longitudeSpeedArcsecPerDay: 1, distanceAu: 0.000001,
});
const metadata = Object.freeze({
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
  engineVersion: 'synthetic-reference-1', kernelSetId: 'test-kernel', timeModel: 'synthetic-time',
});
function state(overrides = {}, meta = metadata) {
  return { longitudeDeg: 359.9999, latitudeDeg: 0, longitudeSpeedDegPerDay: 0,
    distanceAu: 1, ...overrides, metadata: meta };
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
    { longitudeSpeedDegPerDay: undefined }, { latitudeDeg: Number.NaN },
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
    longitudeSpeedArcsecPerDay: 0, distanceAu: 0 };
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
