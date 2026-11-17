import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ASTRO_COM_HOUSE_SYSTEM_IDS} from '../src/astro-com-house-selector.mjs';
import {HOUSE_SMOKE_FIXTURE} from '../scripts/verify-native-house-bridge.mjs';
import {compareNativeHouseReceipt} from '../scripts/compare-native-house-receipt.mjs';

const systems = ASTRO_COM_HOUSE_SYSTEM_IDS.filter(method => method !== 'SUNSHINE');
const angles = Object.freeze({model: 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME',
  armcDeg: 61.5, ascendantDeg: 127.25, midheavenDeg: 65.5, trueObliquityDeg: 23.44});
const numericalAngles = {armcDeg: 61.5, ascendantDeg: 127.25,
  midheavenDeg: 65.5, trueObliquityDeg: 23.44};
const values = method => Array.from({length: method === 'GAUQUELIN_36' ? 36 : 12},
  (_, i) => 360 * i / (method === 'GAUQUELIN_36' ? 36 : 12));
const fakeSmoke = () => ({contract: 'VirgoStarsNativeHouseSmokeV1',
  status: 'NATIVE_ADDON_EXECUTED_STRUCTURAL_ONLY',
  validatedScientificParity: false, addonBuiltFromSelectedCommitIndependentlyVerified: false,
  ephemeris: {upstreamCommitSha: 'a'.repeat(40), nativeAddonSha256: 'b'.repeat(64),
    kernelContext: 'TEST_NO_KERNEL', kernelRole: 'CALLER_CONTEXT_ONLY_HOUSE_ANGLES_DO_NOT_READ_DE441'},
  fixture: {...HOUSE_SMOKE_FIXTURE}, angles: {...angles}, attempted: 23,
  passed: 23, failed: 0, failures: [],
  blocked: [{houseSystem: 'SUNSHINE', reason: 'INDEPENDENT_APPARENT_SUN_DECLINATION_NOT_SUPPLIED'}],
  results: systems.map(houseSystem => ({houseSystem, valuesDeg: values(houseSystem)}))});
const refSource = (kind, convention) => ({kind,
  title: 'Synthetic test source (not independently measured)',
  uri: 'https://example.invalid/synthetic-unit-test-only',
  acquiredUtc: '2026-11-17T21:00:00Z', convention});
const fakeReference = () => ({contract: 'VirgoStarsHouseReferenceSetV1',
  fixture: {...HOUSE_SMOKE_FIXTURE},
  angleReference: {source: refSource('INDEPENDENT_ASTRONOMICAL_ANGLES', 'MOCK_MODEL_ONLY'),
    valuesDeg: {...numericalAngles}, toleranceArcsec: 1,
    toleranceRationale: 'Synthetic numeric comparison precision only'},
  methodSource: refSource('ASTRO_COM_METHOD_PARITY', 'MOCK_CUSPS_ONLY'),
  methods: systems.map(houseSystem => ({houseSystem, valuesDeg: values(houseSystem),
    toleranceArcsec: 1, toleranceRationale: 'Synthetic numeric comparison precision only'}))});

test('all 23 methods and four angles compare, but even exact fake parity is not certified', () => {
  const result = compareNativeHouseReceipt(fakeSmoke(), fakeReference());
  assert.equal(result.status, 'NUMERICALLY_WITHIN_CALLER_THRESHOLDS_NOT_CERTIFIED');
  assert.equal(result.scientificallyCertified, false);
  assert.equal(result.referenceIndependenceAudited, false);
  assert.equal(result.methodsCompared, 23);
  assert.equal(result.missingReferences.length, 0);
  assert.equal(result.maxAngleResidualArcsec, 0);
  assert.equal(result.blocked[0].houseSystem, 'SUNSHINE');
  assert.equal(result.methods.find(m => m.houseSystem === 'GAUQUELIN_36').comparedValues, 36);
});

test('reference comparison handles the 0°/360° seam at sub-arcsecond precision', () => {
  const receipt = fakeSmoke();
  const reference = fakeReference();
  receipt.results[0].valuesDeg[0] = 359.9999;
  reference.methods[0].valuesDeg[0] = 0.0001;
  const result = compareNativeHouseReceipt(receipt, reference);
  const first = result.methods[0];
  assert.ok(Math.abs(first.maxResidualArcsec - 0.72) < 1e-6);
  assert.equal(first.withinTolerance, true);
});

