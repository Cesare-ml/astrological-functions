import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError, normalize360 } from '../src/index.mjs';
import { ASTRO_COM_HOUSE_SYSTEM_IDS, ASTRO_COM_HOUSE_METHODS,
  calculateAstroComHouseMethod } from '../src/astro-com-house-selector.mjs';
import { calculateSunshineHouseCusps } from '../src/declination-arc-house-cusps.mjs';
import { calculateGauquelinSectors } from '../src/gauquelin-sectors.mjs';

const R = Math.PI / 180;
const D = 180 / Math.PI;
const datetimeUtc = '2000-01-01T12:00:00Z';
const latitudeDeg = 40;
const armcDeg = 61.66688244516181;
const trueObliquityDeg = 23.437859777570328;
const theta = armcDeg * R;
const phi = latitudeDeg * R;
const epsilon = trueObliquityDeg * R;
const ascendantDeg = normalize360(Math.atan2(-Math.cos(theta),
  Math.sin(epsilon) * Math.tan(phi) + Math.cos(epsilon) * Math.sin(theta)) * D + 180);
const midheavenDeg = normalize360(Math.atan2(Math.sin(theta), Math.cos(theta) * Math.cos(epsilon)) * D);
const source = {
  engineVersion: 'SYNTHETIC_TEST', kernelSetId: 'SYNTHETIC_ONLY', timeModel: 'TEST_TIME',
  frame: 'ECLIPTIC_OF_DATE', zodiac: 'TROPICAL', observerType: 'TOPOCENTRIC',
  observer: { latitudeDeg, longitudeDegEast: 12.4964 },
};
const porphyry = { datetimeUtc, ascendantDeg, midheavenDeg, source };
const placidus = { ...porphyry, birthTimeKnown: true, armcDeg, trueObliquityDeg };
const geometric = { ...placidus, angleModel: 'SYNTHETIC_EXPLICIT_TEST' };
const axial = { datetimeUtc, birthTimeKnown: true, armcDeg, trueObliquityDeg,
  angleModel: geometric.angleModel, source };
const zodiac = { datetimeUtc, frame: 'ECLIPTIC_OF_DATE', longitudeBasis: { type: 'TROPICAL' } };
const sunshine = { ...geometric, sun: {
  datetimeUtc, declinationDeg: 0, modelId: 'SYNTHETIC_SUN_DECLINATION', bodyId: 'SUN',
  frame: 'EQUATORIAL_OF_DATE', center: 'EARTH', corrections: 'APPARENT',
  observerType: 'GEOCENTRIC', source: {
    engineVersion: source.engineVersion, kernelSetId: source.kernelSetId,
    timeModel: source.timeModel,
  },
} };

const inputs = Object.freeze({
  PLACIDUS: placidus,
  KOCH: placidus,
  CAMPANUS: geometric,
  REGIOMONTANUS: placidus,
  EQUAL_ASCENDANT: { ...zodiac, ascendantLongitudeDeg: ascendantDeg },
  EQUAL_MIDHEAVEN: { ...zodiac, midheavenLongitudeDeg: midheavenDeg, birthTimeKnown: true },
  VEHLOW: { datetimeUtc, birthTimeKnown: true, ascendantDeg,
    profile: 'VEHLOW_ASC_CENTERED_V1', source: { ...source, center: 'EARTH', corrections: 'APPARENT' } },
  WHOLE_SIGN: { ...zodiac, ascendantLongitudeDeg: ascendantDeg, birthTimeKnown: true },
  WHOLE_ARIES: zodiac,
  MERIDIAN: { ...axial, midheavenDeg },
  PORPHYRY: porphyry,
  ALCABITIUS: geometric,
  KRUSINSKI_PISA_GOELZER: geometric,
  AZIMUTH: geometric,
  MORINUS: axial,
  POLICH_PAGE: geometric,
  APC: geometric,
  PULLEN_SD: { ...porphyry, birthTimeKnown: true },
  PULLEN_SR: { ...porphyry, birthTimeKnown: true },
  SRIPATI: porphyry,
  CARTER_POLI_EQUATORIAL: { ...axial, ascendantDeg },
  SUNSHINE: sunshine,
  GAUQUELIN_36: geometric,
  ALBATEGNIUS: geometric,
});

const isError = code => error => error instanceof AstrologyError && error.code === code;

