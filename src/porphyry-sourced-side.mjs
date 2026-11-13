/**
 * Experimental adapter from the isolated Porphyry F3 producer (#40) to the
 * pinned-source house comparison input (#48). No ephemeris or house methods.
 */
import { AstrologyError, normalize360, locateLongitudeInHouses } from './index.mjs';

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const fail = (code, message) => { throw new AstrologyError(code, message); };
const SOURCE_KEYS = new Set(['datetimeUtc', 'frame', 'longitudeBasis', 'observerType',
  'observer', 'engineVersion', 'kernelSetId', 'timeModel', 'corrections', 'calculationProfileId']);
const SOURCE_IDENTIFIERS = ['engineVersion', 'kernelSetId', 'timeModel', 'calculationProfileId'];
const PRODUCER_KEYS = new Set(['contract', 'contractVersion', 'houseSystem', 'datetimeUtc',
  'angles', 'cuspsDeg', 'quadrantSpansDeg', 'source', 'interpretation', 'validation']);
const PRODUCER_SOURCE_KEYS = new Set(['engineVersion', 'kernelSetId', 'timeModel',
  'frame', 'zodiac', 'observerType', 'observer']);
const ANGLE_KEYS = new Set(['ascendantDeg', 'icDeg', 'descendantDeg', 'midheavenDeg']);

function validUtc(value) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    fail('INVALID_UTC', 'An explicit ISO UTC date with second precision is required');
  }
  const milliseconds = Date.parse(value);
  const canonical = Number.isFinite(milliseconds)
    ? new Date(milliseconds).toISOString().replace(/\.000Z$/, 'Z') : null;
  const input = value.replace(/\.(\d{1,3})Z$/, (_, fraction) =>
    `.${fraction.padEnd(3, '0')}Z`).replace(/\.000Z$/, 'Z');
  if (canonical !== input) fail('INVALID_UTC', 'Invalid UTC calendar date');
  return value;
}
function identifier(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 &&
    value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);
}
function observer(value) {
  if (!isRecord(value) || Object.keys(value).some(k => k !== 'latitudeDeg' && k !== 'longitudeDegEast') ||
      !finite(value.latitudeDeg) || !finite(value.longitudeDegEast) ||
      Math.abs(value.latitudeDeg) >= 90 || Math.abs(value.longitudeDegEast) > 180) {
    fail('INVALID_SOURCE_CONTEXT', 'A finite nonpolar topocentric observer is required');
  }
  return Object.freeze({ latitudeDeg: value.latitudeDeg, longitudeDegEast: value.longitudeDegEast });
}
function sourceSnapshot(value) {
  if (!isRecord(value) || Object.keys(value).some(k => !SOURCE_KEYS.has(k)) ||
      !SOURCE_IDENTIFIERS.every(k => identifier(value[k])) ||
      value.frame !== 'ECLIPTIC_OF_DATE' || value.observerType !== 'TOPOCENTRIC' ||
      value.corrections !== 'APPARENT' || !isRecord(value.longitudeBasis) ||
      value.longitudeBasis.type !== 'TROPICAL' ||
      Object.keys(value.longitudeBasis).some(k => k !== 'type')) {
    fail('INVALID_SOURCE_CONTEXT', 'Fully pinned apparent tropical comparison source required');
  }
  const datetimeUtc = validUtc(value.datetimeUtc);
  const position = observer(value.observer);
  return Object.freeze({
    datetimeUtc, frame: 'ECLIPTIC_OF_DATE',
    longitudeBasis: Object.freeze({type:'TROPICAL'}),
    observerType:'TOPOCENTRIC', observer: position,
    engineVersion:value.engineVersion, kernelSetId:value.kernelSetId,
    timeModel:value.timeModel, corrections:'APPARENT',
    calculationProfileId:value.calculationProfileId,
  });
}
function sameLongitude(a, b) {
  const distance = Math.abs(((normalize360(a) - normalize360(b) + 540) % 360) - 180);
  return distance <= 1e-7;
}

/**
 * Adapt a #40 PorphyryHouseCusps result into #48's SourcedHouseSnapshot.
 * Full comparison source metadata MUST be supplied independently by the caller.
 * Missing APPARENT corrections are never inferred from the Porphyry result.
 */
