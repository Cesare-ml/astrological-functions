/**
 * Experimental latest-preceding GEOCENTRIC ECLIPTIC-LONGITUDE conjunction.
 * All astronomy is delegated to a caller-pinned VirgoStars-Ephemeris Engine.
 * A root is only an unverified candidate; NEVER enables Regolo NEW_MOON lots.
 */
import {AstrologyError, normalize360} from './index.mjs';

const PIN_KEYS = ['engineId', 'engineVersion', 'kernelSetId', 'timeModelId'];
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UTC = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?Z$/;
const JD_UNIX = 2440587.5;

const fail = (code, message) => { throw new AstrologyError(code, message); };
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x));

function fields(value, required, code) {
  if (!plain(value) || Object.keys(value).length !== required.length ||
      required.some(key => !Object.hasOwn(value, key))) {
    fail(code, `Expected exactly ${required.join(', ')}`);
  }
}

function birthInstant(utc) {
  const match = typeof utc === 'string' ? UTC.exec(utc) : null;
  if (!match) fail('INVALID_UTC', 'Exact UTC instant required');
  const fraction = (match[2] ?? '').padEnd(6, '0');
  const ms = Date.parse(`${match[1]}.${fraction.slice(0, 3)}Z`);
  if (!Number.isFinite(ms) ||
      new Date(ms).toISOString() !== `${match[1]}.${fraction.slice(0, 3)}Z`) {
    fail('INVALID_UTC', 'Impossible UTC calendar date');
  }
  return {utc: `${match[1]}.${fraction}Z`, unixMilliseconds: ms +
    Number(fraction.slice(3)) / 1000};
}

function validTimeSource(source, policy) {
  if (source === policy) return true;
  // The upstream UT API includes a numerically varying Delta-T estimate
  // after its *named* policy. Requiring byte-for-byte equality across a
  // whole lunar cycle would incorrectly reject valid observations.
  return policy.startsWith('DELTA_T_') && typeof source === 'string' &&
    source.startsWith(`${policy}:`) &&
    source.length > policy.length + 1 && source.length < 256;
}

function observe(engine, jdUt, policy) {
  const point = [];
  let timeSource = null;
  for (const body of [0, 1]) {
    let result;
    try {result = engine.calcUt(jdUt, body, 0);} catch (error) {
      fail('EPHEMERIS_POSITION_FAILURE',
        `Engine.calcUt(${body}) failed: ${String(error?.code ?? error?.message ?? error)}`);
    }
    if (!plain(result) || !Array.isArray(result.xx) || result.xx.length < 6 ||
        !Number.isFinite(result.xx[0]) || !Number.isFinite(result.xx[1]) ||
        Math.abs(result.xx[1]) > 90 ||
        !Number.isFinite(result.xx[2]) || result.xx[2] <= 0 ||
        !Number.isSafeInteger(result.rflag) || (result.rflag & 1) !== 1 ||
        !validTimeSource(result.timeSource, policy)) {
      fail('INCOMPATIBLE_POSITION_SOURCE',
        'Sun/Moon must be apparent geocentric ecliptic-of-date with matching pinned time policy and JPL flags');
    }
    if (timeSource !== null && result.timeSource !== timeSource) {
      fail('INCOMPATIBLE_POSITION_SOURCE', 'Sun and Moon timeSource at a Julian instant must agree');
    }
    timeSource = result.timeSource;
    point.push(normalize360(result.xx[0]));
  }
  const [sunLongitudeDeg, moonLongitudeDeg] = point;
  const signedElongationDeg = ((moonLongitudeDeg - sunLongitudeDeg + 540) % 360) - 180;
  return Object.freeze({jdUt, sunLongitudeDeg, moonLongitudeDeg,
    signedElongationDeg, timeSource});
}

