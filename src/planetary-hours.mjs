/**
 * Experimental, astronomy-free Chaldean planetary hour schedule.
 * Sun events and the local civil weekday are supplied by the caller.
 * No sunrise computation, timezone inference, ephemeris verification or readings.
 */
export class PlanetaryHoursError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PlanetaryHoursError';
    this.code = code;
  }
}

const WEEKDAY_RULER = Object.freeze({
  SUNDAY: 'SUN',
  MONDAY: 'MOON',
  TUESDAY: 'MARS',
  WEDNESDAY: 'MERCURY',
  THURSDAY: 'JUPITER',
  FRIDAY: 'VENUS',
  SATURDAY: 'SATURN',
});
const CHALDEAN_ORDER = Object.freeze([
  'SATURN', 'JUPITER', 'MARS', 'SUN', 'VENUS', 'MERCURY', 'MOON',
]);
const UNAVAILABLE_REASONS = Object.freeze([
  'POLAR_DAY', 'POLAR_NIGHT', 'SUN_EVENTS_UNAVAILABLE',
]);
const UTC_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/;
const MAX_SEGMENT_MS = 24 * 60 * 60 * 1000;
const MIN_SEGMENT_MS = 12; // Each of the 12 unequal hours needs at least one millisecond.

function fail(code, message) {
  throw new PlanetaryHoursError(code, message);
}

function assertShape(value, fields) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail('INVALID_INPUT', 'Expected a planetary hours input object');
  }
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  if (actual.length !== expected.length || actual.some((field, i) => field !== expected[i])) {
    fail('INVALID_INPUT', `Expected exactly these input fields: ${expected.join(', ')}`);
  }
}

function parseUtc(value, field) {
  if (typeof value !== 'string') fail('INVALID_UTC', `${field} must be an ISO UTC string`);
  const match = UTC_PATTERN.exec(value);
  if (!match || match[1].startsWith('0000-')) {
    fail('INVALID_UTC', `${field} must be YYYY-MM-DDTHH:mm:ss[.SSS]Z`);
  }
  const canonical = `${match[1]}.${(match[2] ?? '').padEnd(3, '0')}Z`;
  const milliseconds = Date.parse(canonical);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== canonical) {
    fail('INVALID_UTC', `${field} is not a real UTC instant`);
  }
  return milliseconds;
}

function freezeResult(fields) {
  return Object.freeze({
    contract: 'PlanetaryHoursSchedule',
    contractVersion: '0.1.0-experimental',
    method: 'CHALDEAN_UNEQUAL_HOURS',
    sunEventsEvidence: 'CALLER_SUPPLIED_NOT_ASTRONOMICALLY_VERIFIED',
    ...fields,
  });
}

/**
 * Build 12 unequal daylight and 12 unequal nighttime hours from three UTC
 * events. `weekday` is the local *civil* weekday of sunrise, NOT the UTC day.
 * For polar conditions, return an explicit unavailable result without hours.
 */
export function buildPlanetaryHours(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    fail('INVALID_INPUT', 'Expected a planetary hours input object');
  }
  const availability = input.availability;
  const weekday = input.weekday;
  if (availability !== 'AVAILABLE' && availability !== 'UNAVAILABLE') {
    fail('INVALID_AVAILABILITY', 'Availability must be AVAILABLE or UNAVAILABLE');
  }
  if (!Object.hasOwn(WEEKDAY_RULER, weekday)) {
    fail('INVALID_WEEKDAY', 'weekday must be an explicit local civil weekday');
  }

  if (availability === 'UNAVAILABLE') {
    assertShape(input, ['availability', 'weekday', 'reason']);
    const reason = input.reason;
    if (!UNAVAILABLE_REASONS.includes(reason)) {
      fail('INVALID_REASON', 'An explicit supported unavailability reason is required');
    }
    return freezeResult({
      availability: 'UNAVAILABLE', weekday: weekday,
      dayRuler: WEEKDAY_RULER[weekday], reason: reason,
      hours: Object.freeze([]),
    });
  }

  assertShape(input, ['availability', 'weekday', 'sunriseUtc', 'sunsetUtc', 'nextSunriseUtc']);
  const {sunriseUtc,sunsetUtc,nextSunriseUtc} = input;
  const sunriseMs = parseUtc(sunriseUtc, 'sunriseUtc');
  const sunsetMs = parseUtc(sunsetUtc, 'sunsetUtc');
  const nextSunriseMs = parseUtc(nextSunriseUtc, 'nextSunriseUtc');
  const dayLength = sunsetMs - sunriseMs;
  const nightLength = nextSunriseMs - sunsetMs;
  if (dayLength < MIN_SEGMENT_MS || nightLength < MIN_SEGMENT_MS ||
      dayLength >= MAX_SEGMENT_MS || nightLength >= MAX_SEGMENT_MS) {
    fail('INVALID_SUN_EVENTS', 'Events must ascend sunrise < sunset < next sunrise, with each segment under 24 hours');
  }

  const startRulerIndex = CHALDEAN_ORDER.indexOf(WEEKDAY_RULER[weekday]);
  const hours = [];
  for (let i = 0; i < 24; i += 1) {
    const day = i < 12;
    const segmentStart = day ? sunriseMs : sunsetMs;
    const length = day ? dayLength : nightLength;
    const segmentIndex = i % 12;
    // Integer millisecond boundaries eliminate overlap/gaps and preserve exact
    // original sunrise/sunset/next sunrise instants even for uneven durations.
    const startMs = segmentStart + Math.floor(length * segmentIndex / 12);
    const endMs = segmentStart + Math.floor(length * (segmentIndex + 1) / 12);
    hours.push(Object.freeze({
      number: i + 1,
      segment: day ? 'DAY' : 'NIGHT',
      segmentHour: segmentIndex + 1,
      ruler: CHALDEAN_ORDER[(startRulerIndex + i) % CHALDEAN_ORDER.length],
      startUtc: new Date(startMs).toISOString(),
      endUtc: new Date(endMs).toISOString(),
      durationMs: endMs - startMs,
    }));
  }

  return freezeResult({
    availability: 'AVAILABLE', weekday: weekday,
    dayRuler: WEEKDAY_RULER[weekday],
    sunriseUtc: new Date(sunriseMs).toISOString(),
    sunsetUtc: new Date(sunsetMs).toISOString(),
    nextSunriseUtc: new Date(nextSunriseMs).toISOString(),
    hours: Object.freeze(hours),
  });
}


