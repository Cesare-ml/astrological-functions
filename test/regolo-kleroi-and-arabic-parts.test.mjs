import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRegoloKleroi } from '../src/regolo-kleroi.mjs';
import {
  calculateRegoloArabicParts, REGOLO_ARABIC_PARTS_CATALOG,
} from '../src/regolo-arabic-parts.mjs';

const core = Object.freeze({
  birthTimeKnown: true,
  sect: 'DAY',
  zodiac: 'TROPICAL',
  chartContextId: 'synthetic-regolo-001',
  ascendantLongitudeDeg: 350,
  planetsLongitudeDeg: Object.freeze({
    SUN: 10, MOON: 80, MERCURY: 100, VENUS: 130,
    MARS: 160, JUPITER: 200, SATURN: 260,
  }),
});
const allInputs = Object.freeze({
  ...core,
  houseCuspsDeg: Object.freeze(Array.from({length: 12}, (_, i) => i * 30 + 10)),
  midheavenLongitudeDeg: 300,
  descendantLongitudeDeg: 170,
  newMoonLongitudeDeg: 245,
});
const byId = (result, id) => {
  const entry = result.entries.find(row => row.id === id);
  assert.ok(entry, `Missing part ${id}`);
  return entry;
};

test('Regolo nine-lot arithmetic matches explicit synthetic daytime legacy expressions', () => {
  const result = calculateRegoloKleroi(core);
  assert.equal(result.method, 'REGOLO_LEGACY_NINE_LOTS_V1');
  assert.deepEqual(Object.fromEntries(Object.entries(result.kleroi)
    .map(([id, value]) => [id, value.longitudeDeg])), {
    TYCHE: 60, DAIMON: 280, ANANKE: 130, BASIS: 210,
    EROS: 200, HERMES: 30, TOLMA: 90, NIKE: 270, NEMESI: 190,
  });
  assert.ok(Object.isFrozen(result.kleroi));
});

test('the Regolo nighttime variant swaps Fortune/Spirit but preserves the seven dependent formulas', () => {
  const day = calculateRegoloKleroi(core);
  const night = calculateRegoloKleroi({ ...core, sect: 'NIGHT' });
  assert.equal(day.kleroi.TYCHE.longitudeDeg, night.kleroi.DAIMON.longitudeDeg);
  assert.equal(day.kleroi.DAIMON.longitudeDeg, night.kleroi.TYCHE.longitudeDeg);
  for (const id of ['ANANKE', 'BASIS', 'EROS', 'HERMES', 'TOLMA', 'NIKE', 'NEMESI']) {
    assert.equal(day.kleroi[id].longitudeDeg, night.kleroi[id].longitudeDeg, id);
  }
});

test('keeps exact 92 Regolo part identities and 12 grouped Abū Maʿshar sets', () => {
  const counts = new Map();
  for (const row of REGOLO_ARABIC_PARTS_CATALOG) counts.set(row.group, (counts.get(row.group) ?? 0) + 1);
  assert.equal(REGOLO_ARABIC_PARTS_CATALOG.length, 92);
  assert.equal(new Set(REGOLO_ARABIC_PARTS_CATALOG.map(x => x.id)).size, 92);
  assert.equal(counts.get('ESSENTIALS'), 15);
  assert.deepEqual(Array.from({length: 12}, (_, i) => counts.get(`ABU_MASHAR_${i + 1}`)),
    [3, 3, 3, 7, 5, 4, 15, 5, 7, 12, 10, 3]);
  assert.equal(REGOLO_ARABIC_PARTS_CATALOG[0].nameIt, 'Padre');
  assert.equal(REGOLO_ARABIC_PARTS_CATALOG.at(-1).nameIt, 'sciagura');
});

test('calculates all 92 entries with explicit angles, cusps, new Moon and traditional sign rulers', () => {
  const result = calculateRegoloArabicParts(allInputs);
  assert.equal(result.availableCount, 92);
  assert.equal(result.entries.length, 92);
  assert.equal(byId(result, 'REG_ESSENTIALS_01').longitudeDeg, 100); // ASC+Sun-Saturn
  assert.equal(byId(result, 'REG_ESSENTIALS_09').longitudeDeg, 260); // ASC+cusp 2 - ruler Venus
  assert.equal(byId(result, 'REG_ABU_MASHAR_4_07').longitudeDeg, 335); // New Moon-Saturn
  assert.equal(byId(result, 'REG_ABU_MASHAR_8_03').longitudeDeg, 290); // Ruler(new Moon)-Saturn
  assert.equal(byId(result, 'REG_ABU_MASHAR_7_11').longitudeDeg, 30); // ASC+DS-Venus
  assert.ok(Object.isFrozen(result.entries));
});

