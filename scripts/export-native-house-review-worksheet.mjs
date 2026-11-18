#!/usr/bin/env node
/**
 * Export a human-readable CSV worksheet from a VERIFIED native 7×23 bundle.
 * All independent-reference cells are intentionally blank: the native addon
 * under review can never supply its own scientific expected values.
 */
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {readNativeLatitudeDiffReceipt} from './diff-native-house-latitudes.mjs';
import {verifyNativeHouseRegressionBundle} from './verify-native-house-regression-bundle.mjs';

export const NATIVE_HOUSE_REVIEW_COLUMNS = Object.freeze([
  'row_type', 'scenario_id', 'latitude_deg', 'house_system',
  'observed_transition', 'observed_outcome', 'observed_error_code',
  'observed_changed_cusps', 'observed_max_cusp_delta_arcsec',
  'observed_horizon_status', 'triage_priority', 'required_independent_evidence',
  'review_status', 'reference_source_url', 'reference_source_title',
  'reference_source_acquired_utc', 'reference_source_convention',
  'reference_expected_availability', 'reference_expected_values_degrees',
  'reference_expected_error_code', 'reference_tolerance_arcsec',
  'reference_tolerance_rationale', 'reviewer_notes',
]);

const fail = (code, reason) => {throw new Error(`${code}: ${reason}`);};

/** CSV and spreadsheet-formula escaping (without modifying numeric latitudes). */
export function reviewCsvCell(value) {
  if (value === undefined || value === null) return '""';
  let content = String(value);
  // A numeric cell may become a string after a CSV editor round trip. Keep
  // plain signed decimal numbers intact; guard all other formula-like text.
  if (typeof value === 'string' && /^\s*[=+\-@]/u.test(content) &&
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/u.test(content)) {
    content = `'${content}`;
  }
  return `"${content.replaceAll('"', '""')}"`;
}

export function createNativeHouseReviewWorksheetCsv(bundle) {
  verifyNativeHouseRegressionBundle(bundle);
  const queue = bundle.reports.methodReview;
  if (queue.methods.length !== 161 || queue.angles.length !== 7) {
    fail('E_NATIVE_WORKSHEET_COVERAGE', 'Require all 161 methods and seven angle cases');
  }
  const emptyIndependentFields = Array(10).fill('');
  const rows = [NATIVE_HOUSE_REVIEW_COLUMNS];
  for (const item of queue.methods) {
    rows.push(['METHOD', item.id, item.latitudeDeg, item.houseSystem,
      item.transition, item.currentOutcome, item.currentErrorCode,
      item.changedCusps, item.maxCuspDeltaArcsec, null, item.triage,
      item.requiredEvidence, item.reviewStatus, ...emptyIndependentFields]);
  }
  for (const item of queue.angles) {
    rows.push(['ANGLES', item.id, item.latitudeDeg, null,
      null, null, null, null, null, item.analyticHorizonStatus,
      item.triage, item.requiredEvidence, item.reviewStatus,
      ...emptyIndependentFields]);
  }
  if (rows.length !== 169 || rows.some(row => row.length !== NATIVE_HOUSE_REVIEW_COLUMNS.length)) {
    fail('E_NATIVE_WORKSHEET_COVERAGE', 'Worksheet schema or row count changed');
  }
  // Excel recognizes the UTF-8 BOM; CRLF preserves one physical row per case.
  return `\uFEFF${rows.map(row => row.map(reviewCsvCell).join(',')).join('\r\n')}\r\n`;
}

export const HELP_TEXT = `Export a human review worksheet (CSV) from a VERIFIED native 7×23 evidence bundle.
  node scripts/export-native-house-review-worksheet.mjs \\
    --bundle house-regression-bundle.json --out NEW-review-worksheet.csv \\
    [--expected-commit 40_HEX_SHA] [--expected-baseline-sha256 64_HEX_SHA]

Creates, without overwriting, a UTF-8-BOM Excel-readable CSV with 161 method
rows and seven angle rows. Observed fields and triage priorities come only from
the internally consistent evidence bundle. Independent source, expected value,
availability and reviewer fields are BLANK. An optional importer can convert
manually completed, independently sourced rows into comparator-compatible JSON.
This CSV is a HUMAN TRIAGE AID, NOT scientific certification or proof of binary
provenance. Never copy native addon values/errors into expected references.`;

async function main() {
  try {
    const {values} = parseArgs({args: process.argv.slice(2), strict: true,
      options: {bundle: {type: 'string'}, out: {type: 'string'},
        'expected-commit': {type: 'string'},
        'expected-baseline-sha256': {type: 'string'}, help: {type: 'boolean'}}});
    if (values.help) {
      process.stdout.write(`${HELP_TEXT}\n`);
      return;
    }
    if (!values.bundle || !values.out ||
        (values['expected-commit'] !== undefined &&
          !/^[a-f\d]{40}$/i.test(values['expected-commit'])) ||
        (values['expected-baseline-sha256'] !== undefined &&
          !/^[a-f\d]{64}$/i.test(values['expected-baseline-sha256']))) {
      fail('E_NATIVE_WORKSHEET_OPTIONS',
        'Require --bundle, --out and correctly formatted optional SHA pins');
    }
    const bundle = readNativeLatitudeDiffReceipt(values.bundle, 20_000_000);
    const csv = createNativeHouseReviewWorksheetCsv(bundle);
    if (values['expected-commit'] &&
        bundle.reports.nativeGrid.ephemeris.upstreamCommitSha.toLowerCase() !==
          values['expected-commit'].toLowerCase()) {
      fail('E_NATIVE_WORKSHEET_COMMIT', 'Bundle differs from independently pinned Rust commit');
    }
    if (values['expected-baseline-sha256'] &&
        bundle.reports.summary.baselineReceiptSha256.toLowerCase() !==
          values['expected-baseline-sha256'].toLowerCase()) {
      fail('E_NATIVE_WORKSHEET_BASELINE',
        'Bundle differs from independently pinned historical receipt');
    }
    const output = path.resolve(values.out);
    writeFileSync(output, csv, {flag: 'wx', encoding: 'utf8'});
    process.stdout.write(`${JSON.stringify({status: 'HUMAN_REVIEW_WORKSHEET_NOT_CERTIFIED',
      file: output, methodRows: 161, angleRows: 7, independentReferencesEntered: 0,
      scientificallyCertified: false}, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
