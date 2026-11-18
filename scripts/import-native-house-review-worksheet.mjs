#!/usr/bin/env node
/**
 * Convert independently completed HUMAN worksheet rows into reference JSON.
 * Strictly ignores the observed native output cells as expected values.
 * The comparator still cannot authenticate the independence of any source.
 */
import {readFileSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {readNativeLatitudeDiffReceipt} from './diff-native-house-latitudes.mjs';
import {compareNativeHouseLatitudeAudit} from './compare-native-house-latitudes.mjs';
import {createNativeHouseReferenceTemplate} from './create-native-house-reference-template.mjs';
import {createNativeHouseReviewWorksheetCsv, NATIVE_HOUSE_REVIEW_COLUMNS} from
  './export-native-house-review-worksheet.mjs';

const fail = (code, message) => {throw new Error(`${code}: ${message}`);};
const INDEPENDENT_COLUMNS = NATIVE_HOUSE_REVIEW_COLUMNS.filter(name =>
  name.startsWith('reference_'));
const ANGLE_NAMES = ['armcDeg', 'ascendantDeg', 'midheavenDeg', 'trueObliquityDeg'];

/** Detect an unambiguous delimiter from the unedited first header row. */
function csvDelimiter(input) {
  const marker = /^sep=([,;])(?:\r\n|\n|\r)/i.exec(input);
  const source = marker ? input.slice(marker[0].length) : input;
  const breakIndex = source.search(/[\r\n]/u);
  const header = breakIndex < 0 ? source : source.slice(0, breakIndex);
  let quoted = false, commas = 0, semicolons = 0;
  for (let i = 0; i < header.length; i++) {
    if (header[i] === '"') {
      if (quoted && header[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted && header[i] === ',') commas++;
    else if (!quoted && header[i] === ';') semicolons++;
  }
  if (commas && semicolons) {
    fail('E_NATIVE_WORKSHEET_DELIMITER', 'Mixed commas and semicolons in CSV header');
  }
  const delimiter = semicolons ? ';' : ',';
  if (marker && marker[1] !== delimiter) {
    fail('E_NATIVE_WORKSHEET_DELIMITER', 'Excel sep= delimiter conflicts with CSV header');
  }
  return {source, delimiter};
}

/** Parse quoted UTF-8 comma/semicolon CSV, including quoted newlines. */
export function parseNativeHouseReviewCsv(csv) {
  if (typeof csv !== 'string' || csv.length === 0 || csv.length > 10_000_000 ||
      csv.includes('\u0000')) {
    fail('E_NATIVE_WORKSHEET_CSV', 'Require nonempty, bounded UTF-8 CSV without NUL');
  }
  const {source, delimiter} = csvDelimiter(csv.replace(/^\uFEFF/, ''));
  const records = [];
  let row = [], field = '', quoted = false, closedQuote = false, atFieldStart = true;
  function endField() {
    row.push(field);
    field = '';
    closedQuote = false;
    atFieldStart = true;
  }
  function endRow() {
    endField();
    records.push(row);
    if (records.length > 169) fail('E_NATIVE_WORKSHEET_CSV', 'Too many worksheet rows');
    row = [];
  }
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closedQuote = true;
      } else {
        field += char;
      }
      continue;
    }
    if (char === delimiter) {
      endField();
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      endRow();
    } else if (char === '"' && atFieldStart) {
      quoted = true;
      atFieldStart = false;
    } else if (char === '"' || closedQuote) {
      fail('E_NATIVE_WORKSHEET_CSV', 'Unexpected character after a quoted cell');
    } else {
      field += char;
      atFieldStart = false;
    }
  }
  if (quoted) fail('E_NATIVE_WORKSHEET_CSV', 'Unterminated quoted cell');
  if (row.length || field.length || !atFieldStart) endRow();
  return records;
}

function longitudes(text, count, location) {
  const tokens = text.split(';').map(value => value.trim());
  if (tokens.length !== count || tokens.some(value => !value ||
      !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))) {
    fail('E_NATIVE_WORKSHEET_VALUES',
      `${location}: expected ${count} decimal degrees separated by semicolons`);
  }
  const numbers = tokens.map(Number);
  if (numbers.some(value => !Number.isFinite(value) || value < 0 || value >= 360)) {
    fail('E_NATIVE_WORKSHEET_VALUES', `${location}: degrees must be in [0,360)`);
  }
  return numbers;
}

function sourceDetails(row, kind) {
  return {kind, title: row.reference_source_title.trim(),
    uri: row.reference_source_url.trim(),
    acquiredUtc: row.reference_source_acquired_utc.trim(),
    convention: row.reference_source_convention.trim()};
}

