/**
 * Pure, explicit calculation of the 92 historical Regolo Arabic-part entries.
 * Extracts mathematical formulas only; never calls the legacy Swiss-backed API.
 * Formula labels/attributions are a legacy inventory, not historical proof.
 */
import { AstrologyError, normalize360, zodiacSignIndex } from './index.mjs';
import { calculateRegoloKleroi, readRegoloLotCore, REGOLO_LOT_SOURCE } from './regolo-kleroi.mjs';
import { REGOLO_ARABIC_PARTS_CATALOG } from './regolo-arabic-parts-catalog.mjs';

export const REGOLO_ARABIC_PARTS_SOURCE = Object.freeze({
  repository: REGOLO_LOT_SOURCE.repository,
  commit: REGOLO_LOT_SOURCE.commit,
  file: '@api/routes/api/parti-arabe.js',
  method: 'REGOLO_LEGACY_ARABIC_PARTS_V1',
});

const TRADITIONAL_RULERS = Object.freeze([
  'MARS', 'VENUS', 'MERCURY', 'MOON', 'SUN', 'MERCURY',
  'VENUS', 'MARS', 'JUPITER', 'SATURN', 'SATURN', 'JUPITER',
]);

const LEGACY_TOKENS = Object.freeze({
  ASC: 'ASC', MC: 'MC', DS: 'DS',
  SOLE: 'SUN', LUNA: 'MOON', MERCURIO: 'MERCURY',
  VENERE: 'VENUS', MARTE: 'MARS', GIOVE: 'JUPITER', SATURNO: 'SATURN',
  TYCHE: 'TYCHE', DAIMON: 'DAIMON',
  CUSP2A: 'CUSP2', CUSP8A: 'CUSP8', CUSP9A: 'CUSP9', CUSP12A: 'CUSP12',
  GOV2A: 'RULER_CUSP2', GOV9A: 'RULER_CUSP9', GOV12A: 'RULER_CUSP12',
  'GOV.ASC': 'RULER_ASC', 'GOV.SOLE': 'RULER_SUN',
  'GOV.LUNA': 'RULER_MOON', 'GOV.LUNA.NUOVA': 'RULER_NEW_MOON',
  'LUNA NUOVA': 'NEW_MOON',
  '19°ARIETE': 'FIXED_19', '3°TORO': 'FIXED_33',
  // The Regolo caption says "14° Cancer" (= 104°), but its *executed*
  // expression uses 134°. Preserve that behavior in this explicit legacy
  // profile and expose the discrepancy; do not silently fix either version.
  '14°CANCRO': 'LEGACY_134',
});

function fail(code, message) { throw new AstrologyError(code, message); }

function optionalLongitude(input, field) {
  return Object.hasOwn(input, field) ? normalize360(input[field]) : undefined;
}

function optionalHouses(input) {
  if (!Object.hasOwn(input, 'houseCuspsDeg')) return undefined;
  const cusps = input.houseCuspsDeg;
  if (!Array.isArray(cusps) || cusps.length !== 12 ||
      Object.keys(cusps).length !== 12 ||
      !Array.from({length: 12}, (_, i) => Object.hasOwn(cusps, i)).every(Boolean)) {
    fail('INVALID_HOUSES', 'Exactly twelve explicit, dense house cusps are required');
  }
  return Object.freeze(cusps.map(value => normalize360(value)));
}

function parseFormula(formula) {
  const pieces = formula.toUpperCase().split(/\s*([+-])\s*/);
  if (pieces.length !== 5 || pieces[1] !== '+' || pieces[3] !== '-') {
    fail('INVALID_LEGACY_FORMULA', 'Regolo formula must be A+B-C');
  }
  const terms = [pieces[0], pieces[2], pieces[4]].map(token => LEGACY_TOKENS[token]);
  if (terms.some(term => !term)) {
    fail('INVALID_LEGACY_FORMULA', 'Unrecognized static legacy formula component');
  }
  return terms;
}

/**
 * Existing Regolo definitions include duplicated names and 134°/Cancer
 * mismatches. Return 92 separate ID-stable results in the original order,
 * never deduplicating or substituting missing astronomical inputs.
 */