export function adaptPorphyryToPinnedComparison(input) {
  if (!isRecord(input) || Object.keys(input).some(k =>
      k !== 'birthTimeKnown' && k !== 'produced' && k !== 'declaredSource')) {
    fail('INVALID_PORPHYRY_ADAPTER', 'Expected only birthTimeKnown, produced, declaredSource');
  }
  if (input.birthTimeKnown !== true)
    fail('BIRTH_TIME_UNKNOWN', 'Cannot adapt house cusps without confirmed birth time');
  const result = input.produced;
  if (!isRecord(result) || Object.keys(result).some(k => !PRODUCER_KEYS.has(k)) ||
      result.interpretation !== 'FACTS_ONLY' || result.contract !== 'PorphyryHouseCusps' ||
      result.contractVersion !== '0.1.0-experimental' || result.houseSystem !== 'PORPHYRY' ||
      result.validation !== 'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED' ||
      !isRecord(result.source) || Object.keys(result.source).some(k => !PRODUCER_SOURCE_KEYS.has(k)) ||
      !isRecord(result.angles) || Object.keys(result.angles).some(k => !ANGLE_KEYS.has(k))) {
    fail('INVALID_PORPHYRY_PRODUCER', 'Explicit supported Porphyry result and status required');
  }
  const declared = sourceSnapshot(input.declaredSource);
  validUtc(result.datetimeUtc);
  const upstream = result.source;
  const inputObserver = observer(upstream.observer);
  if (result.datetimeUtc !== declared.datetimeUtc ||
      upstream.frame !== declared.frame || upstream.zodiac !== 'TROPICAL' ||
      upstream.observerType !== declared.observerType ||
      upstream.engineVersion !== declared.engineVersion ||
      upstream.kernelSetId !== declared.kernelSetId ||
      upstream.timeModel !== declared.timeModel ||
      inputObserver.latitudeDeg !== declared.observer.latitudeDeg ||
      inputObserver.longitudeDegEast !== declared.observer.longitudeDegEast) {
    fail('INCOMPATIBLE_SOURCE_CONTEXT', 'Porphyry producer and independent caller context disagree');
  }
  const angles = result.angles;
  if (!finite(angles.ascendantDeg) || !finite(angles.icDeg) ||
      !finite(angles.descendantDeg) || !finite(angles.midheavenDeg) ||
      [angles.ascendantDeg, angles.icDeg, angles.descendantDeg, angles.midheavenDeg]
        .some(deg => deg < 0 || deg >= 360) ||
      !sameLongitude(angles.icDeg, angles.midheavenDeg + 180) ||
      !sameLongitude(angles.descendantDeg, angles.ascendantDeg + 180)) {
    fail('INVALID_PORPHYRY_ANGLES', 'Producer anchors must be finite and opposite axes consistent');
  }
  if (!Array.isArray(result.cuspsDeg) || result.cuspsDeg.length !== 12 ||
      Array.from({length:12}, (_,i) => i).some(i =>
        !Object.hasOwn(result.cuspsDeg, i) || !finite(result.cuspsDeg[i]) ||
        result.cuspsDeg[i] < 0 || result.cuspsDeg[i] >= 360)) {
    fail('INVALID_CUSPS', 'Porphyry result requires twelve dense finite cusps');
  }
  if (!Array.isArray(result.quadrantSpansDeg) || result.quadrantSpansDeg.length !== 4 ||
      Array.from({length:4}, (_,i) => i).some(i =>
        !Object.hasOwn(result.quadrantSpansDeg, i) ||
        !finite(result.quadrantSpansDeg[i]) || result.quadrantSpansDeg[i] <= 0 ||
        result.quadrantSpansDeg[i] >= 180)) {
    fail('INVALID_PORPHYRY_ANGLES', 'Four finite nondegenerate quadrant spans are required');
  }
  const cuspsDeg = Object.freeze(result.cuspsDeg.map(normalize360));
  locateLongitudeInHouses(cuspsDeg[0], cuspsDeg);
  const anchors = [angles.ascendantDeg,angles.icDeg,angles.descendantDeg,angles.midheavenDeg];
  if (![0,3,6,9].every((i,k) => sameLongitude(cuspsDeg[i],anchors[k])) ||
      !anchors.every((start,i) =>
        Math.abs(normalize360(anchors[(i+1)%4] - start) - result.quadrantSpansDeg[i]) <= 1e-7)) {
    fail('INVALID_PORPHYRY_ANGLES', 'House 1/4/7/10 cusps must match ASC/IC/DSC/MC');
  }
  const snapshot = Object.freeze({
    houseSystem:'PORPHYRY', datetimeUtc:declared.datetimeUtc,
    frame:'ECLIPTIC_OF_DATE', longitudeBasis:declared.longitudeBasis,
    birthTimeKnown:true, cuspsDeg,
    provenanceStatus:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED',
  });
  return Object.freeze({snapshot, source:declared});
}
