/**
 * Bounded, read-only multi-epoch shadow parity matrix. This does not implement
 * ephemerides, open kernels or connect to the production VirgoStars backend.
 */
import { compareApparentEphemerisProviders, EphemerisParityError } from './ephemeris-parity.mjs';

const RESIDUAL_FIELDS = Object.freeze([
  'longitudeArcsec', 'latitudeArcsec', 'longitudeSpeedArcsecPerDay',
  'latitudeSpeedArcsecPerDay', 'distanceAu', 'distanceSpeedAuPerDay',
]);
const MAX_EPOCHS = 64;

function checkedEpochs(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_EPOCHS) {
    throw new EphemerisParityError('INVALID_EPOCHS', '1..64 explicit UTC epochs required');
  }
  const epochs = [];
  const seen = new Set();
  // Validate all UTC instants before the first external provider call. Never
  // use Date.parse normalization to silently accept impossible civil dates.
  for (let i = 0; i < input.length; i++) {
    if (!Object.hasOwn(input, i)) {
      throw new EphemerisParityError('INVALID_EPOCHS', 'Sparse UTC epoch lists are unsupported');
    }
    const utc = input[i];
    if (typeof utc !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(utc)) {
      throw new EphemerisParityError('INVALID_EPOCHS', 'Every epoch must be explicit ISO UTC ending Z');
    }
    const millis = Date.parse(utc);
    if (!Number.isFinite(millis) ||
        new Date(millis).toISOString().slice(0, 19) !== utc.slice(0, 19)) {
      throw new EphemerisParityError('INVALID_EPOCHS', 'Invalid civil UTC epoch');
    }
    if (seen.has(utc)) {
      throw new EphemerisParityError('INVALID_EPOCHS', 'Duplicate UTC epochs are unsupported');
    }
    seen.add(utc);
    epochs.push(utc);
  }
  return Object.freeze(epochs);
}

function assertSameSource(first, later, label) {
  if (first.engineVersion !== later.engineVersion ||
      first.kernelSetId !== later.kernelSetId ||
      first.timeModel !== later.timeModel) {
    throw new EphemerisParityError('INCONSISTENT_PROVENANCE',
      `${label} engine/kernel/time-model changed within one shadow matrix`);
  }
}

/**
 * Compare the same body set over 1..64 explicit UTC instants. Both providers
 * receive identical strict APPARENT/ECLIPTIC_OF_DATE requests. All six fields
 * use caller-specified tolerances through the existing single-epoch verifier.
 *
 * Results aggregate failures AND maximum absolute signed residual per field,
 * carrying the body/time of the worst observed discrepancy.
 *
 * Provider errors, incompatible frames or source-version drift reject the
 * whole matrix. No partial PASS report and no Swiss fallback are possible.
 */
export async function compareApparentEphemerisGrid({
  datetimeUtcList, bodyNames, referenceProvider, candidateProvider, tolerances,
}) {
  const epochs = checkedEpochs(datetimeUtcList);
  const reports = [];
  const worst = Object.create(null);
  let sources = null;
  let total = 0;
  let failed = 0;

  for (const datetimeUtc of epochs) {
    const report = await compareApparentEphemerisProviders({
      datetimeUtc, bodyNames, referenceProvider, candidateProvider, tolerances,
    });
    for (const row of report.comparisons) {
      if (!sources) {
        sources = Object.freeze({
          reference: row.reference,
          candidate: row.candidate,
        });
      } else {
        assertSameSource(sources.reference, row.reference, 'reference');
        assertSameSource(sources.candidate, row.candidate, 'candidate');
      }
      for (const field of RESIDUAL_FIELDS) {
        const signedResidual = row.residual[field];
        const absoluteResidual = Math.abs(signedResidual);
        if (!worst[field] || absoluteResidual > worst[field].absoluteResidual) {
          worst[field] = Object.freeze({
            absoluteResidual, signedResidual, bodyName: row.bodyName, datetimeUtc,
          });
        }
      }
    }
    total += report.total;
    failed += report.failed;
    reports.push(report);
  }

  return Object.freeze({
    contract: 'APPARENT_EPHEMERIS_GRID_V1',
    epochs: Object.freeze(reports),
    totalEpochs: epochs.length,
    totalCases: total,
    passedCases: total - failed,
    failedCases: failed,
    status: failed === 0 ? 'PASS' : 'FAIL',
    sources,
    worst: Object.freeze(worst),
  });
}
