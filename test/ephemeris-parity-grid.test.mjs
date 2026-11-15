import test from 'node:test';
import assert from 'node:assert/strict';
import { compareApparentEphemerisGrid } from '../src/ephemeris-parity-grid.mjs';
import { EphemerisParityError } from '../src/ephemeris-parity.mjs';

const UTC_A = '2026-01-01T00:00:00Z';
const UTC_B = '2026-01-03T00:00:00Z';
const UTC_C = '2026-01-05T00:00:00Z';
const limits = Object.freeze({
  longitudeArcsec: 1, latitudeArcsec: 1,
  longitudeSpeedArcsecPerDay: 1, latitudeSpeedArcsecPerDay: 1,
  distanceAu: 0.000001, distanceSpeedAuPerDay: 0.000001,
});

function makeProvider(engineVersion, mutations = {}, calls = []) {
  return Object.freeze({
    async getGeocentricEcliptic(request) {
      calls.push(request);
      const patch = mutations[`${request.datetimeUtc}/${request.bodyName}`] ?? {};
      const result = {
        longitudeDeg: request.bodyName === 'Moon' ? 132 : 359.9999,
        latitudeDeg: request.bodyName === 'Moon' ? 5 : 0,
        longitudeSpeedDegPerDay: request.bodyName === 'Moon' ? 13 : 1,
        latitudeSpeedDegPerDay: 0.1,
        distanceAu: request.bodyName === 'Moon' ? 0.0025 : 1,
        distanceSpeedAuPerDay: 0.00001,
        metadata: {
          center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
          engineVersion, kernelSetId: `synthetic-${engineVersion}`, timeModel: 'synthetic-UTC',
        },
        ...patch,
      };
      return result;
    },
  });
}

function input(override = {}) {
  return {
    datetimeUtcList: [UTC_A, UTC_B, UTC_C],
    bodyNames: ['Sun', 'Moon'],
    referenceProvider: makeProvider('reference-v1'),
    candidateProvider: makeProvider('candidate-v1'),
    tolerances: limits,
    ...override,
  };
}

function hasCode(code) {
  return error => error instanceof EphemerisParityError && error.code === code;
}

test('multi-epoch comparison reports totals and worst signed six-field differences', async () => {
  const referenceCalls = [], candidateCalls = [];
  const changed = {
    [`${UTC_B}/Moon`]: { latitudeSpeedDegPerDay: 0.102 },
    [`${UTC_C}/Sun`]: { longitudeDeg: (359.9999 + (2 / 3600)) % 360 },
  };
  const result = await compareApparentEphemerisGrid(input({
    referenceProvider: makeProvider('reference-v1', {}, referenceCalls),
    candidateProvider: makeProvider('candidate-v1', changed, candidateCalls),
  }));
  assert.equal(result.contract, 'APPARENT_EPHEMERIS_GRID_V1');
  assert.equal(result.totalEpochs, 3);
  assert.equal(result.totalCases, 6);
  assert.equal(result.failedCases, 2);
  assert.equal(result.passedCases, 4);
  assert.equal(result.status, 'FAIL');
  assert.equal(result.epochs[0].status, 'PASS');
  assert.equal(result.epochs[1].status, 'FAIL');
  assert.equal(result.epochs[2].status, 'FAIL');
  assert.equal(referenceCalls.length, 6);
  assert.equal(candidateCalls.length, 6);
  assert.deepEqual(referenceCalls, candidateCalls);
  assert.equal(result.worst.latitudeSpeedArcsecPerDay.bodyName, 'Moon');
  assert.equal(result.worst.latitudeSpeedArcsecPerDay.datetimeUtc, UTC_B);
  assert.ok(Math.abs(result.worst.latitudeSpeedArcsecPerDay.signedResidual - 7.2) < 1e-8);
  assert.equal(result.worst.longitudeArcsec.bodyName, 'Sun');
  assert.equal(result.worst.longitudeArcsec.datetimeUtc, UTC_C);
  assert.ok(Math.abs(result.worst.longitudeArcsec.absoluteResidual - 2) < 1e-8);
  assert.equal(result.worst.distanceAu.absoluteResidual, 0);
  assert.equal(result.worst.distanceSpeedAuPerDay.absoluteResidual, 0);
  assert.equal(result.sources.reference.engineVersion, 'reference-v1');
  assert.equal(result.sources.candidate.engineVersion, 'candidate-v1');
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.epochs));
  assert.ok(Object.isFrozen(result.worst));
  assert.ok(Object.isFrozen(result.worst.latitudeSpeedArcsecPerDay));
});

