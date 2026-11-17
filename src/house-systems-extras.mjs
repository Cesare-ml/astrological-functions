/**
 * Additional independently selected house conventions from the Astro.com
 * house-system catalogue. All calculations operate on supplied ecliptic
 * angles; they neither derive astronomy nor call Swiss Ephemeris.
 */
import { AstrologyError, normalize360, locateLongitudeInHouses } from './index.mjs';
import { calculateEqualHouseCusps } from './equal-house-cusps.mjs';
import { calculatePorphyryHouseCusps } from './porphyry-houses.mjs';

const EQUAL_MC_KEYS = new Set([
  'midheavenLongitudeDeg', 'birthTimeKnown', 'datetimeUtc', 'frame', 'longitudeBasis',
]);
const WHOLE_ARIES_KEYS = new Set(['datetimeUtc', 'frame', 'longitudeBasis']);
const SRIPATI_KEYS = new Set(['datetimeUtc', 'ascendantDeg', 'midheavenDeg', 'source']);

function assertInput(input, keys) {
  if (input === null || typeof input !== 'object' || Array.isArray(input) ||
      (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null) ||
      Object.keys(input).some(key => !keys.has(key))) {
    throw new AstrologyError('INVALID_HOUSE_INPUT', 'A plain request with only supported fields is required');
  }
}

/**
 * Astro.com "equal (midheaven)": house 10 begins at the supplied MC,
 * and house 1 begins 90 zodiac degrees after it. The Ascendant is NOT
 * automatically house 1 in this system.
 */
export function calculateEqualMidheavenHouseCusps(input) {
  assertInput(input, EQUAL_MC_KEYS);
  const { midheavenLongitudeDeg, birthTimeKnown, datetimeUtc, frame, longitudeBasis } = input;
  if (birthTimeKnown === false) {
    throw new AstrologyError('BIRTH_TIME_UNKNOWN', 'Equal-MC houses require a known birth time');
  }
  if (birthTimeKnown !== true) {
    throw new AstrologyError('INVALID_HOUSE_INPUT', 'birthTimeKnown must be explicitly true');
  }
  const mc = normalize360(midheavenLongitudeDeg);
  // Reuse the existing validated 30-degree geometry and zodiac/time contract,
  // then publish the real MC anchor rather than mislabelling it as ASC.
  const equal = calculateEqualHouseCusps({
    ascendantLongitudeDeg: normalize360(mc + 90), datetimeUtc, frame, longitudeBasis,
  });
  return Object.freeze({
    contract: 'EqualMidheavenHouseCusps', contractVersion: '0.1.0-experimental',
    houseSystem: 'EQUAL_MIDHEAVEN', datetimeUtc: equal.datetimeUtc,
    frame: equal.frame, longitudeBasis: equal.longitudeBasis, birthTimeKnown: true,
    midheavenLongitudeDeg: mc, cuspsDeg: equal.cuspsDeg,
    provenanceStatus: equal.provenanceStatus, interpretation: 'FACTS_ONLY',
  });
}

/**
 * Astro.com "whole (1=Aries)": the first house starts at the start of Aries
 * in the DECLARED zodiac, regardless of Ascendant or availability of birth
 * time. This is different from whole-sign houses starting at the rising sign.
 */
export function calculateWholeAriesHouseCusps(input) {
  assertInput(input, WHOLE_ARIES_KEYS);
  const { datetimeUtc, frame, longitudeBasis } = input;
  const equal = calculateEqualHouseCusps({
    ascendantLongitudeDeg: 0, datetimeUtc, frame, longitudeBasis,
  });
  return Object.freeze({
    contract: 'WholeAriesHouseCusps', contractVersion: '0.1.0-experimental',
    houseSystem: 'WHOLE_ARIES', datetimeUtc: equal.datetimeUtc,
    frame: equal.frame, longitudeBasis: equal.longitudeBasis,
    cuspsDeg: equal.cuspsDeg, provenanceStatus: equal.provenanceStatus,
    interpretation: 'FACTS_ONLY',
  });
}

/**
 * Astro.com Sripati: first construct Porphyry cusps and then shift each cusp
 * to the forward ecliptic midpoint between its predecessor and itself.
 * This uses the exact same pinned angles, UTC and provider metadata as the
 * validated Porphyry source, with no new astronomical assumptions.
 */
export function calculateSripatiHouseCusps(input) {
  assertInput(input, SRIPATI_KEYS);
  const porphyry = calculatePorphyryHouseCusps(input);
  const prior = porphyry.cuspsDeg;
  const cuspsDeg = Object.freeze(prior.map((end, index) => {
    const start = prior[(index + 11) % 12];
    return normalize360(start + normalize360(end - start) / 2);
  }));
  // Prove that the translated cusps still define a single forward revolution.
  locateLongitudeInHouses(cuspsDeg[0], cuspsDeg);
  return Object.freeze({
    contract: 'SripatiHouseCusps', contractVersion: '0.1.0-experimental',
    houseSystem: 'SRIPATI', datetimeUtc: porphyry.datetimeUtc,
    angles: porphyry.angles, source: porphyry.source,
    porphyryCuspsDeg: porphyry.cuspsDeg, cuspsDeg,
    interpretation: 'FACTS_ONLY',
    validation: 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED',
  });
}
