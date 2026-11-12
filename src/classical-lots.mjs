/**
 * Sect-reversing Lots of Fortune and Spirit from caller-supplied chart angles.
 * Symbolic coordinate arithmetic only: no astronomy, horizon calculation,
 * automatic sect inference or interpretation is performed here.
 */
import { AstrologyError, normalize360, zodiacSignIndex } from './index.mjs';

const METHOD = 'SECT_REVERSAL_V1';

/**
 * Input angles must belong to the same explicitly declared chart/zodiac.
 * The caller is responsible for establishing a trustworthy Ascendant and sect.
 */
export function calculateClassicalLots(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AstrologyError('INVALID_ARGUMENT', 'An explicit classical lots input object is required');
  }
  const {
    ascendantLongitudeDeg, sunLongitudeDeg, moonLongitudeDeg,
    birthTimeKnown, sect, zodiac, chartContextId,
  } = input;
  if (birthTimeKnown !== true) {
    throw new AstrologyError('BIRTH_TIME_REQUIRED', 'An established birth time and Ascendant are required');
  }
  if (sect !== 'DAY' && sect !== 'NIGHT') {
    throw new AstrologyError('INVALID_SECT', 'Explicit DAY or NIGHT sect is required; it is not inferred');
  }
  if (zodiac !== 'TROPICAL' && zodiac !== 'SIDEREAL') {
    throw new AstrologyError('INVALID_ZODIAC', 'Explicit TROPICAL or SIDEREAL zodiac is required');
  }
  if (typeof chartContextId !== 'string' || !chartContextId.trim()) {
    throw new AstrologyError('INVALID_CHART_CONTEXT', 'A nonempty shared chartContextId is required');
  }

  const asc = normalize360(ascendantLongitudeDeg);
  const sun = normalize360(sunLongitudeDeg);
  const moon = normalize360(moonLongitudeDeg);
  const fortuneDeg = normalize360(asc + (sect === 'DAY' ? moon - sun : sun - moon));
  const spiritDeg = normalize360(asc + (sect === 'DAY' ? sun - moon : moon - sun));
  const lot = (id, longitudeDeg) => Object.freeze({
    id, longitudeDeg, zodiacSignIndex: zodiacSignIndex(longitudeDeg),
  });

  return Object.freeze({
    contract: 'ClassicalLotsResult',
    contractVersion: '0.1.0-experimental',
    method: METHOD,
    sect,
    zodiac,
    chartContextId,
    lots: Object.freeze({
      fortune: lot('FORTUNE', fortuneDeg),
      spirit: lot('SPIRIT', spiritDeg),
    }),
    warnings: Object.freeze(['CALLER_ASSERTED_SHARED_CHART_AND_SECT_NOT_VERIFIED']),
  });
}
