#!/usr/bin/env node
/**
 * Offline comparison of an unreviewed P0 Regolo Moon candidate against a
 * separately supplied astronomical reference. Numerical agreement is NEVER
 * archive-coverage certification or permission to enable NEW_MOON lots.
 */
import {readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';

const UTC = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?Z$/;
const SHA = /^[a-f0-9]{64}$/;
const ISO_SEC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x));
const fail = (code, message) => { throw new Error(`${code}: ${message}`); };
const labelled = x => typeof x === 'string' && x.trim() === x &&
  x.length > 0 && x.length <= 512;
const canonical = x => Number.isFinite(x) && x >= 0 && x < 360;

function instant(utc) {
  const match = typeof utc === 'string' ? UTC.exec(utc) : null;
  if (!match) fail('E_MOON_REFERENCE_UTC', 'Exact UTC time with Z and up to six fractional digits required');
  const decimal = (match[2] ?? '').padEnd(6, '0');
  const milliseconds = Date.parse(`${match[1]}.${decimal.slice(0, 3)}Z`);
  if (!Number.isFinite(milliseconds) ||
      new Date(milliseconds).toISOString() !== `${match[1]}.${decimal.slice(0, 3)}Z`) {
    fail('E_MOON_REFERENCE_UTC', 'Invalid calendar instant');
  }
  return {utc: `${match[1]}.${decimal}Z`,
    microseconds: BigInt(milliseconds) * 1000n + BigInt(decimal.slice(3))};
}

function strictFields(value, fields, code) {
  if (!plain(value) || Object.keys(value).length !== fields.length ||
      fields.some(field => !Object.hasOwn(value, field))) {
    fail(code, `Expected exactly: ${fields.join(', ')}`);
  }
}

function tolerance(value, rationale, max, kind) {
  if (!Number.isFinite(value) || value <= 0 || value > max || !labelled(rationale)) {
    fail('E_MOON_REFERENCE_TOLERANCE', `Explicit justified ${kind} tolerance in (0, ${max}] required`);
  }
}

function validateReference(reference, candidate) {
  strictFields(reference, ['contract', 'source', 'conjunctionUtc', 'positionsAtRecordedAnchor',
    'eventToleranceSeconds', 'eventToleranceRationale', 'positionToleranceArcsec',
    'positionToleranceRationale'], 'E_MOON_REFERENCE_CONTRACT');
  if (reference.contract !== 'RegoloIndependentMoonReferenceV1') {
    fail('E_MOON_REFERENCE_CONTRACT', 'Unknown external reference contract');
  }
  strictFields(reference.source, ['kind', 'title', 'uri', 'acquiredUtc', 'convention'],
    'E_MOON_REFERENCE_SOURCE');
  const src = reference.source;
  if (!['INDEPENDENT_EPHEMERIS_SERVICE', 'INDEPENDENT_ASTRONOMICAL_TABLE']
    .includes(src.kind) || !labelled(src.title) || !labelled(src.convention) ||
      typeof src.uri !== 'string' || !/^https:\/\/[^\s]+$/i.test(src.uri) ||
      !ISO_SEC.test(src.acquiredUtc) || !Number.isFinite(Date.parse(src.acquiredUtc))) {
    fail('E_MOON_REFERENCE_SOURCE', 'Document primary source, HTTPS URL, UTC acquisition and exact method/time/frame convention');
  }
  strictFields(reference.positionsAtRecordedAnchor,
    ['atUtc', 'sunLongitudeDeg', 'moonLongitudeDeg', 'observer', 'frame'],
    'E_MOON_REFERENCE_POSITION');
  const pos = reference.positionsAtRecordedAnchor;
  if (pos.observer !== 'GEOCENTRIC' || pos.frame !== 'APPARENT_ECLIPTIC_OF_DATE' ||
      !canonical(pos.sunLongitudeDeg) || !canonical(pos.moonLongitudeDeg)) {
    fail('E_MOON_REFERENCE_POSITION', 'Independent positions must use geocentric apparent ecliptic-of-date degrees');
  }
  const event = instant(reference.conjunctionUtc);
  const positionEpoch = instant(pos.atUtc);
  if (candidate && positionEpoch.microseconds !== instant(candidate.recordedAnchorUtc).microseconds) {
    fail('E_MOON_REFERENCE_EPOCH', 'Reference positions must be for the exact recorded anchor, NOT the reference conjunction');
  }
  tolerance(reference.eventToleranceSeconds, reference.eventToleranceRationale,
    86400, 'event seconds');
  tolerance(reference.positionToleranceArcsec, reference.positionToleranceRationale,
    3600, 'position arcseconds');
  return event;
}

