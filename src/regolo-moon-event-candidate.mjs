/**
 * Experimental audit of a RECORDED new-Moon anchor from the Python-first
 * VirgoStars-Event-Ephemeris P0 JSON against actual injected
 * VirgoStars-Ephemeris Engine.calcUt Sun/Moon longitudes.
 *
 * P0 coverage is not certified. This function ALWAYS returns an unavailable
 * Regolo lunation: even a small conjunction residual is not a substitute for
 * independent event-time/source-coverage validation.
 */
import {AstrologyError, normalize360} from './index.mjs';

const SOURCE_KEYS = ['engineId', 'engineVersion', 'kernelSetId', 'timeModelId'];
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const UTC = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?Z$/;
const JD_UNIX = 2440587.5;
const DAY_US = 86400 * 1000000;

function fail(code, message) { throw new AstrologyError(code, message); }
function isRecord(x) { return x !== null && typeof x === 'object' &&
  !Array.isArray(x) && [Object.prototype, null].includes(Object.getPrototypeOf(x)); }
function record(value, required, optional = [], code = 'INVALID_ARGUMENT') {
  if (!isRecord(value) || required.some(key => !Object.hasOwn(value, key)) ||
      Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) {
    fail(code, 'Required/missing/unexpected record fields');
  }
}
function safeId(value) { return typeof value === 'string' && ID.test(value); }

/** Preserve Python's full six fractional digits; do not truncate to JS milliseconds. */
function instant(value) {
  const m = typeof value === 'string' ? UTC.exec(value) : null;
  if (!m) fail('INVALID_UTC', 'UTC instant with up to six fractional digits and Z required');
  const micros = (m[2] ?? '').padEnd(6, '0');
  const milliseconds = Date.parse(`${m[1]}.${micros.slice(0, 3)}Z`);
  if (!Number.isFinite(milliseconds) ||
      new Date(milliseconds).toISOString() !== `${m[1]}.${micros.slice(0, 3)}Z`) {
    fail('INVALID_UTC', 'Impossible UTC calendar instant');
  }
  return Object.freeze({utc: `${m[1]}.${micros}Z`,
    microseconds: BigInt(milliseconds) * 1000n + BigInt(micros.slice(3)),
    milliseconds, submillisecondMicros: Number(micros.slice(3))});
}

