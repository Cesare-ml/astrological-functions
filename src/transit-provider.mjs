/**
 * Experimental, fail-closed consumer gate for a future Rust/WASM apparent
 * geocentric ecliptic-of-date position provider. No astronomical calculation.
 */
import { AstrologyError, normalize360 } from './index.mjs';

const CONTRACT_VERSION = '0.1.0-experimental';
const FRAME = Object.freeze({ center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT' });
const PROVENANCE_KEYS = Object.freeze(['engineVersion', 'kernelSetId', 'timeModel']);

function fail(code, message) { throw new AstrologyError(code, message); }
function record(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function nonempty(v) { return typeof v === 'string' && v.length > 0 && v.trim() === v; }
function validUtc(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v) &&
    Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 19) === v.slice(0, 19);
}
function zodiac(v) {
  if (!record(v)) fail('INVALID_ZODIAC', 'An explicit zodiac contract is required');
  if (v.type === 'TROPICAL' && !Object.hasOwn(v, 'ayanamsaId')) return Object.freeze({ type: 'TROPICAL' });
  if (v.type === 'SIDEREAL' && nonempty(v.ayanamsaId))
    return Object.freeze({ type: 'SIDEREAL', ayanamsaId: v.ayanamsaId });
  fail('INVALID_ZODIAC', 'Use TROPICAL without ayanamsa or SIDEREAL with a versioned ayanamsaId');
}
function provenance(v, code = 'INCOMPATIBLE_EPHEMERIS') {
  if (!record(v) || Object.entries(FRAME).some(([k, value]) => v[k] !== value) ||
      PROVENANCE_KEYS.some(k => !nonempty(v[k])))
    fail(code, 'Explicit apparent Earth-centered ecliptic-of-date engine/kernel/time provenance required');
  return Object.freeze({ ...FRAME,
    engineVersion: v.engineVersion, kernelSetId: v.kernelSetId, timeModel: v.timeModel });
}
function sameProvenance(a, b) {
  return [...Object.keys(FRAME), ...PROVENANCE_KEYS].every(k => a[k] === b[k]);
}
function bodyIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 32)
    fail('INVALID_BODIES', 'Select 1..32 unique named sky bodies explicitly');
  const output = Array.from(ids, (name) => {
    if (!nonempty(name)) fail('INVALID_BODIES', 'Body names must be nonempty trimmed strings');
    return name;
  });
  if (new Set(output).size !== output.length) fail('INVALID_BODIES', 'Duplicate sky body names are not supported');
  return Object.freeze(output);
}

/**
 * Returns an immutable sky snapshot for calculateTransitFacts({sky, natal, ...}).
 * Provider-supplied metadata are assertions; astronomical correctness is NOT
 * independently verified here. All requests complete before any result exists.
 */
export async function getTransitSkySnapshotWithProvider(input) {
  if (!record(input)) fail('INVALID_ARGUMENT', 'Explicit transit provider input is required');
  if (!validUtc(input.datetimeUtc)) fail('INVALID_UTC', 'A valid explicit UTC sky instant ending Z is required');
  const datetimeUtc = input.datetimeUtc;
  const selectedZodiac = zodiac(input.zodiac);
  const ids = bodyIds(input.bodyNames);
  const expected = provenance(input.expectedEphemeris);
  const provider = input.provider;
  if (!record(provider) || typeof provider.getGeocentricEcliptic !== 'function')
    fail('MISSING_PROVIDER', 'An explicitly injected position provider is required');
  const capabilities = provider.capabilities;
  if (!record(capabilities) || capabilities.contract !== 'TransitPositionProviderCapabilities' ||
      capabilities.contractVersion !== CONTRACT_VERSION)
    fail('UNSUPPORTED_PROVIDER', 'Provider must declare TransitPositionProviderCapabilities 0.1.0-experimental');
  const claimed = provenance(capabilities, 'UNSUPPORTED_PROVIDER');
  if (!sameProvenance(expected, claimed))
    fail('INCONSISTENT_EPHEMERIS', 'Provider capabilities differ from the caller-pinned ephemeris');

  const requests = Object.freeze(ids.map(bodyName => Object.freeze({
    datetimeUtc, bodyName, ...FRAME, kernelSetId: expected.kernelSetId, timeModel: expected.timeModel
  })));
  const points = [];
  for (const request of requests) {
    let response;
    try {
      response = await provider.getGeocentricEcliptic(request);
    } catch {
      fail('PROVIDER_FAILURE', 'Ephemeris position provider failed; no partial sky snapshot returned');
    }
    if (!record(response) || response.datetimeUtc !== request.datetimeUtc ||
        response.bodyName !== request.bodyName ||
        !record(response.metadata))
      fail('INVALID_EPHEMERIS_RESULT', 'Provider must echo the exact requested body/time and supply metadata');
    const actual = provenance(response.metadata, 'INCOMPATIBLE_EPHEMERIS');
    if (!sameProvenance(expected, actual))
      fail('INCONSISTENT_EPHEMERIS', 'Mixed engine/kernel/time models across provider positions');
    if (typeof response.longitudeDeg !== 'number' || !Number.isFinite(response.longitudeDeg) ||
        typeof response.latitudeDeg !== 'number' || !Number.isFinite(response.latitudeDeg) ||
        response.latitudeDeg < -90 || response.latitudeDeg > 90 ||
        (response.longitudeSpeedDegPerDay != null &&
          (typeof response.longitudeSpeedDegPerDay !== 'number' || !Number.isFinite(response.longitudeSpeedDegPerDay))))
      fail('INVALID_EPHEMERIS_RESULT', 'Position, latitude and optional longitude speed must be valid finite numbers');
    points.push(Object.freeze({
      name: request.bodyName, type: 'body',
      longitudeDeg: normalize360(response.longitudeDeg),
      longitudeSpeedDegPerDay: response.longitudeSpeedDegPerDay ?? null
    }));
  }
  const sky = Object.freeze({
    datetimeUtc, zodiac: selectedZodiac, ephemeris: expected, points: Object.freeze(points)
  });
  return Object.freeze({
    contract: 'TransitSkyProviderResult', contractVersion: CONTRACT_VERSION,
    status: 'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    sky, requests,
    warnings: Object.freeze([Object.freeze({ code: 'EPHEMERIS_ACCURACY_NOT_VERIFIED',
      message: 'Provider metadata are asserted, not scientific validation of real NASA/JPL ephemerides' })])
  });
}