test('honors daytime/nighttime reversal in Regolo descriptions, without inferring sect', () => {
  const day = calculateRegoloArabicParts(allInputs);
  const night = calculateRegoloArabicParts({...allInputs, sect: 'NIGHT'});
  assert.equal(byId(day, 'REG_ABU_MASHAR_1_01').longitudeDeg, 50);
  assert.equal(byId(night, 'REG_ABU_MASHAR_1_01').longitudeDeg, 290);
  assert.equal(byId(day, 'REG_ABU_MASHAR_2_01').longitudeDeg,
    byId(night, 'REG_ABU_MASHAR_2_01').longitudeDeg);
});

test('explicitly flags Regolo navigation label mismatch (14 Cancer versus numeric 134)', () => {
  const day = byId(calculateRegoloArabicParts(allInputs), 'REG_ABU_MASHAR_9_02');
  const night = byId(calculateRegoloArabicParts({...allInputs, sect:'NIGHT'}), 'REG_ABU_MASHAR_9_02');
  assert.equal(day.longitudeDeg, 224); // Regolo executed ASC + 134 - Saturn
  assert.equal(night.longitudeDeg, 116); // Regolo executed ASC + Saturn - 134
  assert.equal(day.sourceFormula, 'ASC+14°CANCRO-SATURNO');
  assert.deepEqual(day.effectiveTerms, ['ASC', 'LEGACY_134', 'SATURN']);
  assert.ok(day.notes.includes('SOURCE_LABEL_14_CANCER_BUT_LEGACY_CODE_USES_134_DEGREES'));
});

test('missing optional new Moon, houses and axes give explicit unavailable rows, never invented values', () => {
  const result = calculateRegoloArabicParts(core);
  assert.equal(result.entries.length, 92);
  assert.ok(result.availableCount < 92);
  assert.equal(byId(result, 'REG_ESSENTIALS_01').status, 'AVAILABLE');
  for (const id of ['REG_ESSENTIALS_09', 'REG_ESSENTIALS_15',
    'REG_ABU_MASHAR_4_07', 'REG_ABU_MASHAR_8_03', 'REG_ABU_MASHAR_3_03']) {
    const row = byId(result, id);
    assert.equal(row.status, 'UNAVAILABLE_MISSING_INPUT');
    assert.equal(row.longitudeDeg, null);
    assert.ok(row.missing.length > 0);
  }
});

test('rejects unknown sect, unknown birth time, incomplete planets, bad axes and malformed cusp lists', () => {
  const invalid = (fn, code) => assert.throws(fn,
    error => error?.name === 'AstrologyError' && error.code === code);
  invalid(() => calculateRegoloKleroi({...core, sect: undefined}), 'INVALID_SECT');
  invalid(() => calculateRegoloKleroi({...core, birthTimeKnown: false}), 'BIRTH_TIME_REQUIRED');
  invalid(() => calculateRegoloKleroi({...core, planetsLongitudeDeg: {SUN:10}}), 'INVALID_PLANETS');
  invalid(() => calculateRegoloArabicParts({...allInputs, descendantLongitudeDeg: 100}), 'INCONSISTENT_AXES');
  invalid(() => calculateRegoloArabicParts({...allInputs, houseCuspsDeg: [10,20]}), 'INVALID_HOUSES');
  invalid(() => calculateRegoloArabicParts({...allInputs, newMoonLongitudeDeg: Infinity}), 'INVALID_ANGLE');
});

test('input mutation does not change snapshot; all result records remain immutable', () => {
  const mutable = {...allInputs, planetsLongitudeDeg: {...allInputs.planetsLongitudeDeg}};
  const result = calculateRegoloArabicParts(mutable);
  mutable.planetsLongitudeDeg.VENUS = 200;
  assert.equal(byId(result, 'REG_ESSENTIALS_07').longitudeDeg, 20);
  assert.throws(() => { result.entries[0].longitudeDeg = 123; }, TypeError);
  assert.throws(() => { result.entries[0].effectiveTerms.push('FAKE'); }, TypeError);
});

test('typed optional ESM package subpaths resolve the public functions without root exports', async () => {
  const [lots, parts] = await Promise.all([
    import('astrological-functions/regolo-kleroi'),
    import('astrological-functions/regolo-arabic-parts'),
  ]);
  assert.equal(lots.calculateRegoloKleroi, calculateRegoloKleroi);
  assert.equal(parts.calculateRegoloArabicParts, calculateRegoloArabicParts);
  assert.equal(parts.REGOLO_ARABIC_PARTS_CATALOG, REGOLO_ARABIC_PARTS_CATALOG);
});
