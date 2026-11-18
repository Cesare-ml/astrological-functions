import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ASTRO_COM_HOUSE_SYSTEM_IDS} from '../src/astro-com-house-selector.mjs';
import {HOUSE_SMOKE_FIXTURE} from '../scripts/verify-native-house-bridge.mjs';
import {LATITUDE_AUDIT_CASES} from '../scripts/audit-native-house-latitudes.mjs';
import {compareNativeHouseLatitudeAudit, readSmallJson} from
  '../scripts/compare-native-house-latitudes.mjs';

const methods = ASTRO_COM_HOUSE_SYSTEM_IDS.filter(id => id !== 'SUNSHINE');
const context = {upstreamCommitSha: 'a'.repeat(40),
  nativeAddonSha256: 'b'.repeat(64), kernelContext: 'FAKE_NO_KERNEL'};
const angles = {model: 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME',
  armcDeg: 61.5, ascendantDeg: 127.25,
  midheavenDeg: 65.5, trueObliquityDeg: 23.44};
const angleValues = {armcDeg: 61.5, ascendantDeg: 127.25,
  midheavenDeg: 65.5, trueObliquityDeg: 23.44};
const values = id => Array.from({length: id === 'GAUQUELIN_36' ? 36 : 12},
  (_, i) => i * (id === 'GAUQUELIN_36' ? 10 : 30));
const source = kind => ({kind, title: 'Fake synthetic test only',
  uri: 'https://example.invalid/synthetic-do-not-use',
  acquiredUtc: '2026-11-17T21:00:00Z',
  convention: 'Mock values, not independently sourced'});

function fakeAudit() {
  return {contract: 'VirgoStarsNativeHouseLatitudeAuditV1',
    status: 'STRUCTURAL_GRID_COMPLETE_NOT_CERTIFIED',
    scientificallyCertified: false, highLatitudeMethodParityVerified: false,
    expectedPolarAvailabilityVerified: false, resultsAreIndependentReferences: false,
    scenarioCount: 7, attempted: 161, passed: 161, failed: 0,
    blocked: [{houseSystem: 'SUNSHINE',
      reason: 'INDEPENDENT_APPARENT_SUN_DECLINATION_NOT_SUPPLIED'}],
    ephemeris: {...context,
      kernelRole: 'CALLER_CONTEXT_ONLY_HOUSE_ANGLES_DO_NOT_READ_DE441',
      addonBuiltFromSelectedCommitIndependentlyVerified: false},
    scenarios: LATITUDE_AUDIT_CASES.map(({id, latitudeDeg}) => ({
      id, fixture: {...HOUSE_SMOKE_FIXTURE, id, latitudeDeg},
      sourceAngles: {...angles}, attempted: 23, passed: 23, failed: 0, failures: [],
      results: methods.map(houseSystem => ({houseSystem, valuesDeg: values(houseSystem)})),
    }))};
}

function fakeReferences() {
  return {contract: 'VirgoStarsHouseLatitudeReferenceSetV1',
    ephemeris: {...context},
    scenarios: LATITUDE_AUDIT_CASES.map(({id, latitudeDeg}) => ({
      id, latitudeDeg,
      angleReference: {source: source('INDEPENDENT_ASTRONOMICAL_ANGLES'),
        valuesDeg: {...angleValues}, toleranceArcsec: 1,
        toleranceRationale: 'Synthetic one-arcsecond threshold only'},
      methods: methods.map(houseSystem => ({houseSystem,
        expectation: 'AVAILABLE', valuesDeg: values(houseSystem),
        toleranceArcsec: 1,
        toleranceRationale: 'Synthetic one-arcsecond threshold only',
        source: source('INDEPENDENT_METHOD_NUMERIC')})),
    }))};
}

test('all 161 synthetic numeric matches and 7 angular sets remain explicitly uncertified', () => {
  const report = compareNativeHouseLatitudeAudit(fakeAudit(), fakeReferences());
  assert.equal(report.status, 'MATCHES_CALLER_REFERENCES_NOT_CERTIFIED');
  assert.equal(report.methodsExpected, 161);
  assert.equal(report.methodsCompared, 161);
  assert.equal(report.angleComparisons.length, 7);
  assert.equal(report.scientificallyCertified, false);
  assert.equal(report.sourceIndependenceAudited, false);
  assert.equal(report.binaryBuildOriginIndependentlyVerified, false);
  assert.deepEqual(report.mismatches, []);
  assert.deepEqual(report.missingMethodReferences, []);
  assert.deepEqual(report.missingAngleReferences, []);
});

