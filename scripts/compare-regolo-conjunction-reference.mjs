#!/usr/bin/env node
/**
 * Offline numerical comparison of the NEW search candidate (not P0 archive)
 * to manually supplied independent UT1 conjunction + positions at candidate.
 * Never promotes the Regolo Moon to AVAILABLE or certifies source independence.
 */
import {readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';

const SHA40 = /^[a-f0-9]{40}$/i;
const SHA64 = /^[a-f0-9]{64}$/i;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x));
const fail = (code, reason) => {throw new Error(`${code}: ${reason}`);};
const labelled = s => typeof s === 'string' && s.trim() === s &&
  s.length > 0 && s.length <= 512 && !/[\x00-\x1f\x7f]/.test(s);
const angle = n => Number.isFinite(n) && n >= 0 && n < 360;
const angularResidualArcsec = (a, b) =>
  Math.abs(((a - b + 540) % 360) - 180) * 3600;

function fields(value, keys, code) {
  if (!plain(value) || Object.keys(value).length !== keys.length ||
      keys.some(key => !Object.hasOwn(value, key))) {
    fail(code, `Exact fields required: ${keys.join(', ')}`);
  }
}

function checkedReference(reference, candidate, birthJdUt, lookbackDays) {
  fields(reference, ['contract', 'source', 'event', 'positionsAtCandidate',
    'eventToleranceSeconds', 'eventToleranceRationale',
    'positionToleranceArcsec', 'positionToleranceRationale'],
  'E_CONJUNCTION_REFERENCE_CONTRACT');
  if (reference.contract !== 'RegoloIndependentConjunctionReferenceV1') {
    fail('E_CONJUNCTION_REFERENCE_CONTRACT', 'Incorrect reference version');
  }
  fields(reference.source, ['kind', 'title', 'uri', 'acquiredUtc',
    'convention', 'timeScaleConversion'], 'E_CONJUNCTION_REFERENCE_SOURCE');
  const src = reference.source;
  if (!['INDEPENDENT_EPHEMERIS_SERVICE', 'INDEPENDENT_ASTRONOMICAL_TABLE']
    .includes(src.kind) || !labelled(src.title) || !labelled(src.convention) ||
      !labelled(src.timeScaleConversion) ||
      typeof src.uri !== 'string' || !/^https:\/\/[^\s]+$/.test(src.uri) ||
      typeof src.acquiredUtc !== 'string' || !UTC.test(src.acquiredUtc) ||
      !Number.isFinite(Date.parse(src.acquiredUtc)) ||
      new Date(Date.parse(src.acquiredUtc)).toISOString() !==
        src.acquiredUtc.replace('Z', '.000Z')) {
    fail('E_CONJUNCTION_REFERENCE_SOURCE',
      'Document exact external source, HTTPS URL, acquisition UTC, frame and UT1 conversion');
  }
  fields(reference.event, ['jdUt', 'eventType'], 'E_CONJUNCTION_REFERENCE_EVENT');
  if (reference.event.eventType !== 'GEOCENTRIC_ECLIPTIC_LONGITUDE_CONJUNCTION' ||
      !Number.isFinite(reference.event.jdUt) ||
      reference.event.jdUt < birthJdUt - lookbackDays ||
      reference.event.jdUt > birthJdUt) {
    fail('E_CONJUNCTION_REFERENCE_EVENT',
      'Reference event must be an independently converted UT1 geocentric longitude conjunction in the search window');
  }
  fields(reference.positionsAtCandidate,
    ['atJdUt', 'sunLongitudeDeg', 'moonLongitudeDeg', 'observer', 'frame'],
  'E_CONJUNCTION_REFERENCE_POSITION');
  const pos = reference.positionsAtCandidate;
  if (pos.atJdUt !== candidate.jdUt || !angle(pos.sunLongitudeDeg) ||
      !angle(pos.moonLongitudeDeg) || pos.observer !== 'GEOCENTRIC' ||
      pos.frame !== 'APPARENT_ECLIPTIC_OF_DATE') {
    fail('E_CONJUNCTION_REFERENCE_POSITION',
      'Independent Sun/Moon longitudes must be at precisely the reported candidate JD UT1, with the same reference frame');
  }
  if (!Number.isFinite(reference.eventToleranceSeconds) ||
      reference.eventToleranceSeconds <= 0 ||
      reference.eventToleranceSeconds > 86400 ||
      !labelled(reference.eventToleranceRationale) ||
      !Number.isFinite(reference.positionToleranceArcsec) ||
      reference.positionToleranceArcsec <= 0 ||
      reference.positionToleranceArcsec > 3600 ||
      !labelled(reference.positionToleranceRationale)) {
    fail('E_CONJUNCTION_REFERENCE_TOLERANCE',
      'Justified timing (≤86400 s) and longitude (≤3600 arcsec) tolerances required');
  }
}