function refine(engine, left, right, policy, toleranceDays, maxIterations,
  maxResidualDeg) {
  // Caller guarantees left signed gap <0 and right >=0, with no 180° wrap.
  let iterations = 0;
  while (right.jdUt - left.jdUt > toleranceDays && iterations < maxIterations) {
    const middleJd = (left.jdUt + right.jdUt) / 2;
    if (middleJd <= left.jdUt || middleJd >= right.jdUt) break;
    const middle = observe(engine, middleJd, policy);
    if (middle.signedElongationDeg >= 0) right = middle;
    else left = middle;
    ++iterations;
  }
  const atRoot = observe(engine, (left.jdUt + right.jdUt) / 2, policy);
  if (right.jdUt - left.jdUt > toleranceDays ||
      Math.abs(atRoot.signedElongationDeg) > maxResidualDeg) {
    return {status: 'NON_CONVERGENT', candidate: null};
  }
  // Reject seams and non-conjunction sign flips via a local, positive
  // elongation derivative. A decreasing or discontinuous crossing is not a
  // legitimate latest preceding geocentric longitude conjunction.
  const probe = Math.max(toleranceDays * 2, 1 / 86400);
  const before = observe(engine, atRoot.jdUt - probe, policy);
  const after = observe(engine, atRoot.jdUt + probe, policy);
  const sweep = after.signedElongationDeg - before.signedElongationDeg;
  if (before.signedElongationDeg >= 0 || after.signedElongationDeg <= 0 ||
      sweep <= 0 || sweep >= 5) {
    return {status: 'REJECTED_NONCONJUNCTION_CROSSING', candidate: null};
  }
  return {status: 'CANDIDATE_UNVERIFIED_ASTRONOMY', candidate:
    Object.freeze({...atRoot, iterations, bracketWidthSeconds:
      (right.jdUt - left.jdUt) * 86400,
    localLongitudeSweepDeg: sweep})};
}

/**
 * Search backward over an explicit 30–35 UT1-day window, using only
 * Engine.calcUt(jdUt, Sun=0/Moon=1, flags=0). No native dependencies loaded.
 * Birth epoch consistency is checked against supplied UT1−UTC at birth.
 * The event is returned as JD UT1 only; no event UTC is fabricated from
 * a birth-time DUT1 correction across a multi-week historical interval.
 */
