/**
 * Experimental consumer-side gate for a FUTURE Rust/WASM continuous-longitude
 * enclosure provider. No astronomy, no interpolation and no implicit fallback.
 * A provider's asserted continuous coverage is NOT independently verified.
 */
import { AstrologyError } from './index.mjs';
import { analyzeSynastryAspectUncertainty } from './synastry-aspect-uncertainty.mjs';

const VERSION = '0.1.0-experimental';
const PROVENANCE_KEYS = Object.freeze(['engineVersion', 'kernelSetId', 'timeModel']);
const COORDINATES = Object.freeze({
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
});
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
function record(value, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AstrologyError(code, `${label} must be a non-array record`);
  return value;
}
function validUtc(value) {
  return typeof value === 'string' && UTC_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0,19) === value.slice(0,19);
}
function provenance(value, label) {
  const data = record(value, 'INVALID_PROVENANCE', label);
  const snapshot = Object.create(null);
  for (const key of PROVENANCE_KEYS) {
    if (typeof data[key] !== 'string' || !data[key].trim())
      throw new AstrologyError('INVALID_PROVENANCE', `${label} requires nonempty ${key}`);
    snapshot[key] = data[key];
  }
  return Object.freeze(snapshot);
}
function coordinateCheck(value, code) {
  const actual = record(value, code, 'Coordinate model');
  if (actual.center !== COORDINATES.center ||
      actual.frame !== COORDINATES.frame ||
      actual.corrections !== COORDINATES.corrections)
    throw new AstrologyError(code, 'Only Earth-centered apparent ecliptic-of-date longitudes are accepted');
}
function resultSnapshot(source) {
  const result = record(source, 'INVALID_UNCERTAINTY_RESULT', 'Synastry aspects-only result');
  if (result.contract !== 'SynastryAspectsOnlyResult' ||
      result.contractVersion !== VERSION ||
      result.houseMode !== 'UNAVAILABLE' || result.angles !== null ||
      result.aToB?.houseOverlays !== null || result.bToA?.houseOverlays !== null)
    throw new AstrologyError('INVALID_UNCERTAINTY_RESULT', 'An experimental aspects-only result without houses is required');
  const charts = {};
  for (const letter of ['A','B']) {
    const basis = record(result.timeBasis?.[letter], 'INVALID_TIME_BASIS', `Chart ${letter} time basis`);
    const birthTimeKnown = basis.birthTimeKnown;
    if (typeof birthTimeKnown !== 'boolean' || !validUtc(basis.datetimeUtc) ||
        basis.positionBasis !== (birthTimeKnown ? 'KNOWN_BIRTH_INSTANT' : 'REPRESENTATIVE_INSTANT'))
      throw new AstrologyError('INVALID_TIME_BASIS', `Chart ${letter} needs an explicit consistent UTC time basis`);
    const list = result.selectedBodyNames?.[letter];
    if (!Array.isArray(list) || list.length < 1 || list.length > 32)
      throw new AstrologyError('INVALID_BODIES', `Chart ${letter} needs 1..32 selected bodies`);
    const names = Object.freeze(Array.from(list, name => {
      if (typeof name !== 'string' || !name.trim())
        throw new AstrologyError('INVALID_BODIES', 'Selected body names must be nonempty strings');
      return name;
    }));
    if (new Set(names).size !== names.length)
      throw new AstrologyError('INVALID_BODIES', 'Selected body names must be unique');
    charts[letter] = Object.freeze({
      timeBasis: Object.freeze({
        birthTimeKnown, positionBasis:basis.positionBasis, datetimeUtc:basis.datetimeUtc,
      }),
      bodyNames:names,
      ephemerisProvenance:provenance(result.provenance?.[letter],`Chart ${letter} provenance`),
    });
  }
  if (!Array.isArray(result.aspectDefinitions) || result.aspectDefinitions.length > 64)
    throw new AstrologyError('INVALID_ASPECT', 'Explicit configured aspect definitions required');
  return Object.freeze(charts);
}
function interval(source, chart) {
  const input = record(source, 'INVALID_INTERVAL', 'Requested time interval');
  if (!validUtc(input.startUtc) || !validUtc(input.endUtc))
    throw new AstrologyError('INVALID_INTERVAL', 'Canonical UTC interval required');
  const startMs = Date.parse(input.startUtc), endMs=Date.parse(input.endUtc);
  const sampleMs=Date.parse(chart.timeBasis.datetimeUtc);
  if (startMs > endMs)
    throw new AstrologyError('INVALID_INTERVAL', 'Interval start must not exceed end');
  if (chart.timeBasis.birthTimeKnown) {
    if (startMs !== sampleMs || endMs !== sampleMs)
      throw new AstrologyError('INCOMPATIBLE_INTERVAL', 'Known birth instant requires a point interval');
  } else if (startMs === endMs || sampleMs < startMs || sampleMs > endMs) {
    throw new AstrologyError('INCOMPATIBLE_INTERVAL', 'Unknown-time interval must contain the representative instant and be nonempty');
  }
  return Object.freeze({startUtc:input.startUtc,endUtc:input.endUtc});
}
function validatedProvider(value) {
  const provider=record(value,'MISSING_ENCLOSURE_PROVIDER','Longitude enclosure provider');
  if (typeof provider.getContinuousLongitudeEnclosure !== 'function')
    throw new AstrologyError('MISSING_ENCLOSURE_PROVIDER','Provider must implement getContinuousLongitudeEnclosure');
  const c=record(provider.capabilities,'INCOMPATIBLE_ENCLOSURE_PROVIDER','Provider capabilities');
  if (c.contract !== 'LongitudeEnclosureProviderCapabilities' ||
      c.contractVersion !== VERSION ||
      c.continuousCoverage !== 'PROVIDER_ASSERTED_FULL_INTERVAL_INCLUDING_STATIONS')
    throw new AstrologyError('INCOMPATIBLE_ENCLOSURE_PROVIDER','Explicit versioned continuous interval capability required');
  coordinateCheck(c.coordinates,'INCOMPATIBLE_ENCLOSURE_PROVIDER');
  return provider;
}
function requestFor(letter, chart, range) {
  return Object.freeze({
    contract:'LongitudeEnclosureRequest',
    contractVersion:VERSION,
    chart:letter,
    intervalStartUtc:range.startUtc,
    intervalEndUtc:range.endUtc,
    representativeUtc:chart.timeBasis.datetimeUtc,
    birthTimeKnown:chart.timeBasis.birthTimeKnown,
    bodyNames:chart.bodyNames,
    coordinates:COORDINATES,
    coverageRequirement:'FULL_INTERVAL_INCLUDING_STATIONS',
    ephemerisProvenance:chart.ephemerisProvenance,
  });
}
function readResponse(response, request) {
  const raw=record(response,'INVALID_ENCLOSURE_RESPONSE','Enclosure response');
  if (raw.contract !== 'LongitudeEnclosureResponse' || raw.contractVersion !== VERSION ||
      raw.chart !== request.chart ||
      raw.intervalStartUtc !== request.intervalStartUtc ||
      raw.intervalEndUtc !== request.intervalEndUtc ||
      raw.representativeUtc !== request.representativeUtc ||
      raw.coverage !== 'PROVIDER_ASSERTED_FULL_INTERVAL_INCLUDING_STATIONS')
    throw new AstrologyError('INCOMPATIBLE_ENCLOSURE_RESPONSE','Provider response contract, time window or coverage differs from request');
  coordinateCheck(raw.coordinates,'INCOMPATIBLE_ENCLOSURE_RESPONSE');
  const origin=provenance(raw.ephemerisProvenance,'Enclosure response provenance');
  for (const key of PROVENANCE_KEYS) {
    if (origin[key] !== request.ephemerisProvenance[key])
      throw new AstrologyError('INCOMPATIBLE_ENCLOSURE_PROVENANCE', 'Provider changed engine, kernel or time model');
  }
  const evidence=record(raw.coverageEvidence,'INVALID_ENCLOSURE_EVIDENCE','Coverage evidence');
  if (typeof evidence.algorithmId !== 'string' || !evidence.algorithmId.trim() ||
      evidence.method !== 'PROVIDER_DECLARED_CONTINUOUS_BOUNDS' ||
      evidence.stationHandling !== 'INCLUDED' ||
      evidence.errorIncludedInArcs !== true ||
      typeof evidence.maxLongitudeErrorDeg !== 'number' ||
      !Number.isFinite(evidence.maxLongitudeErrorDeg) ||
      evidence.maxLongitudeErrorDeg < 0 || evidence.maxLongitudeErrorDeg > 180)
    throw new AstrologyError('INVALID_ENCLOSURE_EVIDENCE',
      'Provider must declare a method and numerical-error/station treatment; claims are not verified');
  const bodies=record(raw.bodies,'INVALID_ENCLOSURE_RESPONSE','Enclosed longitudes');
  if (Object.keys(bodies).length !== request.bodyNames.length ||
      request.bodyNames.some(name=>!Object.hasOwn(bodies,name)))
    throw new AstrologyError('INVALID_ENCLOSURE_RESPONSE','Enclosed body names must match the request exactly');
  const copy=Object.create(null);
  for (const name of request.bodyNames) {
    const arc=record(bodies[name],'INVALID_ENCLOSURE_RESPONSE','Longitude arc');
    if (typeof arc.startDeg !== 'number' || !Number.isFinite(arc.startDeg) ||
        arc.startDeg < 0 || arc.startDeg >= 360 ||
        typeof arc.spanDeg !== 'number' || !Number.isFinite(arc.spanDeg) ||
        arc.spanDeg < 0 || arc.spanDeg > 360 ||
        request.birthTimeKnown && arc.spanDeg !== 0)
      throw new AstrologyError('INVALID_ENCLOSURE_RESPONSE','Canonical, finite longitude arcs are required');
    copy[name]=Object.freeze({startDeg:arc.startDeg,spanDeg:arc.spanDeg});
  }
  return Object.freeze({
    enclosure:Object.freeze({
      coverage:'CALLER_ASSERTED_CONTINUOUS_ENCLOSURE',
      intervalStartUtc:request.intervalStartUtc,
      intervalEndUtc:request.intervalEndUtc,
      ephemerisProvenance:request.ephemerisProvenance,
      bodies:Object.freeze(copy),
    }),
    evidence:Object.freeze({
      algorithmId:evidence.algorithmId,
      method:'PROVIDER_DECLARED_CONTINUOUS_BOUNDS',
      stationHandling:'INCLUDED',
      errorIncludedInArcs:true,
      maxLongitudeErrorDeg:evidence.maxLongitudeErrorDeg,
    }),
  });
}