test('reviewed polar unavailability can match an exact method-specific error only', () => {
  const audit = fakeAudit();
  const reference = fakeReferences();
  const polar = audit.scenarios[0];
  polar.results.shift();
  polar.failures.push({houseSystem: 'PLACIDUS', code: 'POLAR_HOUSES_UNAVAILABLE',
    message: 'Synthetic unsupported arc'});
  polar.passed = 22;
  polar.failed = 1;
  audit.passed = 160;
  audit.failed = 1;
  audit.status = 'METHOD_ERRORS_REQUIRE_MANUAL_REVIEW';
  reference.scenarios[0].methods[0] = {houseSystem: 'PLACIDUS', expectation: 'UNAVAILABLE',
    errorCode: 'POLAR_HOUSES_UNAVAILABLE',
    source: source('INDEPENDENT_METHOD_AVAILABILITY')};

  const valid = compareNativeHouseLatitudeAudit(audit, reference);
  assert.equal(valid.status, 'MATCHES_CALLER_REFERENCES_NOT_CERTIFIED');
  assert.equal(valid.methods[0].actualErrorCode, 'POLAR_HOUSES_UNAVAILABLE');
  const wrongCode = fakeReferences();
  wrongCode.scenarios[0].methods[0] = {...reference.scenarios[0].methods[0],
    errorCode: 'GAUQUELIN_CUSPS_UNAVAILABLE'};
  const mismatch = compareNativeHouseLatitudeAudit(audit, wrongCode);
  assert.equal(mismatch.status, 'NUMERICAL_OR_AVAILABILITY_MISMATCH');
  assert.ok(mismatch.mismatches.includes('S_HIGH_80:PLACIDUS'));
  const generic = fakeReferences();
  generic.scenarios[0].methods[0] = {...reference.scenarios[0].methods[0],
    errorCode: 'E_NATIVE_LATITUDE_METHOD'};
  assert.throws(() => compareNativeHouseLatitudeAudit(audit, generic),
    /E_LATITUDE_COMPARE_REFERENCE/);
});

test('numeric residuals compare across 0°/360° and reject over-tolerance differences', () => {
  const audit = fakeAudit();
  const reference = fakeReferences();
  audit.scenarios[0].results[0].valuesDeg[0] = 359.9999;
  reference.scenarios[0].methods[0].valuesDeg[0] = 0.0001;
  const success = compareNativeHouseLatitudeAudit(audit, reference);
  assert.equal(success.status, 'MATCHES_CALLER_REFERENCES_NOT_CERTIFIED');
  assert.ok(Math.abs(success.methods[0].maxResidualArcsec - 0.72) < 1e-6);
  reference.scenarios[0].methods[0].toleranceArcsec = 0.5;
  audit.scenarios[0].sourceAngles.armcDeg = 61.52;
  const mismatch = compareNativeHouseLatitudeAudit(audit, reference);
  assert.equal(mismatch.status, 'NUMERICAL_OR_AVAILABILITY_MISMATCH');
  assert.ok(mismatch.mismatches.includes('S_HIGH_80:PLACIDUS'));
  assert.ok(mismatch.mismatches.includes('S_HIGH_80:HOUSE_ANGLES'));
});

test('partial source coverage is never mistaken for a completed grid', () => {
  const references = fakeReferences();
  references.scenarios = references.scenarios.slice(0, 1);
  references.scenarios[0].methods = references.scenarios[0].methods.slice(0, 2);
  delete references.scenarios[0].angleReference;
  const report = compareNativeHouseLatitudeAudit(fakeAudit(), references);
  assert.equal(report.status, 'INCOMPLETE_REFERENCES');
  assert.equal(report.methodsCompared, 2);
  assert.equal(report.missingMethodReferences.length, 159);
  assert.equal(report.missingAngleReferences.length, 7);
});

