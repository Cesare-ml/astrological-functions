/**
 * Original pure mathematical primitives for astrological chart facts.
 * No Swiss Ephemeris dependency, no astronomical ephemeris implementation,
 * no account/interpretation/database dependency.
 * Experimental package: not a live VirgoStars calculation service.
 */
export class AstrologyError extends Error {
  constructor(code, message) { super(message); this.name='AstrologyError'; this.code=code; }
}
function finite(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new AstrologyError('INVALID_ANGLE', `${field} must be a finite number`);
}
export function normalize360(degrees) {
  finite(degrees, 'degrees');
  // Adding 360 to a positive remainder can round 359.99999999999994 to 360.
  // Preserve positive remainders and normalize negative zero explicitly.
  const remainder = degrees % 360;
  if (remainder < 0) {
    const positive = remainder + 360;
    return positive === 360 ? 0 : positive;
  }
  return remainder === 0 ? 0 : remainder;
}
/** Signed shortest difference from a to b, in [-180, 180). */
export function signedAngularDistance(a,b) {
  // Both values are in [0, 360). Avoid the +540 shift: it can round away
  // sub-ULP separations near the 0°/360° boundary.
  const difference = normalize360(b) - normalize360(a);
  if (difference >= 180) return difference - 360;
  if (difference < -180) return difference + 360;
  return difference === 0 ? 0 : difference;
}
export function angularSeparation(a,b) {
  return Math.abs(signedAngularDistance(a,b));
}
export function zodiacSignIndex(longitude) {
  return Math.floor(normalize360(longitude) / 30);
}
export function dodecatemoriaLongitude(longitude) {
  return normalize360(longitude * 13);
}

/**
 * Geometric house placement only. Cusps must be in forward zodiac order.
 * A longitude exactly on a cusp belongs to the house starting there.
 * Nonmonotone systems/polar exceptions require a different documented method.
 */
export function locateLongitudeInHouses(longitude, cusps) {
  const lon=normalize360(longitude);
  if (!Array.isArray(cusps)||cusps.length!==12)
    throw new AstrologyError('INVALID_CUSPS', 'Exactly twelve house cusp longitudes are required');
  // Array.from visits holes: Array#map would skip them and leak malformed cusp sets.
  const points=Array.from(cusps, (cusp) => {
    if (typeof cusp !== 'number' || !Number.isFinite(cusp))
      throw new AstrologyError('INVALID_CUSPS', 'Every house cusp must be a finite longitude');
    return normalize360(cusp);
  });
  const spans=points.map((v,i)=>normalize360(points[(i+1)%12]-v));
  if (spans.some(x=>x<=1e-10) || Math.abs(spans.reduce((a,b)=>a+b,0)-360)>1e-7)
    throw new AstrologyError('INVALID_CUSPS', 'House cusps must define one forward zodiac revolution');
  for(let i=0;i<12;i++){
    const dist=normalize360(lon-points[i]);
    if(dist < spans[i]) return Object.freeze({house:i+1, startDeg:points[i], endDeg:points[(i+1)%12], distanceFromCuspDeg:dist});
  }
  throw new AstrologyError('INVALID_CUSPS','Unable to place longitude in house intervals');
}

/**
 * Normalize a house-system identifier without calculating astronomical angles.
 * Legacy Italian labels are accepted only under an explicit compatibility profile.
 * 'egizia' means Vehlow in the historical VirgoStars adapter, not a
 * universally defined Egyptian house system.
 */
export function resolveHouseSystem(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'House system options must be an object');
  const { houseSystem, calculationProfile } = input;
  if (!['CANONICAL_V1', 'VIRGOSTARS_LEGACY_V1'].includes(calculationProfile))
    throw new AstrologyError('INVALID_PROFILE', 'Explicit supported calculation profile required');
  const canonical = ['VEHLOW', 'PLACIDUS', 'KOCH', 'REGIOMONTANUS', 'PORPHYRY'];
  if (typeof houseSystem !== 'string' || !houseSystem.trim())
    throw new AstrologyError('INVALID_HOUSE_SYSTEM', 'Explicit house system required');
  if (canonical.includes(houseSystem))
    return Object.freeze({ houseSystem, calculationProfile });
  const legacy = Object.freeze({
    egizia: 'VEHLOW',
    placido: 'PLACIDUS',
    koch: 'KOCH',
    'regio-montano': 'REGIOMONTANUS',
    porfirio: 'PORPHYRY'
  });
  if (calculationProfile === 'VIRGOSTARS_LEGACY_V1' &&
      Object.hasOwn(legacy, houseSystem))
    return Object.freeze({ houseSystem: legacy[houseSystem], calculationProfile });
  throw new AstrologyError('INVALID_HOUSE_SYSTEM',
    'Unknown house system or legacy label without explicit legacy profile');
}

