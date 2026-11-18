#!/usr/bin/env node
/**
 * Make a comparator-compatible, deliberately EMPTY independent reference set
 * for a verified portable 7×23 regression bundle. Never copy addon outputs
 * into independent expectations or pretend its observed errors are correct.
 */
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {readNativeLatitudeDiffReceipt} from './diff-native-house-latitudes.mjs';
import {compareNativeHouseLatitudeAudit} from './compare-native-house-latitudes.mjs';
import {verifyNativeHouseRegressionBundle} from './verify-native-house-regression-bundle.mjs';

const fail = (code, message) => {throw new Error(`${code}: ${message}`);};

/** Exact identity and seven fixed case IDs, with no unsupported source claims. */
export function createNativeHouseReferenceTemplate(bundle) {
  verifyNativeHouseRegressionBundle(bundle);
  const grid = bundle.reports.nativeGrid;
  const {upstreamCommitSha, nativeAddonSha256, kernelContext} = grid.ephemeris;
  const template = {
    contract: 'VirgoStarsHouseLatitudeReferenceSetV1',
    ephemeris: {upstreamCommitSha, nativeAddonSha256, kernelContext},
    scenarios: grid.scenarios.map(({id, fixture}) => ({
      id, latitudeDeg: fixture.latitudeDeg, methods: [],
    })),
  };
  // This MUST be accepted as INCOMPLETE by the actual scientific comparator;
  // never populate missing expected values from the same addon under test.
  const checked = compareNativeHouseLatitudeAudit(grid, template);
  if (checked.status !== 'INCOMPLETE_REFERENCES' ||
      checked.missingMethodReferences.length !== 161 ||
      checked.missingAngleReferences.length !== 7 ||
      checked.methodsCompared !== 0) {
    fail('E_NATIVE_REFERENCE_TEMPLATE', 'An empty scientific review template must stay incomplete');
  }
  return template;
}

export const HELP_TEXT = `Create an EMPTY independent house-method reference template from a VERIFIED native bundle.
  node scripts/create-native-house-reference-template.mjs \\
    --bundle house-regression-bundle.json --out NEW-reference-template.json \\
    [--expected-commit 40_HEX_SHA] [--expected-baseline-sha256 64_HEX_SHA]

Produces a UTF-8, comparator-compatible 7-case JSON file, exclusively (never
overwrites). It has ZERO method/angle expectations: obtain every expected
value, polar availability decision, tolerance and source from genuinely
independent evidence before adding any reference entries.
Do not copy values/errors from the native grid; this file is NOT validation.
Read docs/NATIVE_NODE_HOUSE_LATITUDE_COMPARISON.md for reference structure.`;

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
      fail('E_NATIVE_REFERENCE_OPTIONS', 'Require --bundle, --out and correctly formatted optional SHA pins');
    }
    const bundle = readNativeLatitudeDiffReceipt(values.bundle, 20_000_000);
    const template = createNativeHouseReferenceTemplate(bundle);
    if (values['expected-commit'] && template.ephemeris.upstreamCommitSha.toLowerCase() !==
        values['expected-commit'].toLowerCase()) {
      fail('E_NATIVE_REFERENCE_COMMIT', 'Bundle differs from independently pinned Rust commit');
    }
    if (values['expected-baseline-sha256'] &&
        bundle.reports.summary.baselineReceiptSha256.toLowerCase() !==
        values['expected-baseline-sha256'].toLowerCase()) {
      fail('E_NATIVE_REFERENCE_BASELINE', 'Bundle differs from independently pinned historical receipt');
    }
    const output = path.resolve(values.out);
    writeFileSync(output, `${JSON.stringify(template, null, 2)}\n`,
      {flag: 'wx', encoding: 'utf8'});
    process.stdout.write(`${JSON.stringify({status: 'EMPTY_INDEPENDENT_REFERENCE_TEMPLATE',
      file: output, scenarios: 7, missingMethodReferences: 161,
      missingAngleReferences: 7, scientificallyCertified: false}, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