function samePlainRecord(actual, expected) {
  if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) return false;
  const actualKeys = Object.keys(actual);
  const expectedKeys = Object.keys(expected);
  return actualKeys.length === expectedKeys.length &&
    expectedKeys.every(key => Object.hasOwn(actual, key) && actual[key] === expected[key]);
}

function matchesCanonicalSchedule(candidate, canonical) {
  if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
  const { hours: candidateHours, ...candidateFields } = candidate;
  const { hours: canonicalHours, ...canonicalFields } = canonical;
  // Array.prototype.every silently SKIPS holes. A forged sparse schedule
  // must not pass validation just because all remaining hours match.
  // Require an own "hours" field, all 24 own numerical indexes, and no
  // extra enumerable array properties (JSON round-trips remain supported).
  return Object.hasOwn(candidate, 'hours') &&
    samePlainRecord(candidateFields, canonicalFields) &&
    Array.isArray(candidateHours) &&
    candidateHours.length === canonicalHours.length &&
    Object.keys(candidateHours).length === canonicalHours.length &&
    canonicalHours.every((hour, index) =>
      Object.hasOwn(candidateHours, index) &&
      samePlainRecord(candidateHours[index], hour));
}

/**
 * Look up an exact UTC instant in a schedule from buildPlanetaryHours.
 * The schedule must match that builder's canonical facts, including when
 * serialized and restored. Revalidation is structural, not astronomical.
 * Intervals are half-open: [startUtc, endUtc).
 */
export function lookupPlanetaryHour(input) {
  assertShape(input, ['schedule', 'instantUtc']);
  const instantMs = parseUtc(input.instantUtc, 'instantUtc');
  const { schedule } = input;

  if (schedule === null || typeof schedule !== 'object' || Array.isArray(schedule)) {
    fail('INVALID_SCHEDULE', 'An existing PlanetaryHoursSchedule result is required');
  }
  let canonical;
  try {
    if (schedule.availability === 'AVAILABLE') {
      canonical = buildPlanetaryHours({
        availability: 'AVAILABLE', weekday: schedule.weekday,
        sunriseUtc: schedule.sunriseUtc, sunsetUtc: schedule.sunsetUtc,
        nextSunriseUtc: schedule.nextSunriseUtc,
      });
    } else if (schedule.availability === 'UNAVAILABLE') {
      canonical = buildPlanetaryHours({
        availability: 'UNAVAILABLE', weekday: schedule.weekday, reason: schedule.reason,
      });
    }
  } catch {
    fail('INVALID_SCHEDULE', 'Schedule has invalid or inconsistent values');
  }
  if (!canonical || !matchesCanonicalSchedule(schedule, canonical)) {
    fail('INVALID_SCHEDULE', 'Schedule does not match canonical planetary-hour facts');
  }

  const metadata = {
    contract: 'PlanetaryHourLookup',
    contractVersion: '0.1.0-experimental',
    instantUtc: new Date(instantMs).toISOString(),
    sunEventsEvidence: 'CALLER_SUPPLIED_NOT_ASTRONOMICALLY_VERIFIED',
  };
  if (canonical.availability === 'UNAVAILABLE') {
    return Object.freeze({
      ...metadata, status: 'UNAVAILABLE', reason: canonical.reason, hour: null,
    });
  }
  if (instantMs < Date.parse(canonical.sunriseUtc) ||
      instantMs >= Date.parse(canonical.nextSunriseUtc)) {
    return Object.freeze({ ...metadata, status: 'OUTSIDE_SCHEDULE', hour: null });
  }
  const hour = canonical.hours.find(item =>
    instantMs >= Date.parse(item.startUtc) && instantMs < Date.parse(item.endUtc));
  if (!hour) fail('INVALID_SCHEDULE', 'Scheduled instant does not match any hour');
  const elapsedMs = instantMs - Date.parse(hour.startUtc);
  const remainingMs = Date.parse(hour.endUtc) - instantMs;
  return Object.freeze({
    ...metadata, status: 'FOUND', hour,
    elapsedMs, remainingMs,
  });
}