/**
 * Explicit house-placement compatibility gate. Cusp intervals are geometric
 * only; historical Swiss houses_pos is a distinct, currently unsupported
 * method and must never silently fall back to cusp placement.
 */
export function resolveHousePlacementPolicy(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'House placement options must be an object');
  const { houseSystem, calculationProfile, placementMethod } = input;
  const resolved = resolveHouseSystem({ houseSystem, calculationProfile });
  if (placementMethod === 'LEGACY_HOUSES_POS') {
    if (calculationProfile !== 'VIRGOSTARS_LEGACY_V1')
      throw new AstrologyError('INVALID_HOUSE_PLACEMENT', 'Legacy houses_pos requires legacy profile');
    throw new AstrologyError('UNSUPPORTED_HOUSE_PLACEMENT',
      'Historical houses_pos needs separate validated implementation; cusp intervals are not equivalent');
  }
  if (placementMethod !== 'CUSP_INTERVAL')
    throw new AstrologyError('INVALID_HOUSE_PLACEMENT', 'Explicit supported house placement method required');
  return Object.freeze({ ...resolved, placementMethod });
}

/**
 * Assign a longitude to a house only after explicitly resolving its method.
 * Caller supplies already-computed, validated cusps: no astronomy is performed.
 * Historical houses_pos remains unsupported and cannot fall back silently.
 */
export function locateLongitudeWithHousePolicy(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'House placement input must be an object');
  const { longitudeDeg, cusps, houseSystem, calculationProfile, placementMethod } = input;
  const policy = resolveHousePlacementPolicy({ houseSystem, calculationProfile, placementMethod });
  const placement = locateLongitudeInHouses(longitudeDeg, cusps);
  return Object.freeze({ ...policy, ...placement });
}


/**
 * Validate an externally computed cusp set before house placement.
 * This does not calculate angles or infer a house system from cusp geometry.
 * A Rust/WASM adapter must explicitly declare the requested method.
 */
export function validateHouseCuspSet(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'House cusp set must be an object');
  const { houseSystem, calculationProfile, cusps, metadata } = input;
  const policy = resolveHouseSystem({ houseSystem, calculationProfile });
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
    throw new AstrologyError('INVALID_HOUSE_METADATA', 'House cusp metadata required');
  if (metadata.houseSystem !== policy.houseSystem)
    throw new AstrologyError('INCOMPATIBLE_HOUSE_SYSTEM', 'Cusp system differs from requested house system');
  if (metadata.placementMethod !== 'CUSP_INTERVAL')
    throw new AstrologyError('UNSUPPORTED_HOUSE_PLACEMENT', 'Only validated cusp intervals are supported');
  if (!Array.isArray(cusps) || cusps.length !== 12)
    throw new AstrologyError('INVALID_CUSPS', 'Exactly twelve cusp longitudes required');
  const snapshot = Object.freeze(Array.from(cusps, (cusp) => {
    if (typeof cusp !== 'number' || !Number.isFinite(cusp))
      throw new AstrologyError('INVALID_CUSPS', 'Every house cusp must be a finite longitude');
    return normalize360(cusp);
  }));
  // Reuse the existing forward-order gate, including wrap-around and zero spans.
  locateLongitudeInHouses(snapshot[0], snapshot);
  return Object.freeze({
    ...policy, placementMethod: 'CUSP_INTERVAL', cusps: snapshot,
    metadata: Object.freeze({ houseSystem: policy.houseSystem, placementMethod: 'CUSP_INTERVAL' })
  });
}


