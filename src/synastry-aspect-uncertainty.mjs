/**
 * Experimental geometric uncertainty of cross-aspects from caller-supplied
 * continuous longitude enclosures. NO ephemeris calculation or sampling here.
 * Statuses are conditional on the caller's enclosure assertion.
 */
import { AstrologyError, angularSeparation } from './index.mjs';

const PROVENANCE_KEYS = Object.freeze(['engineVersion', 'kernelSetId', 'timeModel']);
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function utc(value) {
  return typeof value === 'string' && UTC.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
}
function requiredRecord(value, code, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AstrologyError(code, `${field} requires a plain record`);
  return value;
}
function provenanceSnapshot(from, expected) {
  const raw = requiredRecord(from, 'INVALID_ENCLOSURE_PROVENANCE', 'Enclosure provenance');
  const reference = requiredRecord(expected, 'INVALID_UNCERTAINTY_RESULT', 'Synastry provenance');
  const copy = Object.create(null);
  for (const key of PROVENANCE_KEYS) {
    if (typeof reference[key] !== 'string' || !reference[key].trim() ||
        typeof raw[key] !== 'string' || !raw[key].trim())
      throw new AstrologyError('INVALID_ENCLOSURE_PROVENANCE', 'Complete engine/kernel/time-model provenance required');
    if (reference[key] !== raw[key])
      throw new AstrologyError('INCOMPATIBLE_ENCLOSURE_PROVENANCE', 'Enclosure provenance differs from synastry snapshot');
    copy[key] = raw[key];
  }
  return Object.freeze(copy);
}
function validateRules(rules) {
  if (!Array.isArray(rules) || rules.length > 64)
    throw new AstrologyError('INVALID_ASPECT', 'Expected at most 64 explicit aspect definitions');
  const ids = new Set();
  return Object.freeze(Array.from(rules, rule => {
    if (!rule || typeof rule !== 'object' || Array.isArray(rule) ||
        typeof rule.id !== 'string' || !rule.id.trim() ||
        typeof rule.angleDeg !== 'number' || !Number.isFinite(rule.angleDeg) ||
        typeof rule.maxOrbDeg !== 'number' || !Number.isFinite(rule.maxOrbDeg) ||
        rule.angleDeg < 0 || rule.angleDeg > 180 ||
        rule.maxOrbDeg < 0 || rule.maxOrbDeg > 180 || ids.has(rule.id))
      throw new AstrologyError('INVALID_ASPECT', 'Aspect ID, angle and orb must be valid and unique');
    ids.add(rule.id);
    return Object.freeze({id:rule.id,angleDeg:rule.angleDeg,maxOrbDeg:rule.maxOrbDeg});
  }));
}
function chartEnclosures(chartKey, result, data) {
  const basis = requiredRecord(result.timeBasis?.[chartKey], 'INVALID_UNCERTAINTY_RESULT', 'Chart time basis');
  const date = basis.datetimeUtc;
  if (!utc(date) || typeof basis.birthTimeKnown !== 'boolean' ||
      basis.positionBasis !== (basis.birthTimeKnown ? 'KNOWN_BIRTH_INSTANT' : 'REPRESENTATIVE_INSTANT'))
    throw new AstrologyError('INVALID_UNCERTAINTY_RESULT', 'Invalid source synastry time basis');
  const names = result.selectedBodyNames?.[chartKey];
  if (!Array.isArray(names) || names.length < 1 || names.length > 32 ||
      Array.from(names).some(n => typeof n !== 'string' || !n.trim()) ||
      new Set(names).size !== names.length)
    throw new AstrologyError('INVALID_UNCERTAINTY_RESULT', 'Source synastry body selection is invalid');
  const enclosing = requiredRecord(data, 'INVALID_ENCLOSURE', 'Chart enclosure');
  if (enclosing.coverage !== 'CALLER_ASSERTED_CONTINUOUS_ENCLOSURE')
    throw new AstrologyError('INVALID_ENCLOSURE', 'Continuous coverage must be explicitly asserted by caller');
  const start = enclosing.intervalStartUtc, end = enclosing.intervalEndUtc;
  if (!utc(start) || !utc(end) || Date.parse(start) > Date.parse(end))
    throw new AstrologyError('INVALID_ENCLOSURE_INTERVAL', 'Valid ordered UTC interval required');
  const sample = Date.parse(date), left = Date.parse(start), right = Date.parse(end);
  if (basis.birthTimeKnown) {
    if (left !== sample || right !== sample)
      throw new AstrologyError('INCOMPATIBLE_ENCLOSURE_INTERVAL', 'Known birth instant requires point interval');
  } else if (left === right || sample < left || sample > right) {
    throw new AstrologyError('INCOMPATIBLE_ENCLOSURE_INTERVAL', 'Representative instant must lie in a nonempty uncertainty interval');
  }
  const provenance = provenanceSnapshot(enclosing.ephemerisProvenance, result.provenance?.[chartKey]);
  const bodies = requiredRecord(enclosing.bodies, 'INVALID_ENCLOSURE', 'Body enclosures');
  if (Object.keys(bodies).length !== names.length || names.some(name => !Object.hasOwn(bodies,name)))
    throw new AstrologyError('INVALID_ENCLOSURE', 'Exactly the selected body enclosures must be supplied');
  const points = Object.freeze(names.map(name => {
    const arc = requiredRecord(bodies[name], 'INVALID_ENCLOSURE', 'Longitude arc');
    const {startDeg, spanDeg} = arc;
    if (typeof startDeg !== 'number' || !Number.isFinite(startDeg) ||
        startDeg < 0 || startDeg >= 360 ||
        typeof spanDeg !== 'number' || !Number.isFinite(spanDeg) ||
        spanDeg < 0 || spanDeg > 360)
      throw new AstrologyError('INVALID_ENCLOSURE', 'Canonical start [0,360) and span [0,360] required');
    if (basis.birthTimeKnown && spanDeg !== 0)
      throw new AstrologyError('INVALID_ENCLOSURE', 'Known birth instant requires a zero-span arc');
    return Object.freeze({name, startDeg, spanDeg});
  }));
  return Object.freeze({
    intervalStartUtc:start, intervalEndUtc:end,
    coverage:'CALLER_ASSERTED_CONTINUOUS_ENCLOSURE',
    birthTimeKnown:basis.birthTimeKnown, representativeUtc:date,
    ephemerisProvenance:provenance, points,
  });
}