export function calculateRegoloArabicParts(input) {
  const { asc, planets, sect, zodiac, chartContextId } = readRegoloLotCore(input);
  const lots = calculateRegoloKleroi(input).kleroi;
  const houses = optionalHouses(input);
  const midheaven = optionalLongitude(input, 'midheavenLongitudeDeg');
  const descendant = optionalLongitude(input, 'descendantLongitudeDeg');
  const newMoon = optionalLongitude(input, 'newMoonLongitudeDeg');
  if (descendant !== undefined && Math.abs(normalize360(descendant - asc) - 180) > 1e-8) {
    fail('INCONSISTENT_AXES', 'Caller-supplied Descendant must oppose Ascendant');
  }

  const ruler = longitude => planets[TRADITIONAL_RULERS[zodiacSignIndex(longitude)]];
  const resolve = term => {
    if (term === 'ASC') return asc;
    if (term === 'MC') return midheaven;
    if (term === 'DS') return descendant;
    if (term === 'TYCHE' || term === 'DAIMON') return lots[term].longitudeDeg;
    if (term === 'NEW_MOON') return newMoon;
    if (term === 'RULER_ASC') return ruler(asc);
    if (term === 'RULER_SUN') return ruler(planets.SUN);
    if (term === 'RULER_MOON') return ruler(planets.MOON);
    if (term === 'RULER_NEW_MOON') return newMoon === undefined ? undefined : ruler(newMoon);
    if (term === 'FIXED_19') return 19;
    if (term === 'FIXED_33') return 33;
    if (term === 'LEGACY_134') return 134;
    const match = /^CUSP(2|8|9|12)$/.exec(term);
    if (match) return houses?.[Number(match[1]) - 1];
    const rulerMatch = /^RULER_CUSP(2|9|12)$/.exec(term);
    if (rulerMatch) {
      const cusp = houses?.[Number(rulerMatch[1]) - 1];
      return cusp === undefined ? undefined : ruler(cusp);
    }
    if (Object.hasOwn(planets, term)) return planets[term];
    fail('INVALID_LEGACY_FORMULA', 'Unknown Regolo formula term');
  };

  const entries = REGOLO_ARABIC_PARTS_CATALOG.map(definition => {
    const label = sect === 'DAY' ? definition.formulaDay : definition.formulaNight;
    const [base, plus, minus] = parseFormula(label);
    const values = [base, plus, minus].map(resolve);
    const missing = Object.freeze([base, plus, minus]
      .filter((term, index) => values[index] === undefined));
    const common = {
      id: definition.id,
      group: definition.group,
      nameIt: definition.nameIt,
      sourceLine: definition.sourceLine,
      sourceFormula: label,
      effectiveTerms: Object.freeze([base, plus, minus]),
      notes: definition.notes,
    };
    if (missing.length > 0) return Object.freeze({
      ...common, status: 'UNAVAILABLE_MISSING_INPUT', longitudeDeg: null,
      zodiacSignIndex: null, missing,
    });
    const longitudeDeg = normalize360(values[0] + values[1] - values[2]);
    return Object.freeze({
      ...common, status: 'AVAILABLE', longitudeDeg,
      zodiacSignIndex: zodiacSignIndex(longitudeDeg), missing,
    });
  });
  return Object.freeze({
    contract: 'RegoloArabicPartsResult',
    contractVersion: '0.1.0-experimental',
    method: REGOLO_ARABIC_PARTS_SOURCE.method,
    source: REGOLO_ARABIC_PARTS_SOURCE,
    sect, zodiac, chartContextId,
    entries: Object.freeze(entries),
    availableCount: entries.filter(entry => entry.status === 'AVAILABLE').length,
    warnings: Object.freeze([
      'CALLER_ASSERTED_CHART_FRAME_SECT_AND_SUN_EVENTS_NOT_VERIFIED',
      'REGOLO_NAVIGATION_FORMULA_CAPTION_14_CANCER_BUT_EXECUTED_AS_134_DEGREES',
      'LEGACY_LABELS_AND_ATTRIBUTION_NOT_INDEPENDENTLY_HISTORICALLY_VERIFIED',
    ]),
  });
}

export { REGOLO_ARABIC_PARTS_CATALOG } from './regolo-arabic-parts-catalog.mjs';
