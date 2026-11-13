/**
 * Instantaneous, oriented aspect trend from caller-supplied zodiac longitude
 * and longitude-speed facts. No astronomical positions or rates are computed.
 */
export class AspectTrendError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AspectTrendError';
    this.code = code;
  }
}

const finite = v => typeof v === 'number' && Number.isFinite(v);
// Avoid a second modulo/addition for positive angles: (360 - one ULP)
// must not round to 0. For tiny negative angles 360 + delta may round
// to 360 in binary64; report the canonical 0 rather than an invalid 360.
const normalized = deg => {
  const remainder = deg % 360;
  if (remainder >= 0) return remainder;
  const wrapped = remainder + 360;
  return wrapped === 360 ? 0 : wrapped;
};
// Compare against the nearest unwrapped copy of the exact angle.
// Subtracting (-120) from (240 + one ULP), then reducing modulo 360,
// first rounds that tiny residual away at 360; moving the exact angle
// by an integer turn BEFORE subtraction preserves the local difference.
const signedDifference = (from, to) => {
  const turns = Math.round((to - from) / 360);
  const nearestExact = from + turns * 360;
  const residual = to - nearestExact;
  return residual >= 180 ? residual - 360
    : residual < -180 ? residual + 360 : residual;
};
const plainRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const error = (code, message) => { throw new AspectTrendError(code, message); };

function validatePoint(point, name) {
  if (!plainRecord(point) || !finite(point.longitudeDeg) ||
      !Object.hasOwn(point, 'longitudeSpeedDegPerDay') ||
      !(point.longitudeSpeedDegPerDay === null || finite(point.longitudeSpeedDegPerDay))) {
    error('INVALID_POINT', `${name} requires finite longitudeDeg and explicit finite speed or null`);
  }
  return {longitudeDeg: normalized(point.longitudeDeg),
    remainderDeg: point.longitudeDeg % 360,
    longitudeSpeedDegPerDay: point.longitudeSpeedDegPerDay};
}

/**
 * @param {object} input Both longitudes must share the same caller-asserted zodiac frame.
 * Forward: target-source = angle; reverse: target-source = 360-angle.
 */
export function classifyOrientedAspectTrend(input) {
  if (!plainRecord(input)) error('INVALID_INPUT', 'An explicit aspect trend input is required');
  const { source, target, aspectAngleDeg, branch, maxOrbDeg,
    exactToleranceDeg, stationaryRelativeSpeedDegPerDay, motionFrame } = input;
  const a = validatePoint(source, 'source');
  const b = validatePoint(target, 'target');
  if (!finite(aspectAngleDeg) || aspectAngleDeg < 0 || aspectAngleDeg > 180 ||
      (branch !== 'FORWARD' && branch !== 'REVERSE')) {
    error('INVALID_ASPECT', 'Angle must be 0..180 and branch must be FORWARD or REVERSE');
  }
  // For 0° and 180° both named branches coincide. For other angles,
  // two exact branches are 2*min(angle, 180-angle) apart; keep orbs disjoint.
  const branchLimitDeg = aspectAngleDeg === 0 || aspectAngleDeg === 180
    ? 90 : Math.min(aspectAngleDeg, 180 - aspectAngleDeg);
  if (!finite(maxOrbDeg) || maxOrbDeg < 0 || maxOrbDeg >= branchLimitDeg ||
      !finite(exactToleranceDeg) || exactToleranceDeg < 0 || exactToleranceDeg > maxOrbDeg) {
    error('INVALID_ORB_POLICY', 'Require 0<=exactTolerance<=maxOrb<nearest-branch gap; maxOrb<90 for conjunction/opposition');
  }
  if (!finite(stationaryRelativeSpeedDegPerDay) || stationaryRelativeSpeedDegPerDay < 0) {
    error('INVALID_SPEED_POLICY', 'Explicit finite nonnegative relative-speed threshold required');
  }
  if (motionFrame !== 'COEVOLVING' && motionFrame !== 'TARGET_FIXED') {
    error('INVALID_MOTION_FRAME', 'Explicit COEVOLVING or TARGET_FIXED motion frame required');
  }
  if (motionFrame === 'TARGET_FIXED' && b.longitudeSpeedDegPerDay !== 0 && b.longitudeSpeedDegPerDay !== null) {
    error('INVALID_FIXED_TARGET', 'A fixed target must have explicitly zero or unavailable speed');
  }

  const exactForwardDeg = normalized(branch === 'FORWARD' ? aspectAngleDeg : -aspectAngleDeg);
  // Preserve the signed small-angle difference *before* it is normalized
  // for display: binary64 cannot represent every value just below 360.
  const observedRawDeg = b.remainderDeg - a.remainderDeg;
  const observedForwardDeg = normalized(observedRawDeg);
  const signedResidualDeg = signedDifference(
    branch === 'FORWARD' ? aspectAngleDeg : -aspectAngleDeg, observedRawDeg
  );
  const absoluteResidualDeg = Math.abs(signedResidualDeg);
  const relativeSpeedDegPerDay = a.longitudeSpeedDegPerDay === null || b.longitudeSpeedDegPerDay === null
    ? null : b.longitudeSpeedDegPerDay - a.longitudeSpeedDegPerDay;

  if (relativeSpeedDegPerDay !== null && !Number.isFinite(relativeSpeedDegPerDay)) {
    error('INVALID_RELATIVE_SPEED', 'Relative longitude speed overflowed its finite numeric range');
  }

  const withinOrb = absoluteResidualDeg <= maxOrbDeg;
  let trend;
  if (!withinOrb) trend = 'OUTSIDE_ORB';
  else if (absoluteResidualDeg <= exactToleranceDeg) trend = 'EXACT';
  else if (relativeSpeedDegPerDay === null) trend = 'UNAVAILABLE';
  else if (Math.abs(relativeSpeedDegPerDay) <= stationaryRelativeSpeedDegPerDay) trend = 'RELATIVE_STATIONARY';
  else trend = signedResidualDeg * relativeSpeedDegPerDay < 0 ? 'APPLYING' : 'SEPARATING';

  return Object.freeze({
    contract: 'OrientedAspectTrendFact',
    contractVersion: '0.1.0-experimental',
    trend,
    motionFrame,
    branch,
    aspectAngleDeg,
    exactForwardDeg,
    observedForwardDeg,
    signedResidualDeg,
    absoluteResidualDeg,
    relativeSpeedDegPerDay,
    maxOrbDeg,
    exactToleranceDeg,
    stationaryRelativeSpeedDegPerDay,
    withinOrb,
    interpretation: 'FACTS_ONLY',
    validation: 'CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED',
  });
}