test('Astro.com selector has exactly 24 canonical methods, in documented order', () => {
  assert.equal(ASTRO_COM_HOUSE_SYSTEM_IDS.length, 24);
  assert.equal(new Set(ASTRO_COM_HOUSE_SYSTEM_IDS).size, 24);
  assert.deepEqual(ASTRO_COM_HOUSE_SYSTEM_IDS, Object.keys(inputs));
  assert.ok(!ASTRO_COM_HOUSE_SYSTEM_IDS.includes('DEFAULT'));
  assert.ok(Object.isFrozen(ASTRO_COM_HOUSE_SYSTEM_IDS));
  assert.ok(Object.isFrozen(ASTRO_COM_HOUSE_METHODS));
  for (const descriptor of ASTRO_COM_HOUSE_METHODS) {
    assert.ok(Object.isFrozen(descriptor));
    assert.equal(descriptor.validationStatus, 'IMPLEMENTED_ISOLATED');
    assert.equal(descriptor.resultKind, descriptor.houseSystem === 'GAUQUELIN_36'
      ? 'SECTORS_36' : 'HOUSES_12');
    assert.equal(descriptor.requiresExternalSunDeclination, descriptor.houseSystem === 'SUNSHINE');
  }
});

test('all 24 selected methods execute independently, preserving their own contracts and geometry', () => {
  for (const houseSystem of ASTRO_COM_HOUSE_SYSTEM_IDS) {
    const output = calculateAstroComHouseMethod({ houseSystem, input: inputs[houseSystem] });
    assert.equal(output.houseSystem, houseSystem);
    assert.equal(output.contractVersion, '0.1.0-experimental');
    assert.equal(Date.parse(output.datetimeUtc), Date.parse(datetimeUtc), houseSystem);
    assert.ok(Object.isFrozen(output), houseSystem);
    if (houseSystem === 'GAUQUELIN_36') {
      assert.equal(output.contract, 'GauquelinSectorBoundaries');
      assert.equal(output.sectorCount, 36);
      assert.equal(output.sectorBoundariesDeg.length, 36);
      assert.equal(Object.hasOwn(output, 'cuspsDeg'), false);
    } else {
      assert.equal(output.cuspsDeg.length, 12, houseSystem);
      assert.equal(Object.hasOwn(output, 'sectorBoundariesDeg'), false);
    }
  }
});

test('dispatcher returns the standalone result without changing metadata or implementing its own astronomy', () => {
  assert.deepEqual(calculateAstroComHouseMethod({ houseSystem: 'GAUQUELIN_36', input: geometric }),
    calculateGauquelinSectors(geometric));
  assert.deepEqual(calculateAstroComHouseMethod({ houseSystem: 'SUNSHINE', input: sunshine }),
    calculateSunshineHouseCusps(sunshine));
  assert.ok(Object.isFrozen(calculateAstroComHouseMethod({ houseSystem: 'WHOLE_ARIES', input: zodiac })));
});

test('unknown/alias/invalid requests are explicit failures, not fallback methods', () => {
  for (const request of [null, [], {}, { houseSystem: 'PLACIDUS' },
    { houseSystem: 'PLACIDUS', input: {}, extras: 1 },
    { houseSystem: 'PLACIDUS', input: [] },
    { houseSystem: 'PLACIDUS', input: new Date() }]) {
    assert.throws(() => calculateAstroComHouseMethod(request), isError('INVALID_HOUSE_METHOD_REQUEST'));
  }
  for (const houseSystem of ['Default (Placidus)', 'DEFAULT', 'PLACIDUS_DEFAULT',
    '__proto__', 'constructor', '', 'GAUQUELIN', 0]) {
    assert.throws(() => calculateAstroComHouseMethod({ houseSystem, input: zodiac }),
      isError('UNSUPPORTED_HOUSE_SYSTEM'));
  }
  assert.throws(() => calculateAstroComHouseMethod({ houseSystem: 'SUNSHINE',
    input: geometric }), error => error instanceof AstrologyError);
  assert.throws(() => calculateAstroComHouseMethod({ houseSystem: 'WHOLE_SIGN',
    input: { ...inputs.WHOLE_SIGN, birthTimeKnown: false } }), isError('BIRTH_TIME_UNKNOWN'));
});

test('method-specific polar unavailability is preserved without replacing the result', () => {
  const polarSource = { ...source, observer: { ...source.observer, latitudeDeg: 89 } };
  assert.throws(() => calculateAstroComHouseMethod({ houseSystem: 'PLACIDUS',
    input: { ...placidus, source: polarSource } }), error => error instanceof AstrologyError);
});