test('errors above per-method tolerance and angle tolerance cannot produce a green receipt', () => {
  const receipt = fakeSmoke();
  const reference = fakeReference();
  receipt.results[0].valuesDeg[0] = 0.001; // 3.6 arcsec > 1 arcsec.
  receipt.angles.ascendantDeg += 0.01;
  const result = compareNativeHouseReceipt(receipt, reference);
  assert.equal(result.status, 'NUMERICAL_MISMATCH');
  assert.ok(result.failures.includes(systems[0]));
  assert.ok(result.failures.includes('HOUSE_ANGLES'));
  assert.equal(result.anglesWithinTolerance, false);
});

test('missing reference coverage cannot be mistaken for complete scientific parity', () => {
  const reference = fakeReference();
  reference.methods = reference.methods.slice(0, 2);
  delete reference.angleReference;
  const report = compareNativeHouseReceipt(fakeSmoke(), reference);
  assert.equal(report.status, 'INCOMPLETE_REFERENCES');
  assert.equal(report.missingReferences.length, 21);
  assert.equal(report.angleResidualsArcsec, null);
  assert.equal(report.methodsCompared, 2);
});

test('invalid fixture, failed smoke, fake method identities and duplicate records fail closed', () => {
  const invalidSmokes = [
    {...fakeSmoke(), fixture: {...HOUSE_SMOKE_FIXTURE, latitudeDeg: 39}},
    {...fakeSmoke(), passed: 22, failed: 1},
    {...fakeSmoke(), results: fakeSmoke().results.slice(1)},
    {...fakeSmoke(), angles: {...angles, trueObliquityDeg: Infinity}},
    {...fakeSmoke(), results: fakeSmoke().results.map((r, i) =>
      i === 1 ? {...r, houseSystem: systems[0]} : r)},
    {...fakeSmoke(), results: fakeSmoke().results.map((r, i) =>
      i === 1 ? {...r, valuesDeg: r.valuesDeg.slice(1)} : r)},
  ];
  for (const receipt of invalidSmokes) {
    assert.throws(() => compareNativeHouseReceipt(receipt, fakeReference()), /E_HOUSE_COMPARISON_/);
  }
  const wrong = fakeReference();
  wrong.methods[0].houseSystem = 'SUNSHINE';
  assert.throws(() => compareNativeHouseReceipt(fakeSmoke(), wrong), /E_HOUSE_COMPARISON_REFERENCE/);
  const duplicated = fakeReference();
  duplicated.methods[1].houseSystem = duplicated.methods[0].houseSystem;
  assert.throws(() => compareNativeHouseReceipt(fakeSmoke(), duplicated), /E_HOUSE_COMPARISON_REFERENCE/);
});

test('cannot erase reference provenance, convention or permit arbitrary tolerance', () => {
  const invalidReferences = [];
  const missingUri = fakeReference();
  missingUri.methodSource.uri = '';
  invalidReferences.push(missingUri);
  const badTolerance = fakeReference();
  badTolerance.methods[0].toleranceArcsec = 36000;
  invalidReferences.push(badTolerance);
  const noReason = fakeReference();
  noReason.angleReference.toleranceRationale = '';
  invalidReferences.push(noReason);
  const missingEpoch = fakeReference();
  missingEpoch.fixture.ttJulianDay += 1 / 86400;
  invalidReferences.push(missingEpoch);
  const badReferenceAngle = fakeReference();
  badReferenceAngle.angleReference.valuesDeg.armcDeg = 360;
  invalidReferences.push(badReferenceAngle);
  for (const ref of invalidReferences) {
    assert.throws(() => compareNativeHouseReceipt(fakeSmoke(), ref), /E_HOUSE_COMPARISON_/);
  }
});

test('comparison CLI requires both inputs and prints a non-certification warning', () => {
  const script = fileURLToPath(new URL('../scripts/compare-native-house-receipt.mjs', import.meta.url));
  const help = spawnSync(process.execPath, [script, '--help'], {encoding: 'utf8'});
  assert.equal(help.status, 0);
  assert.match(help.stdout, /NOT scientific certification/);
  const missing = spawnSync(process.execPath, [script], {encoding: 'utf8'});
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /E_HOUSE_COMPARISON_ARGS/);
});