/** Verify that externally calculated house cusps match a chart context. No astronomy. */
export function validateHouseCuspContext(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'House context options must be an object');
  const { chart, cuspSet } = input;
  if (!chart || !cuspSet || typeof chart !== 'object' || Array.isArray(chart) ||
      typeof cuspSet !== 'object' || Array.isArray(cuspSet))
    throw new AstrologyError('INVALID_ARGUMENT', 'Chart and cusp set are required');
  const { datetimeUtc, latitudeDeg, longitudeDegEast,
    ephemerisProvenance: chartProvenanceSource } = chart;
  if (typeof datetimeUtc !== 'string' || !Number.isFinite(Date.parse(datetimeUtc)) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(datetimeUtc) || new Date(datetimeUtc).toISOString().slice(0,19) !== datetimeUtc.slice(0,19))
    throw new AstrologyError('INVALID_UTC', 'Valid explicit UTC instant required');
  finite(latitudeDeg, 'latitudeDeg');
  finite(longitudeDegEast, 'longitudeDegEast');
  if (latitudeDeg < -90 || latitudeDeg > 90 || longitudeDegEast < -180 || longitudeDegEast > 180)
    throw new AstrologyError('INVALID_COORDINATES', 'Chart coordinates outside valid bounds');
  // Snapshots must be the values we validate AND publish. Accessors on the
  // chart or external cusp set must not change provenance between those steps.
  const { houseSystem, calculationProfile, cusps, metadata: metadataSource } = cuspSet;
  if (!metadataSource || typeof metadataSource !== 'object' || Array.isArray(metadataSource))
    throw new AstrologyError('INVALID_HOUSE_METADATA', 'House metadata required');
  const metadata = Object.freeze({ ...metadataSource });
  if (metadata.datetimeUtc !== datetimeUtc ||
      metadata.latitudeDeg !== latitudeDeg ||
      metadata.longitudeDegEast !== longitudeDegEast)
    throw new AstrologyError('INCOMPATIBLE_HOUSE_CONTEXT', 'House cusp date or location differs from chart');
  const keys = ['engineVersion', 'kernelSetId', 'timeModel'];
  const cuspProvenanceSource = metadata.ephemerisProvenance;
  if (!chartProvenanceSource || typeof chartProvenanceSource !== 'object' || Array.isArray(chartProvenanceSource) ||
      !cuspProvenanceSource || typeof cuspProvenanceSource !== 'object' || Array.isArray(cuspProvenanceSource))
    throw new AstrologyError('INVALID_HOUSE_METADATA', 'Explicit chart and house provenance required');
  const chartProvenance = Object.freeze({ ...chartProvenanceSource });
  const cuspProvenance = Object.freeze({ ...cuspProvenanceSource });
  for (const key of keys) {
    const a = chartProvenance[key], b = cuspProvenance[key];
    if (typeof a !== 'string' || !a.trim() || typeof b !== 'string' || !b.trim())
      throw new AstrologyError('INVALID_HOUSE_METADATA', 'Complete nonempty provenance required');
    if (a !== b)
      throw new AstrologyError('INCOMPATIBLE_HOUSE_CONTEXT', 'House cusp provenance differs from chart');
  }
  const validated = validateHouseCuspSet({ houseSystem, calculationProfile, cusps,
    metadata: { ...metadata, ephemerisProvenance: cuspProvenance } });
  return Object.freeze({
    ...validated,
    metadata: Object.freeze({
      ...validated.metadata, datetimeUtc, latitudeDeg, longitudeDegEast,
      ephemerisProvenance: Object.freeze(Object.fromEntries(
        keys.map(key => [key, chartProvenance[key]])))
    })
  });
}


/**
 * Add geometric house placements to a synthetic natal result without changing
 * the provider result. Requires an explicitly known birth time and matching
 * externally computed cusp context. Never synthesizes ascendant or angles.
 */
