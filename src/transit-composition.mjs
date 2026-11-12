/**
 * Experimental F4 orchestration: provider sky positions -> SKY_TO_NATAL facts.
 * It does not provide or validate astronomical position algorithms.
 */
import { AstrologyError } from './index.mjs';
import { calculateTransitFacts } from './transit-facts.mjs';
import { getTransitSkySnapshotWithProvider } from './transit-provider.mjs';

function fail(code, message) { throw new AstrologyError(code, message); }
function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

/** Only fields used by the downstream fact contract are retained; no user data. */
function cloneNatal(value) {
  if (!record(value) || !record(value.zodiac) || !record(value.ephemeris) ||
      !Array.isArray(value.points))
    fail('INVALID_NATAL', 'Explicit natal UTC, zodiac, provenance and body points required');
  const points = Object.freeze(Array.from(value.points, point => {
    if (!record(point)) fail('INVALID_NATAL', 'Natal points must be objects');
    return Object.freeze({name:point.name, type:point.type, longitudeDeg:point.longitudeDeg,
      longitudeSpeedDegPerDay:point.longitudeSpeedDegPerDay});
  }));
  return Object.freeze({
    datetimeUtc:value.datetimeUtc,
    zodiac:Object.freeze({type:value.zodiac.type, ...(Object.hasOwn(value.zodiac,'ayanamsaId') ? {ayanamsaId:value.zodiac.ayanamsaId} : {})}),
    ephemeris:Object.freeze({
      center:value.ephemeris.center, frame:value.ephemeris.frame,
      corrections:value.ephemeris.corrections, engineVersion:value.ephemeris.engineVersion,
      kernelSetId:value.ephemeris.kernelSetId, timeModel:value.ephemeris.timeModel
    }), points
  });
}
function cloneRules(value) {
  if (!Array.isArray(value)) fail('INVALID_ASPECT', 'Explicit aspectDefinitions array required');
  return Object.freeze(Array.from(value, rule => {
    if (!record(rule)) fail('INVALID_ASPECT', 'Aspect rules must be objects');
    return Object.freeze({id:rule.id, angleDeg:rule.angleDeg, maxOrbDeg:rule.maxOrbDeg});
  }));
}

/**
 * Snapshots all natal data and aspect rules before the first awaited provider
 * call. Provider verification status is deliberately NOT lost when composing
 * ordinary (astronomy-agnostic) aspect facts.
 */
export async function calculateTransitFactsWithProvider(input) {
  if (!record(input)) fail('INVALID_ARGUMENT', 'Explicit composition input required');
  if (input.birthTimeKnown !== true)
    fail('BIRTH_TIME_REQUIRED', 'Exact natal transit facts require an explicitly known birth time');
  const natal = cloneNatal(input.natal);
  const aspectDefinitions = cloneRules(input.aspectDefinitions);
  // Capture all inputs before invoking a potentially reentrant async provider.
  const providerInput = Object.freeze({
    datetimeUtc:input.datetimeUtc, zodiac:input.zodiac,
    bodyNames:input.bodyNames, expectedEphemeris:input.expectedEphemeris,
    provider:input.provider
  });
  const obtained = await getTransitSkySnapshotWithProvider(providerInput);
  const facts = calculateTransitFacts({birthTimeKnown:true,
    natal, sky:obtained.sky, aspectDefinitions});
  return Object.freeze({
    contract:'TransitFactsWithProviderResult', contractVersion:'0.1.0-experimental',
    status:obtained.status,
    facts,
    warnings:Object.freeze(obtained.warnings.map(w => Object.freeze({code:w.code,message:w.message})))
  });
}