function numericReference(row, rowId, count) {
  if (row.reference_expected_error_code.trim()) {
    fail('E_NATIVE_WORKSHEET_EXPECTATION', `${rowId}: an available result cannot expect an error`);
  }
  const values = longitudes(row.reference_expected_values_degrees, count, rowId);
  const toleranceText = row.reference_tolerance_arcsec.trim();
  const tolerance = Number(toleranceText);
  if (!toleranceText || !Number.isFinite(tolerance) || tolerance <= 0 ||
      tolerance > 3600 || !row.reference_tolerance_rationale.trim()) {
    fail('E_NATIVE_WORKSHEET_TOLERANCE', `${rowId}: numeric references need justified tolerance`);
  }
  return {values, toleranceArcsec: tolerance,
    toleranceRationale: row.reference_tolerance_rationale.trim()};
}

/** Reuses the strict reference comparator; does not synthesize source evidence. */
export function createNativeHouseReferenceFromWorksheet(bundle, csv) {
  const reference = createNativeHouseReferenceTemplate(bundle);
  const records = parseNativeHouseReviewCsv(csv);
  if (records.length !== 169 ||
      JSON.stringify(records[0]) !== JSON.stringify(NATIVE_HOUSE_REVIEW_COLUMNS)) {
    fail('E_NATIVE_WORKSHEET_COLUMNS',
      'Require the exact generated 168-row worksheet and its original column names');
  }
  const expected = new Map();
  const originalRows = parseNativeHouseReviewCsv(createNativeHouseReviewWorksheetCsv(bundle));
  for (const record of originalRows.slice(1)) {
    expected.set(`${record[0]}:${record[1]}:${record[3]}`, record);
  }
  const queue = bundle.reports.methodReview;
  if (expected.size !== queue.methods.length + queue.angles.length) {
    fail('E_NATIVE_WORKSHEET_IDENTITY', 'Unable to reconstruct all 168 native review identities');
  }
  const scenarioMap = new Map(reference.scenarios.map(item => [item.id, item]));
  const seen = new Set();
  for (const values of records.slice(1)) {
    if (values.length !== NATIVE_HOUSE_REVIEW_COLUMNS.length) {
      fail('E_NATIVE_WORKSHEET_COLUMNS', 'Every CSV row must have all named columns');
    }
    const row = Object.fromEntries(NATIVE_HOUSE_REVIEW_COLUMNS.map((name, i) =>
      [name, values[i]]));
    const rowId = `${row.row_type}:${row.scenario_id}:${row.house_system}`;
    const original = expected.get(rowId);
    if (!original || seen.has(rowId) || !row.latitude_deg.trim() ||
        Number(row.latitude_deg) !== Number(original[2])) {
      fail('E_NATIVE_WORKSHEET_IDENTITY',
        `Unknown, duplicate or changed review identity/latitude: ${rowId}`);
    }
    seen.add(rowId);
    // Never trust edited native results, even as human-review context. Excel
    // sometimes rounds a displayed decimal, but categorical observations and
    // exact scenario identity must remain unchanged from the verified bundle.
    for (let i = 4; i < 13; i++) {
      const candidate = values[i].trim();
      const truth = original[i];
      if ((i === 7 || i === 8) && candidate && truth) {
        const a = Number(candidate), b = Number(truth);
        if (Number.isFinite(a) && Math.abs(a - b) <=
            Math.max(1e-9, Math.abs(b) * 1e-12)) continue;
      }
      if (candidate !== truth) {
        fail('E_NATIVE_WORKSHEET_OBSERVED',
          `${rowId}: observed native result/triage cells must match the verified bundle`);
      }
    }
    if (INDEPENDENT_COLUMNS.every(name => !row[name].trim())) continue;
    const availability = row.reference_expected_availability.trim();
    const scenario = scenarioMap.get(row.scenario_id);
    if (row.row_type === 'ANGLES') {
      if (availability !== 'AVAILABLE') {
        fail('E_NATIVE_WORKSHEET_EXPECTATION', `${rowId}: four angle values must be AVAILABLE`);
      }
      const numeric = numericReference(row, rowId, 4);
      scenario.angleReference = {source: sourceDetails(row, 'INDEPENDENT_ASTRONOMICAL_ANGLES'),
        valuesDeg: Object.fromEntries(ANGLE_NAMES.map((name, i) => [name, numeric.values[i]])),
        toleranceArcsec: numeric.toleranceArcsec,
        toleranceRationale: numeric.toleranceRationale};
    } else if (availability === 'AVAILABLE') {
      const numeric = numericReference(row, rowId,
        row.house_system === 'GAUQUELIN_36' ? 36 : 12);
      scenario.methods.push({houseSystem: row.house_system, expectation: availability,
        valuesDeg: numeric.values, toleranceArcsec: numeric.toleranceArcsec,
        toleranceRationale: numeric.toleranceRationale,
        source: sourceDetails(row, 'INDEPENDENT_METHOD_NUMERIC')});
    } else if (availability === 'UNAVAILABLE') {
      if (row.reference_expected_values_degrees.trim() ||
          row.reference_tolerance_arcsec.trim() ||
          row.reference_tolerance_rationale.trim() ||
          !row.reference_expected_error_code.trim()) {
        fail('E_NATIVE_WORKSHEET_EXPECTATION',
          `${rowId}: unavailable requires only a documented method error code`);
      }
      scenario.methods.push({houseSystem: row.house_system, expectation: availability,
        errorCode: row.reference_expected_error_code.trim(),
        source: sourceDetails(row, 'INDEPENDENT_METHOD_AVAILABILITY')});
    } else {
      fail('E_NATIVE_WORKSHEET_EXPECTATION', `${rowId}: use AVAILABLE or UNAVAILABLE`);
    }
  }
  if (seen.size !== expected.size) {
    fail('E_NATIVE_WORKSHEET_IDENTITY', 'All 168 original review identities are required');
  }
  const comparison = compareNativeHouseLatitudeAudit(bundle.reports.nativeGrid, reference);
  return {reference, comparison};
}