export function placeNatalBodiesInHouses(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'Natal house placement options must be an object');
  const { chart, cuspSet, birthTimeKnown } = input;
  if (birthTimeKnown !== true)
    throw new AstrologyError('BIRTH_TIME_REQUIRED', 'House placement requires an explicitly known birth time');
  if (!chart || typeof chart !== 'object' || Array.isArray(chart))
    throw new AstrologyError('INVALID_ARGUMENT', 'Chart must contain named body positions');
  // Read the chart's body collection and enumerable entries once. Accessors
  // must not swap the bodies between validation and house assignment.
  const chartBodies = chart.bodies;
  if (!chartBodies || typeof chartBodies !== 'object' || Array.isArray(chartBodies))
    throw new AstrologyError('INVALID_ARGUMENT', 'Chart must contain named body positions');
  const bodyEntries = Object.entries(chartBodies);
  if (bodyEntries.length === 0)
    throw new AstrologyError('INVALID_ARGUMENT', 'Chart must contain named body positions');
  const validated = validateHouseCuspContext({ chart, cuspSet });
  const placements = Object.create(null);
  for (const [name, body] of bodyEntries) {
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new AstrologyError('INVALID_POINT', 'Body must be a non-array object whose identifier matches its chart key');
    // Snapshot each mutable body field exactly once. A getter cannot validate
    // one longitude and silently publish a different house placement.
    const { name: suppliedName, longitudeDeg } = body;
    if (suppliedName !== name)
      throw new AstrologyError('INVALID_POINT', 'Body must be a non-array object whose identifier matches its chart key');
    if (typeof longitudeDeg !== 'number' || !Number.isFinite(longitudeDeg))
      throw new AstrologyError('INVALID_POINT', 'Body longitude must be a finite number');
    placements[name] = locateLongitudeWithHousePolicy({
      longitudeDeg, cusps: validated.cusps,
      houseSystem: validated.houseSystem,
      calculationProfile: validated.calculationProfile,
      placementMethod: validated.placementMethod
    });
  }
  return Object.freeze({
    houseSystem: validated.houseSystem,
    calculationProfile: validated.calculationProfile,
    placementMethod: validated.placementMethod,
    metadata: validated.metadata,
    placements: Object.freeze(placements)
  });
}

function point(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p) || typeof p.name!=='string' || !p.name.trim())
    throw new AstrologyError('INVALID_POINT', 'Every point requires a nonempty name');
  if (p.type != null && (typeof p.type !== 'string' || !p.type.trim()))
    throw new AstrologyError('INVALID_POINT', 'Point type must be a nonempty string when supplied');
  if (typeof p.longitudeDeg !== 'number' || !Number.isFinite(p.longitudeDeg))
    throw new AstrologyError('INVALID_POINT', 'Point longitude must be a finite number');
  return Object.freeze({name:p.name,longitudeDeg:normalize360(p.longitudeDeg),type:p.type??'body'});
}
function definition(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d) || typeof d.id!=='string' || !d.id.trim())
    throw new AstrologyError('INVALID_ASPECT', 'Aspect requires an id');
  if (typeof d.angleDeg !== 'number' || !Number.isFinite(d.angleDeg) ||
      typeof d.maxOrbDeg !== 'number' || !Number.isFinite(d.maxOrbDeg))
    throw new AstrologyError('INVALID_ASPECT', 'Aspect angle and maximum orb must be finite numbers');
  if(d.angleDeg<0||d.angleDeg>180||d.maxOrbDeg<0||d.maxOrbDeg>180)
    throw new AstrologyError('INVALID_ASPECT','Aspect angle and maximum orb must each be within 0..180 degrees');
  return Object.freeze({id:d.id,angleDeg:d.angleDeg,maxOrbDeg:d.maxOrbDeg});
}
/**
 * Directional cross-aspect facts; zero symbolic interpretation claims.
 * No implicit aspect definitions or orb limits.
 */