function sameJson(a, b, depth = 0) {
  if (Object.is(a, b)) return true;
  if (depth > 12 || a === null || b === null || typeof a !== typeof b) return false;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) &&
    a.length === b.length && Object.keys(a).length === a.length &&
    Object.keys(b).length === b.length &&
    a.every((value, i) => Object.hasOwn(b, i) && sameJson(value, b[i], depth + 1));
  if (!isRecord(a) || !isRecord(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length &&
    keys.every(key => Object.hasOwn(b, key) && sameJson(a[key], b[key], depth + 1));
}

function fallback(status, dataset, source, birth, warnings, details = null) {
  return Object.freeze({contract: 'RegoloRecordedMoonCandidateV1',
    contractVersion: '0.1.0-experimental', status,
    requestedAtUtc: birth.utc, dataset,
    expectedEphemeris: source,
    precedingNewMoon: Object.freeze({availability: 'UNAVAILABLE',
      reason: status === 'STALE_RECORDED_ANCHOR' ? 'OUT_OF_RANGE' : 'NOT_COMPUTED'}),
    candidate: details,
    scientificEvidence: 'UNREVIEWED_P0_ARCHIVE_AND_INJECTED_ENGINE',
    warnings: Object.freeze([...warnings])});
}

function noGapCoverage(moon) {
  record(moon.coverage, ['status', 'warnings'], [], 'INVALID_MOON_COVERAGE');
  if (moon.coverage.status !== 'unreviewed' || !Array.isArray(moon.coverage.warnings) ||
      !moon.coverage.warnings.includes('no_reviewed_coverage_policy') ||
      moon.coverage.warnings.some(value => typeof value !== 'string' || !safeId(value))) {
    fail('INVALID_MOON_COVERAGE', 'Real P0 archive must disclose unreviewed coverage');
  }
  return moon.coverage.warnings.length === 1;
}

function position(engine, jdUt, body, expectedTimeSource) {
  let result;
  try {
    result = engine.calcUt(jdUt, body, 0);
  } catch (e) {
    fail('EPHEMERIS_POSITION_FAILURE', `Engine.calcUt failed: ${String(e?.code ?? e?.message ?? e)}`);
  }
  if (!result || !Array.isArray(result.xx) || result.xx.length < 2 ||
      !Number.isFinite(result.xx[0]) || !Number.isFinite(result.xx[1]) ||
      result.timeSource !== expectedTimeSource) {
    fail('INCOMPATIBLE_POSITION_SOURCE', 'Apparent geocentric ecliptic-of-date Sun/Moon position with exact time source required');
  }
  return normalize360(result.xx[0]);
}

/**
 * P0 `get_synods_at` output is a recorded anchor, NOT certified astronomy.
 * The full observed Sun/Moon conjunction is only a diagnostic candidate.
 * Always returns `{precedingNewMoon:{availability:'UNAVAILABLE',...}}`.
 */
export function inspectRegoloRecordedNewMoon(input) {
  record(input, ['datetimeUtc', 'snapshot', 'expectedDatasetSha256',
    'expectedEphemeris', 'ut1MinusUtcAtEventSeconds', 'expectedTimeSource',
    'maxConjunctionResidualDeg', 'engine']);
  const birth = instant(input.datetimeUtc);
  const datasetSha = input.expectedDatasetSha256;
  if (typeof datasetSha !== 'string' || !HEX64.test(datasetSha)) {
    fail('INVALID_DATASET_PIN', 'Exact lower-case source archive SHA-256 required');
  }
  record(input.expectedEphemeris, SOURCE_KEYS, [], 'INVALID_EPHEMERIS_PIN');
  if (input.expectedEphemeris.engineId !== 'VIRGOSTARS_EPHEMERIS' ||
      SOURCE_KEYS.slice(1).some(key => !safeId(input.expectedEphemeris[key]))) {
    fail('INVALID_EPHEMERIS_PIN', 'Exact pinned VirgoStars-Ephemeris source required');
  }
  const source = Object.freeze({...input.expectedEphemeris});
  if (!Number.isFinite(input.ut1MinusUtcAtEventSeconds) ||
      Math.abs(input.ut1MinusUtcAtEventSeconds) > 1 ||
      typeof input.expectedTimeSource !== 'string' ||
      !safeId(input.expectedTimeSource) ||
      !Number.isFinite(input.maxConjunctionResidualDeg) ||
      input.maxConjunctionResidualDeg <= 0 || input.maxConjunctionResidualDeg > 1) {
    fail('INVALID_POSITION_MODEL', 'Explicit bounded event DUT1, time source and residual tolerance required');
  }
  if (!input.engine || typeof input.engine.calcUt !== 'function') {
    fail('INVALID_EPHEMERIS_PROVIDER', 'Injected VirgoStars Engine.calcUt is required');
  }
  record(input.snapshot, ['requested_at_utc', 'dataset', 'synods', 'new_moon'],
    [], 'INVALID_EVENT_SNAPSHOT');
  if (instant(input.snapshot.requested_at_utc).microseconds !== birth.microseconds) {
    fail('INCOMPATIBLE_EVENT_EPOCH', 'Archive query must exactly match the birth instant');
  }
  record(input.snapshot.dataset, ['id', 'sha256', 'format', 'coverage_certified'],
    [], 'INVALID_DATASET');
  const dataset = input.snapshot.dataset;
  if (dataset.id !== null || dataset.sha256 !== datasetSha ||
      dataset.format !== 'VSEPH-P0' || dataset.coverage_certified !== false) {
    fail('INCOMPATIBLE_DATASET', 'Uncertified P0 dataset must match the trusted pinned bytes');
  }
  const datasetInfo = Object.freeze({format: 'VSEPH-P0', sha256: datasetSha,
    coverageCertified: false});
  if (!isRecord(input.snapshot.synods) ||
      !Object.hasOwn(input.snapshot.synods, 'Moon')) {
    fail('INVALID_EVENT_SNAPSHOT', 'Archive must contain a Moon synod record');
  }
  const moon = input.snapshot.synods.Moon;
  if (!sameJson(moon?.cycle_start_utc === null ? null : moon,
    input.snapshot.new_moon)) {
    fail('INCOMPATIBLE_MOON_ALIAS', 'new_moon and synods.Moon must be value-identical');
  }
  if (input.snapshot.new_moon === null) {
    record(moon, ['body', 'source_id', 'cycle_start_utc', 'next_cycle_start_utc',
      'phase_thresholds_utc', 'phase', 'coverage', 'status'],
    [], 'INVALID_MOON_RECORD');
    if (moon.body !== 'Moon' || moon.source_id !== null ||
        moon.cycle_start_utc !== null || moon.status !== 'no_preceding_recorded_cycle') {
      fail('INVALID_MOON_RECORD', 'Unavailable Moon alias requires an explicit missing source row');
    }
    noGapCoverage(moon);
    return fallback('NO_PRECEDING_RECORDED_MOON', datasetInfo, source, birth,
      ['P0_ARCHIVE_COVERAGE_UNREVIEWED', 'NO_PRECEDING_RECORDED_MOON']);
  }
  record(moon, ['body', 'source_id', 'cycle_start_utc', 'next_cycle_start_utc',
    'phase_thresholds_utc', 'phase', 'coverage', 'status'],
  [], 'INVALID_MOON_RECORD');
  if (moon.body !== 'Moon' || moon.status !== 'recorded' ||
      !Number.isSafeInteger(moon.source_id) || moon.source_id <= 0) {
    fail('INVALID_MOON_RECORD', 'Recorded Moon anchor needs a positive original row ID');
  }
  const anchor = instant(moon.cycle_start_utc);
  const ageMicros = birth.microseconds - anchor.microseconds;
  if (ageMicros < 0n) fail('INCOMPATIBLE_LUNATION_EPOCH', 'Recorded Moon anchor is after the birth');
  const coverageCleanExceptPolicy = noGapCoverage(moon);
  const ageDays = Number(ageMicros) / DAY_US;
  if (moon.next_cycle_start_utc !== null) {
    if (instant(moon.next_cycle_start_utc).microseconds <= birth.microseconds) {
      fail('INCOMPATIBLE_LUNATION_EPOCH', 'Next Moon anchor must be after the birth');
    }
  }
  const details = Object.freeze({sourceRowId: moon.source_id,
    recordedAnchorUtc: anchor.utc, ageDays,
    nextRecordedAnchorUtc: moon.next_cycle_start_utc === null ? null :
      instant(moon.next_cycle_start_utc).utc});
  if (ageDays > 31) {
    return fallback('STALE_RECORDED_ANCHOR', datasetInfo, source, birth,
      ['P0_ARCHIVE_COVERAGE_UNREVIEWED', 'RECORD_TOO_OLD_FOR_REGOLO'], details);
  }
  if (!coverageCleanExceptPolicy) {
    return fallback('COVERAGE_WARNING_BLOCKED', datasetInfo, source, birth,
      ['P0_ARCHIVE_COVERAGE_UNREVIEWED', ...moon.coverage.warnings], details);
  }
  // Input UTC is known to microseconds; native UT1 Julian day uses double
  // precision, so its ~tens-of-microseconds rounding is NOT a time oracle.
  const eventJdUt = JD_UNIX + (anchor.milliseconds +
    anchor.submillisecondMicros / 1000 +
    input.ut1MinusUtcAtEventSeconds * 1000) / 86400000;
  const sunLongitudeDeg = position(input.engine, eventJdUt, 0, input.expectedTimeSource);
  const moonLongitudeDeg = position(input.engine, eventJdUt, 1, input.expectedTimeSource);
  const signedGap = ((moonLongitudeDeg - sunLongitudeDeg + 540) % 360) - 180;
  const deviation = Math.abs(signedGap);
  const candidate = Object.freeze({...details, eventJdUt,
    sunLongitudeDeg, moonLongitudeDeg, signedGapDeg: signedGap,
    conjunctionResidualDeg: deviation,
    expectedTimeSource: input.expectedTimeSource,
    ut1MinusUtcAtEventSeconds: input.ut1MinusUtcAtEventSeconds});
  const status = deviation <= input.maxConjunctionResidualDeg ?
    'CANDIDATE_UNREVIEWED_COVERAGE' : 'REJECTED_CONJUNCTION_RESIDUAL';
  return fallback(status, datasetInfo, source, birth,
    ['P0_ARCHIVE_COVERAGE_UNREVIEWED',
      'ENGINE_BINARY_AND_ARCHIVE_PROVENANCE_CALLER_ASSERTED',
      'RECORDED_ANCHOR_NOT_INDEPENDENTLY_CONJUNCTION_VERIFIED'], candidate);
}
