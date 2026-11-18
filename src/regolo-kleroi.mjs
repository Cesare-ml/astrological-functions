/**
 * Regolo-Alpha-Leonis legacy nine-lot formulas, reconstructed as pure arithmetic.
 * Source inventory: Cesare-ml/Regolo-Alpha-Leonis, @api/routes/api/func.js,
 * main 87636d88f22b85470ae3cb7a52d5280b9f43e018 (lines 354–418).
 * No Swiss dependency, astronomical sect inference, interpretation or chart I/O.
 * Other historical traditions may use different lot formulas.
 */
import { AstrologyError, normalize360, zodiacSignIndex } from './index.mjs';
import { calculateClassicalLots } from './classical-lots.mjs';

export const REGOLO_LOT_SOURCE = Object.freeze({
  repository: 'Cesare-ml/Regolo-Alpha-Leonis',
  commit: '87636d88f22b85470ae3cb7a52d5280b9f43e018',
  file: '@api/routes/api/func.js',
  method: 'REGOLO_LEGACY_NINE_LOTS_V1',
});

export const REGOLO_PLANET_IDS = Object.freeze([
  'SUN', 'MOON', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN',
]);

function fail(code, message) {
  throw new AstrologyError(code, message);
}

/** Shared validation for the nine lots and their dependent Arabic parts. */
export function readRegoloLotCore(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    fail('INVALID_ARGUMENT', 'A Regolo lot input object is required');
  }
  const { birthTimeKnown, sect, zodiac, chartContextId, ascendantLongitudeDeg, planetsLongitudeDeg } = input;
  if (birthTimeKnown !== true) fail('BIRTH_TIME_REQUIRED', 'Known birth time and Ascendant required');
  if (sect !== 'DAY' && sect !== 'NIGHT') fail('INVALID_SECT', 'Explicit DAY/NIGHT sect required');
  if (zodiac !== 'TROPICAL' && zodiac !== 'SIDEREAL') fail('INVALID_ZODIAC', 'Explicit zodiac required');
  if (typeof chartContextId !== 'string' || !chartContextId.trim()) {
    fail('INVALID_CHART_CONTEXT', 'A common chartContextId is required');
  }
  if (!planetsLongitudeDeg || typeof planetsLongitudeDeg !== 'object' ||
      Array.isArray(planetsLongitudeDeg) ||
      Object.keys(planetsLongitudeDeg).length !== REGOLO_PLANET_IDS.length ||
      !REGOLO_PLANET_IDS.every(id => Object.hasOwn(planetsLongitudeDeg, id))) {
    fail('INVALID_PLANETS', 'Seven explicitly named traditional planet longitudes required');
  }
  const asc = normalize360(ascendantLongitudeDeg);
  const planets = Object.freeze(Object.fromEntries(
    REGOLO_PLANET_IDS.map(id => [id, normalize360(planetsLongitudeDeg[id])]),
  ));
  return Object.freeze({ asc, planets, sect, zodiac, chartContextId });
}

/**
 * Caller supplies one zodiac/frame, actual chart Ascendant and verified sect.
 * Reproduces Regolo's mathematical daytime/nighttime variants, not a general
 * historical claim about the nine Lots or their astrological effects.
 */
export function calculateRegoloKleroi(input) {
  const { asc, planets: p, sect, zodiac, chartContextId } = readRegoloLotCore(input);
  const { lots } = calculateClassicalLots({
    ascendantLongitudeDeg: asc,
    sunLongitudeDeg: p.SUN,
    moonLongitudeDeg: p.MOON,
    birthTimeKnown: true,
    sect,
    zodiac,
    chartContextId,
  });
  const tyche = lots.fortune.longitudeDeg;
  const daimon = lots.spirit.longitudeDeg;
  const daytime = sect === 'DAY';
  const lot = (id, value) => {
    const longitudeDeg = normalize360(value);
    return Object.freeze({ id, longitudeDeg, zodiacSignIndex: zodiacSignIndex(longitudeDeg) });
  };
  const kleroi = Object.freeze({
    TYCHE: lot('TYCHE', tyche),
    DAIMON: lot('DAIMON', daimon),
    ANANKE: lot('ANANKE', asc + (daytime ? tyche - daimon : daimon - tyche)),
    BASIS: lot('BASIS', asc + (daytime ? daimon - tyche : tyche - daimon)),
    EROS: lot('EROS', asc + p.VENUS - (daytime ? daimon : tyche)),
    HERMES: lot('HERMES', asc + p.MERCURY - (daytime ? tyche : daimon)),
    TOLMA: lot('TOLMA', asc + p.MARS - (daytime ? tyche : daimon)),
    NIKE: lot('NIKE', asc + p.JUPITER - (daytime ? daimon : tyche)),
    NEMESI: lot('NEMESI', asc + p.SATURN - (daytime ? tyche : daimon)),
  });
  return Object.freeze({
    contract: 'RegoloKleroiResult',
    contractVersion: '0.1.0-experimental',
    method: REGOLO_LOT_SOURCE.method,
    sect,
    zodiac,
    chartContextId,
    kleroi,
    warnings: Object.freeze(['CALLER_ASSERTED_ASCENDANT_SECT_AND_SHARED_ZODIAC_NOT_VERIFIED']),
  });
}