export function calculateCrossAspects(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'Cross-aspect options must be an object');
  const { direction, sourcePoints, targetPoints, aspectDefinitions } = input;
  if(!['A_TO_B','B_TO_A','SKY_TO_NATAL'].includes(direction))
    throw new AstrologyError('INVALID_DIRECTION','Explicit A_TO_B/B_TO_A/SKY_TO_NATAL direction is required');
  if(!Array.isArray(sourcePoints)||!Array.isArray(targetPoints)||!Array.isArray(aspectDefinitions))
    throw new AstrologyError('INVALID_ARGUMENT','All points and aspectDefinitions must be arrays');
  // Array.from visits sparse array holes; Array#map would silently skip them.
  const src=Array.from(sourcePoints, point),dst=Array.from(targetPoints, point),defs=Array.from(aspectDefinitions, definition);
  // Aspect IDs identify configured rules in downstream charts; duplicates are ambiguous.
  if (new Set(defs.map(aspect => aspect.id)).size !== defs.length)
    throw new AstrologyError('INVALID_ASPECT', 'Aspect definition IDs must be unique');
  const matches=[];
  for(const source of src) for(const target of dst) for(const aspect of defs) {
    const actualAngleDeg=angularSeparation(source.longitudeDeg,target.longitudeDeg);
    const signedOrbDeg=actualAngleDeg-aspect.angleDeg;
    if(Math.abs(signedOrbDeg)<=aspect.maxOrbDeg+1e-12)
      matches.push(Object.freeze({direction,source,target,aspectId:aspect.id,exactAngleDeg:aspect.angleDeg,
        actualAngleDeg,signedOrbDeg,absoluteOrbDeg:Math.abs(signedOrbDeg),configuredMaxOrbDeg:aspect.maxOrbDeg}));
  }
  return Object.freeze(matches);
}

/**
 * Experimental provider boundary. Providers must supply apparent geocentric
 * ecliptic-of-date positions. Current VirgoStars Ephemeris SPK prototype only
 * supplies geometric J2000 vectors and therefore CANNOT satisfy this yet.
 */
