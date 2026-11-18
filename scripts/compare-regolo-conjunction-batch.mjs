#!/usr/bin/env node
/**
 * Offline multi-epoch comparison of actual native Regolo candidate receipts
 * to independently supplied references. No network calls or certification.
 */
import {readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {compareRegoloConjunctionReference} from
  './compare-regolo-conjunction-reference.mjs';

const SHA40 = /^[0-9a-f]{40}$/i;
const SHA64 = /^[0-9a-f]{64}$/i;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const LABEL = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const plain = value => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exact = (obj, keys) => plain(obj) &&
  Object.keys(obj).length === keys.length &&
  keys.every(key => Object.hasOwn(obj, key));
const fail = message => {throw new Error(`E_REGOLO_CONJUNCTION_BATCH_REFERENCE: ${message}`);};
const canonicalUtc = s => typeof s === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(s) ?
  s.replace(/(?:\.(\d{1,6}))?Z$/, (_, f) => `.${(f ?? '').padEnd(6, '0')}Z`) : null;

function checkedBatch(batch) {
  if (!exact(batch, ['contract', 'status', 'nativeBytesPreflightPerformed',
    'scientificParityCertified', 'referenceIndependenceAudited',
    'sourceBuildOriginVerified', 'source', 'counts', 'results']) ||
      batch.contract !== 'VirgoStarsNativeConjunctionBatchAuditV1' ||
      batch.nativeBytesPreflightPerformed !== true ||
      batch.scientificParityCertified !== false ||
      batch.referenceIndependenceAudited !== false ||
      batch.sourceBuildOriginVerified !== false ||
      !exact(batch.source, ['upstreamCommitSha', 'nativeAddonSha256',
        'de441Sha256', 'timeModelId']) ||
      typeof batch.source.upstreamCommitSha !== 'string' ||
      !SHA40.test(batch.source.upstreamCommitSha) ||
      typeof batch.source.nativeAddonSha256 !== 'string' ||
      !SHA64.test(batch.source.nativeAddonSha256) ||
      typeof batch.source.de441Sha256 !== 'string' ||
      !SHA64.test(batch.source.de441Sha256) ||
      typeof batch.source.timeModelId !== 'string' ||
      !LABEL.test(batch.source.timeModelId) ||
      !exact(batch.counts, ['total', 'candidate', 'failed']) ||
      !Array.isArray(batch.results) || batch.results.length < 1 ||
      batch.results.length > 32 ||
      batch.counts.total !== batch.results.length) {
    fail('unmodified versioned native batch receipt and source pins required');
  }
  const ids = new Set();
  let claimedCandidates = 0;
  for (const item of batch.results) {
    const withReceipt = plain(item) && Object.hasOwn(item, 'receipt');
    if (!exact(item, withReceipt ? ['id', 'datetimeUtc', 'birthDut1Seconds',
      'dut1SourceUri', 'outcome', 'receipt'] :
    ['id', 'datetimeUtc', 'birthDut1Seconds', 'dut1SourceUri', 'outcome', 'error']) ||
        typeof item.id !== 'string' || !ID.test(item.id) || ids.has(item.id) ||
        !canonicalUtc(item.datetimeUtc) ||
        !Number.isFinite(item.birthDut1Seconds) ||
        Math.abs(item.birthDut1Seconds) > 1 ||
        typeof item.dut1SourceUri !== 'string' ||
        item.dut1SourceUri.length > 512 ||
        !/^https:\/\/[^\s]+$/.test(item.dut1SourceUri) ||
        !['CANDIDATE', 'FAILED'].includes(item.outcome) ||
        (item.outcome === 'CANDIDATE' && !withReceipt) ||
        (!withReceipt && (typeof item.error !== 'string' || !item.error))) {
      fail('invalid, duplicated or unsourced native batch case');
    }
    ids.add(item.id);
    if (withReceipt) {
      const r = item.receipt;
      if (!plain(r) ||
          r.contract !== 'RegoloPrecedingConjunctionSearchV1' ||
          r.contractVersion !== '0.1.0-experimental' ||
          r.scientificEvidence !== 'UNVERIFIED_INJECTED_VIRGOSTARS_ENGINE' ||
          canonicalUtc(r.datetimeUtc) !== canonicalUtc(item.datetimeUtc) ||
          !plain(r.expectedEphemeris) ||
          r.expectedEphemeris.engineId !== 'VIRGOSTARS_EPHEMERIS' ||
          r.expectedEphemeris.engineVersion !== batch.source.upstreamCommitSha ||
          r.expectedEphemeris.kernelSetId !== batch.source.de441Sha256 ||
          r.expectedEphemeris.timeModelId !== batch.source.timeModelId ||
          !plain(r.nativeAudit) ||
          r.nativeAudit.contract !== 'VirgoStarsNativeConjunctionAuditV1' ||
          r.nativeAudit.upstreamCommitSha !== batch.source.upstreamCommitSha ||
          r.nativeAudit.nativeAddonSha256 !== batch.source.nativeAddonSha256 ||
          r.nativeAudit.de441Sha256 !== batch.source.de441Sha256 ||
          r.nativeAudit.timeModelId !== batch.source.timeModelId ||
          r.nativeAudit.scientificParityCertified !== false ||
          r.nativeAudit.referenceIndependenceAudited !== false ||
          r.nativeAudit.sourceBuildOriginVerified !== false ||
          r.nativeAudit.birthDut1Seconds !== item.birthDut1Seconds ||
          r.nativeAudit.nativeAddonExecuted !== true ||
          r.nativeAudit.verifiedLocalBytes !== true ||
          r.precedingNewMoon?.availability !== 'UNAVAILABLE' ||
          !['NOT_COMPUTED', 'NON_CONVERGENT'].includes(r.precedingNewMoon.reason) ||
          (r.status === 'CANDIDATE_UNVERIFIED_ASTRONOMY' &&
            r.precedingNewMoon.reason !== 'NOT_COMPUTED') ||
          (r.status !== 'CANDIDATE_UNVERIFIED_ASTRONOMY' &&
            r.precedingNewMoon.reason !== 'NON_CONVERGENT') ||
          (item.outcome === 'CANDIDATE' &&
            r.status !== 'CANDIDATE_UNVERIFIED_ASTRONOMY') ||
          (item.outcome === 'FAILED' &&
            (!['NO_CONJUNCTION_BRACKET', 'NON_CONVERGENT'].includes(r.status) ||
              r.candidate !== null))) {
        fail(`native receipt/source mismatch for case ${item.id}`);
      }
    }
    if (item.outcome === 'CANDIDATE') ++claimedCandidates;
  }
  if (batch.counts.candidate !== claimedCandidates ||
      batch.counts.failed !== batch.results.length - claimedCandidates ||
      batch.status !== (claimedCandidates === batch.results.length ?
        'ALL_NATIVE_CANDIDATES_UNVERIFIED' : 'NATIVE_CANDIDATE_FAILURES')) {
    fail('batch status or counts disagree with individual native receipts');
  }
  return ids;
}

function checkedReferences(input, ids) {
  if (!exact(input, ['contract', 'references']) ||
      input.contract !== 'RegoloIndependentConjunctionBatchReferencesV1' ||
      !Array.isArray(input.references) ||
      input.references.length !== ids.size) {
    fail('one reference entry (possibly null) per native test case required');
  }
  const byId = new Map();
  for (const item of input.references) {
    if (!exact(item, ['id', 'reference']) || typeof item.id !== 'string' ||
        !ID.test(item.id) ||
        !ids.has(item.id) || byId.has(item.id) ||
        (item.reference !== null && !plain(item.reference))) {
      fail('reference IDs must match native batch exactly, without duplicates');
    }
    byId.set(item.id, item.reference);
  }
  return byId;
}

/** No source URL is fetched: independence and truth are human review gates. */
export function compareRegoloConjunctionBatch(nativeBatch, referenceManifest) {
  const ids = checkedBatch(nativeBatch);
  const references = checkedReferences(referenceManifest, ids);
  const results = [];
  const counts = {total: nativeBatch.results.length, matched: 0, mismatched: 0,
    nativeUnavailable: 0, missingReference: 0, invalidReference: 0};
  const maxima = {absEventDeltaSeconds: null, sunResidualArcsec: null,
    moonResidualArcsec: null};
  for (const item of nativeBatch.results) {
    const reference = references.get(item.id);
    let output;
    if (item.outcome !== 'CANDIDATE') {
      ++counts.nativeUnavailable;
      output = {id: item.id, status: 'NATIVE_CANDIDATE_UNAVAILABLE',
        detail: Object.hasOwn(item, 'error') ? item.error : item.receipt.status};
    } else if (reference === null) {
      ++counts.missingReference;
      output = {id: item.id, status: 'MISSING_INDEPENDENT_REFERENCE'};
    } else {
      try {
        const comparison = compareRegoloConjunctionReference(item.receipt, reference);
        if (comparison.status === 'NUMERICALLY_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED') {
          ++counts.matched;
        } else {
          ++counts.mismatched;
        }
        if (comparison.comparisons) {
          maxima.absEventDeltaSeconds = Math.max(maxima.absEventDeltaSeconds ?? 0,
            Math.abs(comparison.comparisons.signedEventDeltaSeconds));
          maxima.sunResidualArcsec = Math.max(maxima.sunResidualArcsec ?? 0,
            comparison.comparisons.sunResidualArcsec);
          maxima.moonResidualArcsec = Math.max(maxima.moonResidualArcsec ?? 0,
            comparison.comparisons.moonResidualArcsec);
        }
        output = {id: item.id, status: comparison.status, comparison};
      } catch (error) {
        ++counts.invalidReference;
        output = {id: item.id, status: 'INVALID_REFERENCE',
          error: String(error?.message ?? error).slice(0, 512)};
      }
    }
    results.push(Object.freeze(output));
  }
  return Object.freeze({contract: 'RegoloConjunctionBatchComparisonV1',
    status: counts.matched === counts.total ?
      'ALL_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED' :
      'MISMATCH_OR_INCOMPLETE_EVIDENCE',
    scientificallyCertified: false, referenceIndependenceAudited: false,
    sourceBuildOriginVerified: false, regoloNewMoonAvailable: false,
    source: nativeBatch.source, counts: Object.freeze(counts),
    maxima: Object.freeze(maxima), results: Object.freeze(results)});
}

function readJson(filename) {
  const info = statSync(filename);
  if (!info.isFile() || info.size > 5_000_000) {
    fail('input must be a regular JSON file of at most 5 MB');
  }
  return JSON.parse(readFileSync(filename, 'utf8'));
}

export const HELP = `Compare a multi-epoch native Rust/DE441 audit to independent references.

node scripts/compare-regolo-conjunction-batch.mjs \\
  --batch conjunction-batch-audit.json \\
  --references independent-conjunction-batch-references.json

References schema:
{"contract":"RegoloIndependentConjunctionBatchReferencesV1","references":[
  {"id":"EXACT_NATIVE_CASE_ID","reference":null}
]}
Replace null with the FULL RegoloIndependentConjunctionReferenceV1 JSON for
that case, including independent event JD UT1 and Sun/Moon positions at the
native candidate's exact JD UT1. Null marks deliberately missing evidence.
Every native ID must occur exactly once. Exit 0 merely means all independent
numbers fall inside individually supplied thresholds, NOT certification.
No network fetch, no new-Moon availability and no production integration.`;

async function main() {
  try {
    const {values} = parseArgs({args: process.argv.slice(2), strict: true,
      options: {batch: {type: 'string'}, references: {type: 'string'},
        help: {type: 'boolean'}}});
    if (values.help) {process.stdout.write(`${HELP}\n`); return;}
    if (typeof values.batch !== 'string' || !values.batch ||
        typeof values.references !== 'string' || !values.references ||
        [values.batch, values.references].some(s => s.length > 1024 ||
          /[\x00-\x1f\x7f]/.test(s))) {
      fail('both --batch and --references local JSON paths are required');
    }
    const report = compareRegoloConjunctionBatch(readJson(values.batch),
      readJson(values.references));
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.status !== 'ALL_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED') {
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