function validateCandidateReport(report) {
  if (!plain(report) || report.contract !== 'RegoloRecordedMoonCandidateV1' ||
      report.contractVersion !== '0.1.0-experimental' ||
      report.scientificEvidence !== 'UNREVIEWED_P0_ARCHIVE_AND_INJECTED_ENGINE' ||
      !plain(report.expectedEphemeris) ||
      report.expectedEphemeris.engineId !== 'VIRGOSTARS_EPHEMERIS' ||
      !['engineVersion', 'kernelSetId', 'timeModelId']
        .every(key => labelled(report.expectedEphemeris[key])) ||
      !plain(report.dataset) || report.dataset.format !== 'VSEPH-P0' ||
      !SHA.test(report.dataset.sha256) || report.dataset.coverageCertified !== false ||
      !plain(report.precedingNewMoon) ||
      report.precedingNewMoon.availability !== 'UNAVAILABLE' ||
      !['NOT_COMPUTED', 'OUT_OF_RANGE'].includes(report.precedingNewMoon.reason) ||
      !Array.isArray(report.warnings) ||
      !report.warnings.includes('P0_ARCHIVE_COVERAGE_UNREVIEWED')) {
    fail('E_MOON_REFERENCE_REPORT', 'Require an explicitly unreviewed P0 diagnostic receipt');
  }
  const birth = instant(report.requestedAtUtc);
  if (!plain(report.candidate)) return null;
  const c = report.candidate;
  const anchor = instant(c.recordedAnchorUtc);
  if (!Number.isSafeInteger(c.sourceRowId) || c.sourceRowId <= 0 ||
      anchor.microseconds > birth.microseconds ||
      !Number.isFinite(c.eventJdUt) || !canonical(c.sunLongitudeDeg) ||
      !canonical(c.moonLongitudeDeg) || !Number.isFinite(c.signedGapDeg) ||
      !Number.isFinite(c.conjunctionResidualDeg) ||
      !Number.isFinite(c.ut1MinusUtcAtEventSeconds) ||
      Math.abs(c.ut1MinusUtcAtEventSeconds) > 1 ||
      Math.abs(c.conjunctionResidualDeg - Math.abs(c.signedGapDeg)) > 1e-8 ||
      Math.abs(c.signedGapDeg - (((c.moonLongitudeDeg - c.sunLongitudeDeg + 540) % 360) - 180)) > 1e-8 ||
      !labelled(c.expectedTimeSource)) {
    fail('E_MOON_REFERENCE_REPORT', 'Invalid or internally inconsistent diagnostic candidate');
  }
  return c;
}

const circularArcsec = (a, b) => Math.abs(((a - b + 540) % 360) - 180) * 3600;

/** Reference metadata are caller-supplied. This never certifies their independence. */
export function compareRegoloMoonReference(report, reference) {
  const candidate = validateCandidateReport(report);
  const referenceEvent = validateReference(reference, candidate);
  if (!candidate || !['CANDIDATE_UNREVIEWED_COVERAGE',
    'REJECTED_CONJUNCTION_RESIDUAL'].includes(report.status)) {
    return Object.freeze({contract: 'RegoloMoonReferenceComparisonV1',
      status: 'INCOMPLETE_CANDIDATE', scientificallyCertified: false,
      referenceIndependenceAudited: false, archiveCoverageCertified: false,
      precedingNewMoon: report.precedingNewMoon, candidateStatus: report.status,
      source: reference.source, comparisons: null});
  }
  const recorded = instant(candidate.recordedAnchorUtc);
  const signedEventDeltaSeconds = Number(recorded.microseconds -
    referenceEvent.microseconds) / 1_000_000;
  const sunResidualArcsec = circularArcsec(candidate.sunLongitudeDeg,
    reference.positionsAtRecordedAnchor.sunLongitudeDeg);
  const moonResidualArcsec = circularArcsec(candidate.moonLongitudeDeg,
    reference.positionsAtRecordedAnchor.moonLongitudeDeg);
  const maxPositionResidualArcsec = Math.max(sunResidualArcsec, moonResidualArcsec);
  const eventWithinTolerance = Math.abs(signedEventDeltaSeconds) <=
    reference.eventToleranceSeconds;
  const positionsWithinTolerance = maxPositionResidualArcsec <=
    reference.positionToleranceArcsec;
  const meetsThresholds = eventWithinTolerance && positionsWithinTolerance &&
    report.status === 'CANDIDATE_UNREVIEWED_COVERAGE';
  return Object.freeze({contract: 'RegoloMoonReferenceComparisonV1',
    status: meetsThresholds ? 'NUMERICALLY_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED' :
      'NUMERICAL_MISMATCH',
    scientificallyCertified: false, referenceIndependenceAudited: false,
    archiveCoverageCertified: false,
    precedingNewMoon: report.precedingNewMoon, candidateStatus: report.status,
    source: reference.source,
    comparisons: Object.freeze({recordedAnchorUtc: recorded.utc,
      referenceConjunctionUtc: referenceEvent.utc,
      signedEventDeltaSeconds, eventToleranceSeconds: reference.eventToleranceSeconds,
      eventWithinTolerance, sunResidualArcsec, moonResidualArcsec,
      maxPositionResidualArcsec,
      positionToleranceArcsec: reference.positionToleranceArcsec,
      positionsWithinTolerance})});
}

function readSmallJson(filename) {
  const info = statSync(filename);
  if (!info.isFile() || info.size > 1_000_000) {
    fail('E_MOON_REFERENCE_FILE', 'JSON must be a regular file of at most 1 MB');
  }
  return JSON.parse(readFileSync(filename, 'utf8'));
}

export const HELP = `Compare an unreviewed P0 lunar diagnostic to independently sourced data.
  node scripts/compare-regolo-moon-reference.mjs --candidate CANDIDATE.json --reference REFERENCE.json
The two independent reference longitudes MUST be evaluated at the recorded
anchor, not the reference event time. Exit 0 means only that CALLER-SUPPLIED
thresholds matched; never certifies event source, coverage or Regolo lots.
See docs/REGOLO_P0_MOON_EVENT_CANDIDATE.md.`;

async function main() {
  try {
    const {values} = parseArgs({args: process.argv.slice(2), strict: true,
      options: {candidate: {type: 'string'}, reference: {type: 'string'},
        help: {type: 'boolean'}}});
    if (values.help) {process.stdout.write(`${HELP}\n`); return;}
    if (!labelled(values.candidate) || !labelled(values.reference)) {
      fail('E_MOON_REFERENCE_ARGS', 'Both --candidate and --reference JSON paths required');
    }
    const result = compareRegoloMoonReference(readSmallJson(values.candidate),
      readSmallJson(values.reference));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.status !== 'NUMERICALLY_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED') {
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