export async function calculateNatalWithProvider(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'Natal calculation options must be an object');
  const { datetimeUtc, latitudeDeg, longitudeDegEast, bodyNames, provider } = input;
  // Date.parse may normalize impossible calendar dates (for example February 30).
  // Compare the canonical UTC calendar/clock fields before asking the provider.
  if (typeof datetimeUtc !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(datetimeUtc) ||
      !Number.isFinite(Date.parse(datetimeUtc)) ||
      new Date(datetimeUtc).toISOString().slice(0, 19) !== datetimeUtc.slice(0, 19))
    throw new AstrologyError('INVALID_UTC', 'Explicit valid ISO UTC calendar instant ending Z is required');
  finite(latitudeDeg, 'latitudeDeg'); finite(longitudeDegEast, 'longitudeDegEast');
  if (latitudeDeg < -90 || latitudeDeg > 90 || longitudeDegEast < -180 || longitudeDegEast > 180)
    throw new AstrologyError('INVALID_COORDINATES', 'Geographic coordinates outside valid bounds');
  if (!Array.isArray(bodyNames) || bodyNames.length === 0 || bodyNames.length > 32 ||
      Array.from(bodyNames).some(n => typeof n !== 'string' || !n.trim()) || new Set(bodyNames).size !== bodyNames.length)
    throw new AstrologyError('INVALID_BODIES', '1..32 unique named bodies required');
  if (!provider || (typeof provider !== 'object' && typeof provider !== 'function') ||
      Array.isArray(provider))
    throw new AstrologyError('MISSING_PROVIDER', 'Explicit independent ephemeris provider required');
  // Pin one callable before awaiting any body. Reentrant adapters and getters
  // must not switch implementations between provider requests.
  const getGeocentricEcliptic = provider.getGeocentricEcliptic;
  if (typeof getGeocentricEcliptic !== 'function')
    throw new AstrologyError('MISSING_PROVIDER', 'Explicit independent ephemeris provider required');
  // Snapshot validated identifiers before awaiting a potentially reentrant provider.
  // The caller may mutate its array while an earlier body request is pending.
  const requestedBodyNames = Object.freeze([...bodyNames]);
  // Null prototype prevents names such as '__proto__' from mutating the result map.
  const bodies = Object.create(null);
  // Every position in one chart must come from the same optional engine/kernel/time model.
  // Missing provenance is tolerated for existing mock providers but may not be mixed
  // with present provenance in another body's response.
  const provenanceKeys = ['engineVersion', 'kernelSetId', 'timeModel'];
  let expectedProvenance = null;
  for (const bodyName of requestedBodyNames) {
    // Each call receives its own immutable request: adapters cannot rewrite the
    // requested frame, correction policy or body identifier by accident.
    const request = Object.freeze({ datetimeUtc, bodyName, corrections:'APPARENT', frame:'ECLIPTIC_OF_DATE' });
    const state = await Reflect.apply(getGeocentricEcliptic, provider, [request]);
    if (!state || typeof state !== 'object' || Array.isArray(state))
      throw new AstrologyError('INCOMPATIBLE_EPHEMERIS', 'Provider must return apparent Earth-centered ecliptic-of-date coordinates');
    // Snapshot provider-controlled fields once: getters and reentrant adapters
    // must not change the payload after validation and before chart assembly.
    const metadataSource = state.metadata;
    if (!metadataSource || typeof metadataSource !== 'object' || Array.isArray(metadataSource))
      throw new AstrologyError('INCOMPATIBLE_EPHEMERIS', 'Provider must return apparent Earth-centered ecliptic-of-date coordinates');
    const metadata = Object.freeze({ ...metadataSource });
    const { longitudeDeg, latitudeDeg, longitudeSpeedDegPerDay } = state;
    if (metadata.center !== 'EARTH' || metadata.frame !== 'ECLIPTIC_OF_DATE' ||
        metadata.corrections !== 'APPARENT')
      throw new AstrologyError('INCOMPATIBLE_EPHEMERIS', 'Provider must return apparent Earth-centered ecliptic-of-date coordinates');
    if (typeof longitudeDeg !== 'number' || !Number.isFinite(longitudeDeg) ||
        typeof latitudeDeg !== 'number' || !Number.isFinite(latitudeDeg))
      throw new AstrologyError('INVALID_EPHEMERIS_RESULT', 'Provider longitude and latitude must be finite numbers');
    if (latitudeDeg < -90 || latitudeDeg > 90)
      throw new AstrologyError('INVALID_EPHEMERIS_RESULT', 'Ecliptic latitude must be within -90..90 degrees');
    if (longitudeSpeedDegPerDay !== undefined && longitudeSpeedDegPerDay !== null &&
        (typeof longitudeSpeedDegPerDay !== 'number' || !Number.isFinite(longitudeSpeedDegPerDay)))
      throw new AstrologyError('INVALID_EPHEMERIS_RESULT', 'Provider longitude speed must be a finite number when supplied');
    const provenance = provenanceKeys.map(key => {
      const value = metadata[key];
      if (value === undefined || value === null) return null;
      if (typeof value !== 'string' || !value.trim())
        throw new AstrologyError('INVALID_EPHEMERIS_RESULT', `${key} must be a nonempty string when provided`);
      return value;
    });
    // A partly identified ephemeris cannot be pinned or audited reliably.
    // Preserve all-absent provenance for legacy synthetic mocks only.
    if (provenance.some(value => value !== null) && provenance.some(value => value === null))
      throw new AstrologyError('INVALID_EPHEMERIS_RESULT',
        'Provider provenance must be complete when any provenance field is supplied');
    if (expectedProvenance !== null &&
        provenance.some((value, index) => value !== expectedProvenance[index]))
      throw new AstrologyError('INCONSISTENT_EPHEMERIS',
        'Chart bodies must use one ephemeris engine version, kernel set and time model');
    expectedProvenance ??= provenance;
    const lon = normalize360(longitudeDeg);
    bodies[bodyName] = Object.freeze({ name:bodyName, longitudeDeg:lon, latitudeDeg,
      zodiacSignIndex:zodiacSignIndex(lon), longitudeSpeedDegPerDay:
        typeof longitudeSpeedDegPerDay === 'number' && Number.isFinite(longitudeSpeedDegPerDay)
          ? longitudeSpeedDegPerDay : null,
      ephemerisMetadata:metadata });
  }
  return Object.freeze({ contract:'NatalChartResult', contractVersion:'0.1.0-experimental',
    datetimeUtc, latitudeDeg, longitudeDegEast, bodies:Object.freeze(bodies),
    ephemerisProvenance:Object.freeze(Object.fromEntries(
      provenanceKeys.map((key, index) => [key, expectedProvenance[index]]))),
    houses:null, angles:null,
    warnings:Object.freeze([Object.freeze({code:'houses_unavailable',message:'House algorithms not yet integrated'})]) });
}
