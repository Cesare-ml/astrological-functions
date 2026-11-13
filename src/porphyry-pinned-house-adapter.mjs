/**
 * Adapt the isolated PorphyryHouseCusps result to the pinned-source comparison
 * envelope. No astronomy, hidden correction policy, or ephemeris verification.
 */
import { AstrologyError, angularSeparation, locateLongitudeInHouses, normalize360 } from './index.mjs';

const fail = (code, message) => { throw new AstrologyError(code, message); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const identifier = value => typeof value === 'string' && value.length > 0 &&
  value.length <= 128 && value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value);
const RESULT_KEYS = new Set([
  'contract', 'contractVersion', 'houseSystem', 'datetimeUtc', 'angles',
  'cuspsDeg', 'quadrantSpansDeg', 'source', 'interpretation', 'validation',
]);
const PIN_KEYS = new Set([
  'datetimeUtc', 'frame', 'longitudeBasis', 'observerType', 'observer',
  'engineVersion', 'kernelSetId', 'timeModel', 'corrections', 'calculationProfileId',
]);
const PORPHYRY_SOURCE_KEYS = new Set([
  'engineVersion', 'kernelSetId', 'timeModel', 'frame', 'zodiac', 'observerType', 'observer',
]);
const OBSERVER_KEYS = new Set(['latitudeDeg', 'longitudeDegEast']);
const ANGLE_KEYS = new Set(['ascendantDeg', 'icDeg', 'descendantDeg', 'midheavenDeg']);
function keys(value, allowed) {
  return Object.keys(value).every(key => allowed.has(key));
}
function requireUtc(value) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))
    fail('INVALID_PORPHYRY_RESULT', 'A real UTC instant ending Z is required');
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) fail('INVALID_PORPHYRY_RESULT', 'Invalid Porphyry UTC instant');
  const canonical = new Date(ms).toISOString().replace(/\.000Z$/, 'Z');
  const normalized = value.replace(/\.(\d{1,3})Z$/, (_, part) =>
    `.${part.padEnd(3, '0')}Z`).replace(/\.000Z$/, 'Z');
  if (normalized !== canonical) fail('INVALID_PORPHYRY_RESULT', 'Invalid Porphyry calendar instant');
}
function observerCopy(observer) {
  if (!plain(observer) || !keys(observer, OBSERVER_KEYS) ||
      !finite(observer.latitudeDeg) || Math.abs(observer.latitudeDeg) >= 90 ||
      !finite(observer.longitudeDegEast) || Math.abs(observer.longitudeDegEast) > 180)
    fail('INVALID_SOURCE_CONTEXT', 'Explicit nonpolar topocentric observer is required');
  return Object.freeze({
    latitudeDeg: observer.latitudeDeg,
    longitudeDegEast: observer.longitudeDegEast,
  });
}
function pinnedSource(value, native, datetimeUtc) {
  if (!plain(value) || !keys(value, PIN_KEYS) ||
      value.datetimeUtc !== datetimeUtc ||
      value.frame !== 'ECLIPTIC_OF_DATE' ||
      value.observerType !== 'TOPOCENTRIC' ||
      value.corrections !== 'APPARENT' ||
      !plain(value.longitudeBasis) ||
      Object.keys(value.longitudeBasis).some(key => key !== 'type') ||
      value.longitudeBasis.type !== 'TROPICAL' ||
      !identifier(value.calculationProfileId) ||
      !identifier(value.engineVersion) || !identifier(value.kernelSetId) ||
      !identifier(value.timeModel))
    fail('INVALID_SOURCE_CONTEXT', 'Explicit pinned apparent tropical source required');
  const observer = observerCopy(value.observer);
  if (value.engineVersion !== native.engineVersion ||
      value.kernelSetId !== native.kernelSetId ||
      value.timeModel !== native.timeModel ||
      observer.latitudeDeg !== native.observer.latitudeDeg ||
      observer.longitudeDegEast !== native.observer.longitudeDegEast)
    fail('INCOMPATIBLE_SOURCE_CONTEXT', 'Pinned source disagrees with the Porphyry producer');
  return Object.freeze({
    datetimeUtc, frame: 'ECLIPTIC_OF_DATE',
    longitudeBasis: Object.freeze({type: 'TROPICAL'}),
    observerType: 'TOPOCENTRIC', observer,
    engineVersion: value.engineVersion,
    kernelSetId: value.kernelSetId,
    timeModel: value.timeModel,
    corrections: 'APPARENT',
    calculationProfileId: value.calculationProfileId,
  });
}
/**
 * Input: actual PorphyryHouseCusps shape, an explicitly declared pinnedSource,
 * and birthTimeKnown:true. Does not invent correction/profile metadata.
 *
 * The returned { snapshot, source } can be passed to the left/right slots of
 * compareHousePlacementsWithPinnedSource (stacked PR #48).
 */