export function searchRegoloPrecedingConjunction(input) {
  const args = ['datetimeUtc', 'birthJdUt', 'ut1MinusUtcAtBirthSeconds',
    'expectedEphemeris', 'expectedTimeSourcePolicy', 'lookbackDays',
    'sampleStepHours', 'rootToleranceSeconds', 'maxIterations',
    'maxConjunctionResidualDeg', 'engine'];
  fields(input, args, 'INVALID_ARGUMENT');
  const birth = birthInstant(input.datetimeUtc);
  fields(input.expectedEphemeris, PIN_KEYS, 'INVALID_EPHEMERIS_PIN');
  if (input.expectedEphemeris.engineId !== 'VIRGOSTARS_EPHEMERIS' ||
      PIN_KEYS.slice(1).some(key => !SAFE_ID.test(input.expectedEphemeris[key]))) {
    fail('INVALID_EPHEMERIS_PIN', 'Exact pinned VirgoStars source identity required');
  }
  const source = Object.freeze({...input.expectedEphemeris});
  if (!Number.isFinite(input.birthJdUt) ||
      !Number.isFinite(input.ut1MinusUtcAtBirthSeconds) ||
      Math.abs(input.ut1MinusUtcAtBirthSeconds) > 1 ||
      typeof input.expectedTimeSourcePolicy !== 'string' ||
      !SAFE_ID.test(input.expectedTimeSourcePolicy) ||
      input.lookbackDays < 30 || input.lookbackDays > 35 ||
      !Number.isFinite(input.lookbackDays) ||
      !Number.isFinite(input.sampleStepHours) ||
      input.sampleStepHours < 1 || input.sampleStepHours > 12 ||
      !Number.isFinite(input.rootToleranceSeconds) ||
      input.rootToleranceSeconds < 0.01 || input.rootToleranceSeconds > 60 ||
      !Number.isSafeInteger(input.maxIterations) ||
      input.maxIterations < 10 || input.maxIterations > 96 ||
      !Number.isFinite(input.maxConjunctionResidualDeg) ||
      input.maxConjunctionResidualDeg <= 0 || input.maxConjunctionResidualDeg > 0.1) {
    fail('INVALID_SEARCH_MODEL', 'Explicit bounded UT1 time conversion, sample interval, root tolerance and iteration budget required');
  }
  const estimatedJd = JD_UNIX +
    (birth.unixMilliseconds + input.ut1MinusUtcAtBirthSeconds * 1000) / 86400000;
  if (Math.abs((estimatedJd - input.birthJdUt) * 86400) > 0.001) {
    fail('INCOMPATIBLE_BIRTH_EPOCH', 'Birth Julian UT1 day must match birth UTC + declared DUT1');
  }
  if (!input.engine || typeof input.engine.calcUt !== 'function') {
    fail('INVALID_EPHEMERIS_PROVIDER', 'Injected VirgoStars Engine.calcUt required');
  }
  const start = input.birthJdUt - input.lookbackDays;
  const sampleStepDays = input.sampleStepHours / 24;
  const toleranceDays = input.rootToleranceSeconds / 86400;
  let previous = observe(input.engine, start, input.expectedTimeSourcePolicy);
  let latest = null;
  let candidateBrackets = 0;
  let sampledPoints = 1;
  for (let cursor = start; cursor < input.birthJdUt;) {
    const nextJd = Math.min(cursor + sampleStepDays, input.birthJdUt);
    if (nextJd <= cursor) fail('NON_CONVERGENT', 'JD sampling made no progress');
    const current = observe(input.engine, nextJd, input.expectedTimeSourcePolicy);
    ++sampledPoints;
    if (previous.signedElongationDeg < 0 && current.signedElongationDeg >= 0 &&
        current.signedElongationDeg - previous.signedElongationDeg < 30) {
      ++candidateBrackets;
      const refined = refine(input.engine, previous, current,
        input.expectedTimeSourcePolicy, toleranceDays, input.maxIterations,
        input.maxConjunctionResidualDeg);
      // A later non-convergent bracket invalidates an earlier candidate:
      // we can no longer claim it is the *latest* preceding conjunction.
      latest = refined.candidate;
    }
    cursor = nextJd;
    previous = current;
  }
  const status = latest ? 'CANDIDATE_UNVERIFIED_ASTRONOMY' :
    candidateBrackets ? 'NON_CONVERGENT' : 'NO_CONJUNCTION_BRACKET';
  return Object.freeze({contract: 'RegoloPrecedingConjunctionSearchV1',
    contractVersion: '0.1.0-experimental', status,
    datetimeUtc: birth.utc, birthJdUt: input.birthJdUt,
    expectedEphemeris: source,
    expectedTimeSourcePolicy: input.expectedTimeSourcePolicy,
    lookbackDays: input.lookbackDays, sampleStepHours: input.sampleStepHours,
    rootToleranceSeconds: input.rootToleranceSeconds, sampledPoints,
    candidateBrackets, candidate: latest,
    precedingNewMoon: Object.freeze({availability: 'UNAVAILABLE',
      reason: latest ? 'NOT_COMPUTED' : 'NON_CONVERGENT'}),
    scientificEvidence: 'UNVERIFIED_INJECTED_VIRGOSTARS_ENGINE',
    warnings: Object.freeze([
      'RUST_ADDON_KERNEL_AND_TIME_MODEL_CALLER_ASSERTED',
      'NUMERIC_ROOT_NOT_INDEPENDENTLY_VALIDATED',
      'EVENT_UTC_AND_LUNAR_LOTS_NOT_ENABLED',
    ])});
}
