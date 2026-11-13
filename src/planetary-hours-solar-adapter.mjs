/**
 * Pure, versioned handshake for a FUTURE VirgoStars Ephemeris solar event
 * producer. This adapter does NOT call Rust, compute rise/set, or authenticate
 * source metadata. No provider is implemented by this module.
 */
import { buildPlanetaryHours } from './planetary-hours.mjs';

export class SolarEventAdapterError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SolarEventAdapterError';
    this.code = code;
  }
}

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SOURCE_EVIDENCE = 'CALLER_ASSERTED_NOT_VERIFIED';

function error(code, reason) {
  throw new SolarEventAdapterError(code, reason);
}

function ownRecord(value, keys, code) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    error(code, 'Expected a record');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    error(code, 'Record must not inherit an application-defined prototype');
  }
  const actual = Object.keys(value);
  if (actual.length !== keys.length ||
      !keys.every(key => Object.hasOwn(value, key)) ||
      actual.some(key => !keys.includes(key))) {
    error(code, 'Unexpected, inherited, or missing fields');
  }
}

function identifier(value, name, code) {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) {
    error(code, name + ' must be a nonempty bounded identifier');
  }
  return value;
}

function observerFrom(value) {
  ownRecord(value, ['latitudeDeg', 'longitudeDegEast', 'elevationMeters'],
    'INVALID_OBSERVER');
  const { latitudeDeg, longitudeDegEast, elevationMeters } = value;
  if (![latitudeDeg, longitudeDegEast, elevationMeters].every(
    n => typeof n === 'number' && Number.isFinite(n)
  ) || latitudeDeg < -90 || latitudeDeg > 90 ||
      longitudeDegEast < -180 || longitudeDegEast > 180 ||
      elevationMeters < -500 || elevationMeters > 10000) {
    error('INVALID_OBSERVER', 'Finite WGS84-like geographic bounds required');
  }
  return Object.freeze({ latitudeDeg, longitudeDegEast, elevationMeters });
}

function modelFrom(value) {
  ownRecord(value,
    ['horizonDefinitionId', 'refractionModelId', 'eventAlgorithmId'],
    'INVALID_MODEL');
  return Object.freeze({
    horizonDefinitionId: identifier(value.horizonDefinitionId,
      'horizonDefinitionId', 'INVALID_MODEL'),
    refractionModelId: identifier(value.refractionModelId,
      'refractionModelId', 'INVALID_MODEL'),
    eventAlgorithmId: identifier(value.eventAlgorithmId,
      'eventAlgorithmId', 'INVALID_MODEL'),
  });
}

function sourceFrom(value) {
  ownRecord(value,
    ['engineId', 'engineVersion', 'kernelSetId', 'timeModelId', 'evidence'],
    'INVALID_SOURCE');
  if (value.engineId !== 'VIRGOSTARS_EPHEMERIS' ||
      value.evidence !== SOURCE_EVIDENCE) {
    error('INVALID_SOURCE', 'Only caller-asserted VirgoStars source descriptors are accepted');
  }
  return Object.freeze({
    engineId: value.engineId,
    engineVersion: identifier(value.engineVersion, 'engineVersion', 'INVALID_SOURCE'),
    kernelSetId: identifier(value.kernelSetId, 'kernelSetId', 'INVALID_SOURCE'),
    timeModelId: identifier(value.timeModelId, 'timeModelId', 'INVALID_SOURCE'),
    evidence: SOURCE_EVIDENCE,
  });
}

/**
 * Converts an explicit, caller-supplied solar event snapshot into symbolic
 * planetary-hour facts. Validation is structural, not astronomical.
 *
 * Events form a strict discriminated union:
 * AVAILABLE: {availability,sunriseUtc,sunsetUtc,nextSunriseUtc}
 * UNAVAILABLE: {availability,reason}
 */
export function preparePlanetaryHoursFromSolarEvents(input) {
  ownRecord(input, ['weekday', 'observer', 'model', 'source', 'events'], 'INVALID_INPUT');
  const observer = observerFrom(input.observer);
  const model = modelFrom(input.model);
  const source = sourceFrom(input.source);
  const events = input.events;
  if (events === null || typeof events !== 'object' || Array.isArray(events)) {
    error('INVALID_EVENTS', 'Explicit available or unavailable events required');
  }
  if (events.availability === 'AVAILABLE') {
    ownRecord(events, ['availability', 'sunriseUtc', 'sunsetUtc', 'nextSunriseUtc'],
      'INVALID_EVENTS');
  } else if (events.availability === 'UNAVAILABLE') {
    ownRecord(events, ['availability', 'reason'], 'INVALID_EVENTS');
  } else {
    error('INVALID_EVENTS', 'Unknown sun-event availability');
  }
  // This delegate also enforces weekday, UTC, strict event ordering and polar
  // handling. We deliberately retain its UNVERIFIED sunEventsEvidence label.
  const schedule = buildPlanetaryHours({
    weekday: input.weekday,
    ...events,
  });
  return Object.freeze({
    contract: 'PlanetaryHoursSolarAdapter',
    contractVersion: '0.1.0-experimental',
    scientificEvidence: 'CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED',
    weekday: input.weekday,
    observer,
    model,
    source,
    schedule,
  });
}