/** Angular separation bounds for the full Cartesian product of two arcs. */
function separationBounds(a,b) {
  if (a.spanDeg + b.spanDeg >= 360)
    return Object.freeze({minDeg:0,maxDeg:180});
  // Difference B-A ranges continuously over this unwrapped interval.
  const low = b.startDeg - a.startDeg - a.spanDeg;
  const high = b.startDeg - a.startDeg + b.spanDeg;
  const crosses = offset => Math.ceil((low-offset)/360) <= Math.floor((high-offset)/360);
  const v0 = angularSeparation(0,low), v1 = angularSeparation(0,high);
  return Object.freeze({
    minDeg:crosses(0) ? 0 : Math.min(v0,v1),
    maxDeg:crosses(180) ? 180 : Math.max(v0,v1),
  });
}
function directionFacts(direction, source, target, rules) {
  const facts = [];
  const counts = {ALWAYS_WITHIN_BOUNDS:0, NEVER_WITHIN_BOUNDS:0, MAYBE_WITHIN_BOUNDS:0};
  for (const from of source.points) for (const to of target.points) for (const rule of rules) {
    const {minDeg,maxDeg} = separationBounds(from,to);
    const orbLowDeg = Math.max(0,rule.angleDeg-rule.maxOrbDeg);
    const orbHighDeg = Math.min(180,rule.angleDeg+rule.maxOrbDeg);
    // The image of a continuous difference interval is a continuous angle
    // interval. Hence the min/max suffice for these conditional predicates.
    const status = minDeg >= orbLowDeg && maxDeg <= orbHighDeg
      ? 'ALWAYS_WITHIN_BOUNDS'
      : maxDeg < orbLowDeg || minDeg > orbHighDeg
        ? 'NEVER_WITHIN_BOUNDS'
        : 'MAYBE_WITHIN_BOUNDS';
    counts[status] += 1;
    facts.push(Object.freeze({
      direction, sourceBodyName:from.name, targetBodyName:to.name,
      aspectId:rule.id, angleDeg:rule.angleDeg,maxOrbDeg:rule.maxOrbDeg,
      separationBoundsDeg:Object.freeze({minDeg,maxDeg}),
      orbBoundsDeg:Object.freeze({minDeg:orbLowDeg,maxDeg:orbHighDeg}),
      status,
    }));
  }
  return Object.freeze({direction,facts:Object.freeze(facts),counts:Object.freeze(counts)});
}

/**
 * Compute conditional classifications over caller-asserted continuous arc
 * enclosures. A sample-only sweep is NOT a continuous enclosure proof.
 */
export function analyzeSynastryAspectUncertainty(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'Uncertainty analysis options must be an object');
  const result = requiredRecord(input.aspectsOnlyResult, 'INVALID_UNCERTAINTY_RESULT', 'Aspects-only result');
  if (result.contract !== 'SynastryAspectsOnlyResult' ||
      result.contractVersion !== '0.1.0-experimental' ||
      result.houseMode !== 'UNAVAILABLE' || result.angles !== null ||
      result.aToB?.houseOverlays !== null || result.bToA?.houseOverlays !== null)
    throw new AstrologyError('INVALID_UNCERTAINTY_RESULT', 'Aspects-only result required; houses and angles must be unavailable');
  const rules = validateRules(result.aspectDefinitions);
  const a = chartEnclosures('A',result,input.enclosureA);
  const b = chartEnclosures('B',result,input.enclosureB);
  return Object.freeze({
    contract:'SynastryAspectUncertaintyResult',
    contractVersion:'0.1.0-experimental',
    interpretation:'CONDITIONAL_ON_CALLER_ENCLOSURES',
    houseMode:'UNAVAILABLE',
    angles:null,
    enclosures:Object.freeze({A:a,B:b}),
    aspectDefinitions:rules,
    warning:Object.freeze({
      code:'ENCLOSURE_COVERAGE_NOT_VERIFIED',
      message:'Caller asserts continuous coverage; this module cannot verify the ephemeris or completeness of intervals. Sampled positions alone are insufficient proof.',
    }),
    aToB:directionFacts('A_TO_B',a,b,rules),
    bToA:directionFacts('B_TO_A',b,a,rules),
  });
}
