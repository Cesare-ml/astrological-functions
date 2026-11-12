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
const normalized = deg => ((deg % 360) + 360) % 360;
const signedDifference = (from, to) => ((normalized(to) - normalized(from) + 540) % 360) - 180;
const plainRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const error = (code, message) => { throw new AspectTrendError(code, message); };

function validatePoint(point, name) {
  if (!plainRecord(point) || !finite(point.longitudeDeg) ||
      !Object.hasOwn(point, 'longitudeSpeedDegPerDay') ||
      !(point.longitudeSpeedDegPerDay === null || finite(point.longitudeSpeedDegPerDay))) {
    error('INVALID_POINT', `${name} requires finite longitudeDeg and explicit finite speed or null`);
  }
  return {longitudeDeg: normalized(point.longitudeDeg), longitudeSpeedDegPerDay: point.longitudeSpeedDegPerDay};
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
  const observedForwardDeg = normalized(b.longitudeDeg - a.longitudeDeg);
  const signedResidualDeg = signedDifference(exactForwardDeg, observedForwardDeg);
  const absoluteResidualDeg = Math.abs(signedResidualDeg);
  const relativeSpeedDegPerDay = a.longitudeSpeedDegPerDay === null || b.longitudeSpeedDegPerDay === null
    ? null : b.longitudeSpeedDegPerDay - a.longitudeSpeedDegPerDay;

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