function checkedCandidate(receipt) {
  if (!plain(receipt) ||
      receipt.contract !== 'RegoloPrecedingConjunctionSearchV1' ||
      receipt.contractVersion !== '0.1.0-experimental' ||
      receipt.scientificEvidence !== 'UNVERIFIED_INJECTED_VIRGOSTARS_ENGINE' ||
      !plain(receipt.precedingNewMoon) ||
      receipt.precedingNewMoon.availability !== 'UNAVAILABLE' ||
      !['NOT_COMPUTED', 'NON_CONVERGENT']
        .includes(receipt.precedingNewMoon.reason) ||
      !plain(receipt.expectedEphemeris) ||
      receipt.expectedEphemeris.engineId !== 'VIRGOSTARS_EPHEMERIS' ||
      !SHA40.test(receipt.expectedEphemeris.engineVersion ?? '') ||
      !SHA64.test(receipt.expectedEphemeris.kernelSetId ?? '') ||
      !labelled(receipt.expectedEphemeris.timeModelId) ||
      !labelled(receipt.expectedTimeSourcePolicy) ||
      !Number.isFinite(receipt.birthJdUt) ||
      !Number.isFinite(receipt.lookbackDays) || receipt.lookbackDays < 30 ||
      receipt.lookbackDays > 35 ||
      !Number.isFinite(receipt.rootToleranceSeconds) ||
      receipt.rootToleranceSeconds < 0.01 ||
      receipt.rootToleranceSeconds > 60 ||
      !Number.isSafeInteger(receipt.sampledPoints) || receipt.sampledPoints < 2 ||
      !Number.isSafeInteger(receipt.candidateBrackets) ||
      receipt.candidateBrackets < 0 ||
      !plain(receipt.nativeAudit) ||
      receipt.nativeAudit.contract !== 'VirgoStarsNativeConjunctionAuditV1' ||
      receipt.nativeAudit.scientificParityCertified !== false ||
      receipt.nativeAudit.referenceIndependenceAudited !== false ||
      receipt.nativeAudit.sourceBuildOriginVerified !== false ||
      receipt.nativeAudit.upstreamCommitSha !==
        receipt.expectedEphemeris.engineVersion ||
      receipt.nativeAudit.de441Sha256 !==
        receipt.expectedEphemeris.kernelSetId ||
      receipt.nativeAudit.timeModelId !== receipt.expectedEphemeris.timeModelId ||
      !SHA64.test(receipt.nativeAudit.nativeAddonSha256 ?? '')) {
    fail('E_CONJUNCTION_REFERENCE_RECEIPT',
      'Require original unverified candidate output with pinned source/kernel and native audit fields');
  }
  if (receipt.status !== 'CANDIDATE_UNVERIFIED_ASTRONOMY' ||
      !plain(receipt.candidate)) return null;
  const c = receipt.candidate;
  const separation = ((c.moonLongitudeDeg - c.sunLongitudeDeg + 540) % 360) - 180;
  if (!Number.isFinite(c.jdUt) || c.jdUt > receipt.birthJdUt ||
      c.jdUt < receipt.birthJdUt - receipt.lookbackDays ||
      !angle(c.sunLongitudeDeg) || !angle(c.moonLongitudeDeg) ||
      !Number.isFinite(c.signedElongationDeg) ||
      Math.abs(c.signedElongationDeg - separation) > 1e-8 ||
      Math.abs(c.signedElongationDeg) > 0.1 ||
      !labelled(c.timeSource) ||
      !Number.isSafeInteger(c.iterations) || c.iterations < 0 ||
      !Number.isFinite(c.bracketWidthSeconds) ||
      c.bracketWidthSeconds > receipt.rootToleranceSeconds + 0.001 ||
      c.bracketWidthSeconds < 0 ||
      !Number.isFinite(c.localLongitudeSweepDeg) ||
      c.localLongitudeSweepDeg <= 0 || c.localLongitudeSweepDeg >= 5 ||
      receipt.candidateBrackets < 1) {
    fail('E_CONJUNCTION_REFERENCE_RECEIPT', 'Candidate internal geometry or root bounds disagree');
  }
  return c;
}

