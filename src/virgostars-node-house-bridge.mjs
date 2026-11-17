/**
 * Structural bridge for VirgoStars-Ephemeris bindings/node/index.js
 * createHouseAngleProvider(), which currently returns angle geometry but does
 * not report its compiled binary identity. This bridge keeps that fact honest:
 * every version/digest and kernel label is CALLER-ASSERTED, not Rust-verified.
 * No native module import, kernel I/O, source code or fallback lives here.
 */
import { AstrologyError } from './index.mjs';

const fail = (code, message) => { throw new AstrologyError(code, message); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const hex = (value, count) => typeof value === 'string' &&
  new RegExp(`^[a-fA-F0-9]{${count}}$`).test(value);
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 128 &&
  value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);
const MODEL = 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME';
const BINDING_KEYS = new Set(['upstreamCommitSha', 'nativeAddonSha256', 'kernelSetId']);

function checkBinding(nativeProvider, binding) {
  if (!nativeProvider || typeof nativeProvider.calculateHouseAngles !== 'function') {
    fail('INVALID_NODE_HOUSE_BINDING', 'Pass the native createHouseAngleProvider() result explicitly');
  }
  if (!plain(binding) || Object.keys(binding).some(key => !BINDING_KEYS.has(key)) ||
      !hex(binding.upstreamCommitSha, 40) || !hex(binding.nativeAddonSha256, 64) ||
      !identifier(binding.kernelSetId)) {
    fail('INVALID_NODE_HOUSE_BINDING',
      'Supply caller-reviewed upstream commit SHA, native addon SHA-256 and kernel-context identifier');
  }
  return Object.freeze({
    repository: 'Cesare-ml/VirgoStars-Ephemeris',
    upstreamCommitSha: binding.upstreamCommitSha.toLowerCase(),
    nativeAddonSha256: binding.nativeAddonSha256.toLowerCase(),
    kernelSetId: binding.kernelSetId,
    kernelRole: 'CALLER_CONTEXT_ONLY_HOUSE_ANGLES_DO_NOT_READ_DE441',
    provenanceStatus: 'CALLER_ASSERTED_BINARY_IDENTITY_NOT_INDEPENDENTLY_VERIFIED',
  });
}

function copyAngles(raw, requested, expectedProvider) {
  if (!plain(raw) || raw.model !== MODEL ||
      !['ut1JulianDay', 'ttJulianDay', 'latitudeDeg', 'longitudeDegEast'].every(key =>
        raw[key] === requested[key]) ||
      !['armcDeg', 'trueObliquityDeg', 'ascendantDeg', 'midheavenDeg'].every(key =>
        Number.isFinite(raw[key])) ||
      !(raw.trueObliquityDeg > 0 && raw.trueObliquityDeg < 90)) {
    fail('INCOMPATIBLE_ANGLE_SOURCE',
      'The native binding must return a matching explicit UT1/TT observer and true-of-date house model');
  }
  return Object.freeze({
    model: MODEL,
    ...expectedProvider,
    ut1JulianDay: raw.ut1JulianDay,
    ttJulianDay: raw.ttJulianDay,
    latitudeDeg: raw.latitudeDeg,
    longitudeDegEast: raw.longitudeDegEast,
    armcDeg: raw.armcDeg,
    trueObliquityDeg: raw.trueObliquityDeg,
    ascendantDeg: raw.ascendantDeg,
    midheavenDeg: raw.midheavenDeg,
  });
}

/**
 * The host MUST separately hash/verify the exact installed native addon and
 * confirm its provenance before passing these assertions. The house-angle
 * algorithm itself does not need DE441; kernelSetId is only the configured
 * context tag for matching a separate solar provider (e.g. Sunshine).
 */
export function bindVirgoStarsNodeHouseAngles(nativeProvider, binding) {
  const attestation = checkBinding(nativeProvider, binding);
  const expectedProvider = Object.freeze({
    engineVersion: `VIRGOSTARS_RUST_NODE@${attestation.upstreamCommitSha}`,
    kernelSetId: attestation.kernelSetId,
    timeModel: 'EXPLICIT_UT1_TT',
  });
  return Object.freeze({
    expectedProvider,
    attestation,
    calculateHouseAngles(request) {
      if (!plain(request) || !['ut1JulianDay', 'ttJulianDay',
        'latitudeDeg', 'longitudeDegEast'].every(key => Number.isFinite(request[key]))) {
        fail('INVALID_NODE_HOUSE_BINDING_REQUEST', 'Explicit finite UT1, TT and observer coordinates required');
      }
      const args = Object.freeze({ut1JulianDay: request.ut1JulianDay,
        ttJulianDay: request.ttJulianDay, latitudeDeg: request.latitudeDeg,
        longitudeDegEast: request.longitudeDegEast});
      const result = nativeProvider.calculateHouseAngles(args);
      return result && typeof result.then === 'function'
        ? result.then(raw => copyAngles(raw, args, expectedProvider))
        : copyAngles(result, args, expectedProvider);
    },
  });
}