export const HELP_TEXT = `Import independently completed human review CSV into the strict JSON reference contract.
  node scripts/import-native-house-review-worksheet.mjs \\
    --bundle house-regression-bundle.json --worksheet COMPLETED.csv --out NEW-references.json \\
    [--expected-commit 40_HEX_SHA] [--expected-baseline-sha256 64_HEX_SHA]

All 168 row identities/latitudes must be preserved. Leave unreviewed reference_*
fields entirely blank; any started reference row must be complete. For AVAILABLE
methods provide 12 longitudes (36 for Gauquelin), or four angles in the order
ARMC;ASC;MC;TRUE_OBLIQUITY, separated by semicolons, with dot decimals, a
positive arcsecond tolerance and rationale. For UNAVAILABLE methods provide a
documented method-specific error code, but no numeric values or tolerance.
Both kinds require real HTTPS source/title, UTC acquisition time and precise
method/model convention. Save UTF-8 CSV with original headers and a comma or
regional semicolon delimiter.
The importer ignores ALL observed native values when building expectations,
validates references with the existing comparator and exclusively writes JSON.
It NEVER certifies authenticity, independence or scientific method correctness.`;

async function main() {
  try {
    const {values} = parseArgs({args: process.argv.slice(2), strict: true,
      options: {bundle: {type: 'string'}, worksheet: {type: 'string'},
        out: {type: 'string'}, 'expected-commit': {type: 'string'},
        'expected-baseline-sha256': {type: 'string'}, help: {type: 'boolean'}}});
    if (values.help) {
      process.stdout.write(`${HELP_TEXT}\n`);
      return;
    }
    if (!values.bundle || !values.worksheet || !values.out ||
        (values['expected-commit'] !== undefined &&
          !/^[a-f\d]{40}$/i.test(values['expected-commit'])) ||
        (values['expected-baseline-sha256'] !== undefined &&
          !/^[a-f\d]{64}$/i.test(values['expected-baseline-sha256']))) {
      fail('E_NATIVE_WORKSHEET_OPTIONS',
        'Require --bundle, --worksheet, --out and correctly formatted optional SHA pins');
    }
    const bundle = readNativeLatitudeDiffReceipt(values.bundle, 20_000_000);
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
    const stats = statSync(values.worksheet);
    if (!stats.isFile() || stats.size === 0 || stats.size > 10_000_000) {
      fail('E_NATIVE_WORKSHEET_FILE', 'Worksheet must be a nonempty CSV file up to 10 MB');
    }
    const csv = new TextDecoder('utf-8', {fatal: true}).decode(readFileSync(values.worksheet));
    const {reference, comparison} = createNativeHouseReferenceFromWorksheet(bundle, csv);
    const filename = path.resolve(values.out);
    writeFileSync(filename, `${JSON.stringify(reference, null, 2)}\n`,
      {flag: 'wx', encoding: 'utf8'});
    process.stdout.write(`${JSON.stringify({status: 'CALLER_SOURCED_REFERENCES_NOT_CERTIFIED',
      file: filename, methodsEntered: comparison.methodsCompared,
      angleSetsEntered: comparison.angleComparisons.length,
      methodReferencesMissing: comparison.missingMethodReferences.length,
      angleReferencesMissing: comparison.missingAngleReferences.length,
      comparisonStatus: comparison.status, scientificallyCertified: false}, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