export function compareRegoloConjunctionReference(receipt, reference) {
  const c = checkedCandidate(receipt);
  if (!c || receipt.nativeAudit.nativeAddonExecuted !== true ||
      receipt.nativeAudit.verifiedLocalBytes !== true) {
    return Object.freeze({contract: 'RegoloConjunctionReferenceComparisonV1',
      status: 'INCOMPLETE_NATIVE_CANDIDATE',
      scientificallyCertified: false, referenceIndependenceAudited: false,
      precedingNewMoon: receipt.precedingNewMoon, comparisons: null});
  }
  checkedReference(reference, c, receipt.birthJdUt, receipt.lookbackDays);
  const signedEventDeltaSeconds = (c.jdUt - reference.event.jdUt) * 86400;
  const sunResidualArcsec = angularResidualArcsec(c.sunLongitudeDeg,
    reference.positionsAtCandidate.sunLongitudeDeg);
  const moonResidualArcsec = angularResidualArcsec(c.moonLongitudeDeg,
    reference.positionsAtCandidate.moonLongitudeDeg);
  const timeWithinTolerance = Math.abs(signedEventDeltaSeconds) <=
    reference.eventToleranceSeconds;
  const longitudesWithinTolerance = Math.max(sunResidualArcsec,
    moonResidualArcsec) <= reference.positionToleranceArcsec;
  return Object.freeze({contract: 'RegoloConjunctionReferenceComparisonV1',
    status: timeWithinTolerance && longitudesWithinTolerance ?
      'NUMERICALLY_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED' :
      'NUMERICAL_MISMATCH',
    scientificallyCertified: false,
    referenceIndependenceAudited: false,
    precedingNewMoon: receipt.precedingNewMoon,
    source: reference.source,
    comparisons: Object.freeze({candidateJdUt: c.jdUt,
      referenceConjunctionJdUt: reference.event.jdUt,
      signedEventDeltaSeconds,
      eventToleranceSeconds: reference.eventToleranceSeconds,
      timeWithinTolerance,
      sunResidualArcsec, moonResidualArcsec,
      positionToleranceArcsec: reference.positionToleranceArcsec,
      longitudesWithinTolerance})});
}

function readSmallJson(filename) {
  const info = statSync(filename);
  if (!info.isFile() || info.size > 1_000_000) {
    fail('E_CONJUNCTION_REFERENCE_FILE', 'JSON must be a regular file of at most 1 MB');
  }
  return JSON.parse(readFileSync(filename, 'utf8'));
}

export const HELP = `Compare independently sourced UT1 conjunction and positions.
node scripts/compare-regolo-conjunction-reference.mjs \\
  --candidate NATIVE_CONJUNCTION_JSON --reference INDEPENDENT_REFERENCE_JSON
Do NOT pass the P0 archived event receipt here. Reference positions must be
evaluated at the candidate's exact JD UT1, not at the reference conjunction.
Exit 0 means caller-supplied numerical thresholds match, NOT certification.
See docs/REGOLO_MOON_CONJUNCTION_SEARCH.md.`;

async function main() {
  try {
    const {values} = parseArgs({args: process.argv.slice(2), strict: true,
      options: {candidate: {type: 'string'}, reference: {type: 'string'},
        help: {type: 'boolean'}}});
    if (values.help) {process.stdout.write(`${HELP}\n`); return;}
    if (!labelled(values.candidate) || !labelled(values.reference)) {
      fail('E_CONJUNCTION_REFERENCE_ARGS', 'Both local JSON paths required');
    }
    const result = compareRegoloConjunctionReference(readSmallJson(values.candidate),
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