test('tampered addon, fixture, duplicate methods and impossible counts fail closed', () => {
  const broken = [];
  const a = fakeAudit();
  a.scenarios[0].fixture.ut1JulianDay += 0.1;
  broken.push(a);
  const b = fakeAudit();
  b.scenarios[0].results[1].houseSystem = b.scenarios[0].results[0].houseSystem;
  broken.push(b);
  const c = fakeAudit();
  c.failed = 1;
  broken.push(c);
  const d = fakeAudit();
  d.scenarios[0].sourceAngles.trueObliquityDeg = 360;
  broken.push(d);
  const e = fakeAudit();
  e.scenarios[0].failures.push({houseSystem: 'PLACIDUS', code: 'INVALID_CUSPS',
    message: 'Duplicate success and failure'});
  broken.push(e);
  for (const receipt of broken) {
    assert.throws(() => compareNativeHouseLatitudeAudit(receipt, fakeReferences()),
      /E_LATITUDE_COMPARE_/);
  }
  const wrongAddon = fakeReferences();
  wrongAddon.ephemeris.nativeAddonSha256 = 'c'.repeat(64);
  assert.throws(() => compareNativeHouseLatitudeAudit(fakeAudit(), wrongAddon),
    /E_LATITUDE_COMPARE_REFERENCE/);
});

test('references must have exact provenance, method variants and justified tolerances', () => {
  const cases = [];
  const a = fakeReferences();
  a.scenarios[0].methods[0].source.uri = 'file:///local/data';
  cases.push(a);
  const b = fakeReferences();
  b.scenarios[0].methods[0].toleranceArcsec = 5000;
  cases.push(b);
  const c = fakeReferences();
  c.scenarios[0].methods[0].houseSystem = 'SUNSHINE';
  cases.push(c);
  const d = fakeReferences();
  d.scenarios[0].methods[1].houseSystem = 'PLACIDUS';
  cases.push(d);
  const e = fakeReferences();
  e.scenarios[0].angleReference.valuesDeg.trueObliquityDeg = 0;
  cases.push(e);
  for (const ref of cases) {
    assert.throws(() => compareNativeHouseLatitudeAudit(fakeAudit(), ref),
      /E_LATITUDE_COMPARE_/);
  }
});

test('manual CLI never advertises scientific certification or accepts implicit files', () => {
  const script = fileURLToPath(new URL('../scripts/compare-native-house-latitudes.mjs', import.meta.url));
  const help = spawnSync(process.execPath, [script, '--help'], {encoding: 'utf8'});
  assert.equal(help.status, 0);
  assert.match(help.stdout, /NOT scientific certification/);
  const missing = spawnSync(process.execPath, [script], {encoding: 'utf8'});
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /E_LATITUDE_COMPARE_ARGS/);
  assert.match(path.basename(script), /latitudes/);
});

test('Windows UTF-16LE/BOM references and audits work, invalid Unicode fails closed', () => {
  const script = fileURLToPath(new URL(
    '../scripts/compare-native-house-latitudes.mjs', import.meta.url));
  const dir = mkdtempSync(path.join(tmpdir(), 'vs-native-reference-'));
  try {
    const audit = path.join(dir, 'audit.json');
    const reference = path.join(dir, 'reference.json');
    writeFileSync(audit, `\uFEFF${JSON.stringify(fakeAudit())}`, 'utf16le');
    writeFileSync(reference, `\uFEFF${JSON.stringify(fakeReferences())}`, 'utf16le');
    assert.equal(readSmallJson(reference).scenarios.length, 7);
    const result = spawnSync(process.execPath, [script, '--audit', audit,
      '--reference', reference], {encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, 'MATCHES_CALLER_REFERENCES_NOT_CERTIFIED');
    writeFileSync(reference, Buffer.from([0xff, 0xfe, 0x7b]));
    assert.throws(() => readSmallJson(reference), /E_LATITUDE_COMPARE_JSON/);
    const invalid = spawnSync(process.execPath, [script, '--audit', audit,
      '--reference', reference], {encoding: 'utf8'});
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /E_LATITUDE_COMPARE_JSON/);
    writeFileSync(reference, Buffer.from([0xc3, 0x28]));
    assert.throws(() => readSmallJson(reference), /E_LATITUDE_COMPARE_JSON/);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});