/**
 * Sequentially obtains the two declared longitude enclosures and delegates
 * geometric classification to the independent PR #10 uncertainty module.
 * Atomic result: no partial analysis is returned if either provider call fails.
 */
export async function analyzeSynastryUncertaintyWithProvider(input) {
  const options=record(input,'INVALID_ARGUMENT','Provider uncertainty options');
  const chart=resultSnapshot(options.aspectsOnlyResult);
  const aRange=interval(options.intervalA,chart.A);
  const bRange=interval(options.intervalB,chart.B);
  const provider=validatedProvider(options.provider);
  const reqA=requestFor('A',chart.A,aRange);
  const reqB=requestFor('B',chart.B,bRange);
  // Freeze input request snapshots before any await: callers/providers cannot
  // change selected identifiers, metadata or interval boundaries mid-flight.
  const a=readResponse(await provider.getContinuousLongitudeEnclosure(reqA),reqA);
  const b=readResponse(await provider.getContinuousLongitudeEnclosure(reqB),reqB);
  const analysis=analyzeSynastryAspectUncertainty({
    aspectsOnlyResult:options.aspectsOnlyResult,
    enclosureA:a.enclosure,enclosureB:b.enclosure,
  });
  return Object.freeze({
    contract:'SynastryProviderUncertaintyResult',
    contractVersion:VERSION,
    status:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    evidence:Object.freeze({A:a.evidence,B:b.evidence}),
    analysis,
  });
}