export function adaptPorphyryForPinnedHouseComparison(input) {
  if (!plain(input) || !keys(input, new Set(['porphyry', 'source', 'birthTimeKnown'])))
    fail('INVALID_PORPHYRY_RESULT', 'Expected explicit Porphyry result and pinned source');
  if (input.birthTimeKnown !== true)
    fail('BIRTH_TIME_UNKNOWN', 'A known birth time is required for house comparisons');
  const p = input.porphyry;
  if (!plain(p) || !keys(p, RESULT_KEYS) ||
      p.contract !== 'PorphyryHouseCusps' ||
      p.contractVersion !== '0.1.0-experimental' ||
      p.houseSystem !== 'PORPHYRY' ||
      p.interpretation !== 'FACTS_ONLY' ||
      p.validation !== 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED')
    fail('INVALID_PORPHYRY_RESULT', 'Unsupported Porphyry producer contract or provenance');
  requireUtc(p.datetimeUtc);
  const native = p.source;
  if (!plain(native) || !keys(native, PORPHYRY_SOURCE_KEYS) ||
      native.frame !== 'ECLIPTIC_OF_DATE' || native.zodiac !== 'TROPICAL' ||
      native.observerType !== 'TOPOCENTRIC' ||
      !identifier(native.engineVersion) || !identifier(native.kernelSetId) ||
      !identifier(native.timeModel))
    fail('INVALID_PORPHYRY_RESULT', 'Invalid Porphyry source provenance');
  const nativeObserver = observerCopy(native.observer);
  if (!plain(p.angles) || !keys(p.angles, ANGLE_KEYS) ||
      Array.from(ANGLE_KEYS).some(key => !finite(p.angles[key])))
    fail('INVALID_PORPHYRY_RESULT', 'Four finite Porphyry axes required');
  if (!Array.isArray(p.cuspsDeg) || p.cuspsDeg.length !== 12 ||
      Array.from({length:12}, (_, i) => i).some(i => !Object.hasOwn(p.cuspsDeg, i) ||
        !finite(p.cuspsDeg[i])))
    fail('INVALID_CUSPS', 'Exactly twelve finite non-sparse cusp values required');
  const cuspsDeg = Object.freeze(p.cuspsDeg.map(normalize360));
  locateLongitudeInHouses(cuspsDeg[0], cuspsDeg);
  // Confirm only the four producer-declared angles, not astronomical accuracy.
  const anchors = [p.angles.ascendantDeg, p.angles.icDeg,
    p.angles.descendantDeg, p.angles.midheavenDeg];
  for (let i = 0; i < anchors.length; i++) {
    if (angularSeparation(cuspsDeg[i * 3], anchors[i]) > 1e-9)
      fail('INCOMPATIBLE_PORPHYRY_GEOMETRY', 'Cusp anchors disagree with declared Porphyry axes');
  }
  // The versioned Porphyry producer publishes its four quadrant spans.
  if (!Array.isArray(p.quadrantSpansDeg) || p.quadrantSpansDeg.length !== 4 ||
      Array.from({length:4}, (_, i) => i).some(i => !Object.hasOwn(p.quadrantSpansDeg, i) ||
        !finite(p.quadrantSpansDeg[i]) || p.quadrantSpansDeg[i] <= 0 ||
        p.quadrantSpansDeg[i] >= 180))
    fail('INVALID_PORPHYRY_RESULT', 'Four valid quadrant spans are required');
  const source = pinnedSource(input.source, {...native, observer:nativeObserver}, p.datetimeUtc);
  const snapshot = Object.freeze({
    houseSystem: 'PORPHYRY',
    datetimeUtc: p.datetimeUtc, frame: 'ECLIPTIC_OF_DATE',
    longitudeBasis: source.longitudeBasis,
    birthTimeKnown: true,
    cuspsDeg,
    provenanceStatus: 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED',
  });
  return Object.freeze({snapshot, source});
}