test('all-zero residuals include a sourced worst case for all six quantities', async () => {
  const result = await compareApparentEphemerisGrid(input({ datetimeUtcList: [UTC_A] }));
  assert.equal(result.status, 'PASS');
  assert.equal(result.totalCases, 2);
  assert.equal(result.failedCases, 0);
  assert.equal(Object.keys(result.worst).length, 6);
  for (const entry of Object.values(result.worst)) {
    assert.equal(entry.absoluteResidual, 0);
    assert.equal(entry.datetimeUtc, UTC_A);
    assert.equal(entry.bodyName, 'Sun');
  }
});

test('input epoch list is validated before any provider request', async () => {
  const calls = [];
  const provider = makeProvider('reference-v1', {}, calls);
  for (const invalid of [
    [], [UTC_A, UTC_A], [UTC_A, '2026-02-30T00:00:00Z'],
    [UTC_A, '2026-01-03 00:00:00Z'],
    Array.from({ length: 65 }, (_, i) => `2026-01-01T00:00:${String(i % 60).padStart(2, '0')}Z`),
    [, UTC_B],
  ]) {
    await assert.rejects(
      compareApparentEphemerisGrid(input({
        datetimeUtcList: invalid,
        referenceProvider: provider,
      })),
      hasCode('INVALID_EPOCHS'),
    );
    assert.equal(calls.length, 0);
  }
});

test('drifting reference engine provenance rejects the entire matrix', async () => {
  const reference = makeProvider('reference-v1');
  const driftingReference = {
    async getGeocentricEcliptic(request) {
      const value = await reference.getGeocentricEcliptic(request);
      if (request.datetimeUtc === UTC_B) {
        value.metadata.engineVersion = 'reference-v2';
      }
      return value;
    },
  };
  await assert.rejects(
    compareApparentEphemerisGrid(input({ referenceProvider: driftingReference })),
    hasCode('INCONSISTENT_PROVENANCE'),
  );
});

test('drifting candidate kernel/time-model provenance also rejects the matrix', async () => {
  const candidate = makeProvider('candidate-v1');
  const changingCandidate = {
    async getGeocentricEcliptic(request) {
      const value = await candidate.getGeocentricEcliptic(request);
      if (request.bodyName === 'Moon') {
        value.metadata = { ...value.metadata, kernelSetId: 'different-synthetic-kernel' };
      }
      return value;
    },
  };
  await assert.rejects(
    compareApparentEphemerisGrid(input({ candidateProvider: changingCandidate })),
    hasCode('INCONSISTENT_PROVENANCE'),
  );
});

test('a provider error propagates instead of returning a partial PASS', async () => {
  const good = makeProvider('candidate-v1');
  const failing = {
    async getGeocentricEcliptic(request) {
      if (request.datetimeUtc === UTC_B) throw new Error('kernel unavailable at epoch');
      return good.getGeocentricEcliptic(request);
    },
  };
  await assert.rejects(
    compareApparentEphemerisGrid(input({ candidateProvider: failing })),
    /kernel unavailable at epoch/,
  );
});

test('fractional UTC instants retain precision in provider request', async () => {
  const calls = [];
  const utc = '2024-02-29T12:34:56.123456Z';
  const result = await compareApparentEphemerisGrid(input({
    datetimeUtcList: [utc],
    referenceProvider: makeProvider('reference-v1', {}, calls),
  }));
  assert.equal(result.status, 'PASS');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].datetimeUtc, utc);
  assert.equal(result.epochs[0].datetimeUtc, utc);
});

test('grid pins the original body list before async providers can mutate it', async () => {
  const bodyNames = ['Sun', 'Moon'];
  const original = makeProvider('reference-v1');
  const changing = {
    async getGeocentricEcliptic(request) {
      if (request.datetimeUtc === UTC_A && request.bodyName === 'Sun') bodyNames[1] = 'Mars';
      return original.getGeocentricEcliptic(request);
    },
  };
  const result = await compareApparentEphemerisGrid(input({
    bodyNames,
    referenceProvider: changing,
  }));
  assert.equal(result.totalCases, 6);
  for (const epoch of result.epochs) {
    assert.deepEqual(epoch.comparisons.map(row => row.bodyName), ['Sun', 'Moon']);
  }
});
