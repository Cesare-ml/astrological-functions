/**
 * Experimental facts-only parallel / contra-parallel contacts.
 * Declinations must be supplied by a compatible, externally validated ephemeris.
 * This module does not transform coordinate frames or calculate astronomy.
 */
import { AstrologyError } from './index.mjs';

const DIRECTIONS = new Set(['A_TO_B', 'B_TO_A', 'SKY_TO_NATAL']);
const CONTACT_IDS = new Set(['PARALLEL', 'CONTRA_PARALLEL']);

function validatePoints(points, field) {
  if (!Array.isArray(points) || points.length < 1 || points.length > 32) {
    throw new AstrologyError('INVALID_DECLINATION_POINTS', `${field} requires 1..32 points`);
  }
  const length = points.length;
  const names = new Set();
  const values = [];
  for (let index = 0; index < length; index++) {
    if (!Object.hasOwn(points, index)) {
      throw new AstrologyError('INVALID_DECLINATION_POINT', `${field}[${index}] must be a populated point`);
    }
    const point = points[index];
    if (!point || typeof point !== 'object' || Array.isArray(point)) {
      throw new AstrologyError('INVALID_DECLINATION_POINT', `${field}[${index}] must be a point`);
    }
    const { name, declinationDeg } = point;
    if (typeof name !== 'string' || !name.trim() || names.has(name) ||
        typeof declinationDeg !== 'number' || !Number.isFinite(declinationDeg) ||
        Math.abs(declinationDeg) > 90) {
      throw new AstrologyError('INVALID_DECLINATION_POINT', `${field}[${index}] must have a unique name and finite declination in [-90,90]`);
    }
    names.add(name);
    values.push(Object.freeze({ name, declinationDeg: declinationDeg === 0 ? 0 : declinationDeg }));
  }
  return Object.freeze(values);
}

function validateDefinitions(definitions) {
  if (!Array.isArray(definitions) || definitions.length < 1 || definitions.length > 2) {
    throw new AstrologyError('INVALID_DECLINATION_CONTACT', 'Explicitly configure 1..2 declination contact definitions');
  }
  const length = definitions.length;
  const ids = new Set();
  const values = [];
  for (let index = 0; index < length; index++) {
    if (!Object.hasOwn(definitions, index)) {
      throw new AstrologyError('INVALID_DECLINATION_CONTACT', `contactDefinitions[${index}] must be populated`);
    }
    const definition = definitions[index];
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
      throw new AstrologyError('INVALID_DECLINATION_CONTACT', `contactDefinitions[${index}] must be an object`);
    }
    const { id, maxOrbDeg } = definition;
    if (!CONTACT_IDS.has(id) || ids.has(id) ||
        typeof maxOrbDeg !== 'number' || !Number.isFinite(maxOrbDeg) ||
        maxOrbDeg < 0 || maxOrbDeg > 90) {
      throw new AstrologyError('INVALID_DECLINATION_CONTACT', `contactDefinitions[${index}] must use a unique PARALLEL/CONTRA_PARALLEL id and finite orb in [0,90]`);
    }
    ids.add(id);
    values.push(Object.freeze({ id, maxOrbDeg }));
  }
  return Object.freeze(values);
}

/**
 * PARALLEL compares equal signed declinations: source - target.
 * CONTRA_PARALLEL compares opposite signed declinations: source + target.
 * Exactly 0° is mathematically both; no hidden hemisphere or orb policy.
 * Results retain caller order and source -> target orientation.
 */
export function calculateDeclinationContacts(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new AstrologyError('INVALID_DECLINATION_ARGUMENT', 'An explicit options object is required');
  }
  const { direction, sourcePoints, targetPoints, contactDefinitions } = options;
  if (!DIRECTIONS.has(direction)) {
    throw new AstrologyError('INVALID_DECLINATION_DIRECTION', 'Explicit A_TO_B, B_TO_A or SKY_TO_NATAL direction is required');
  }
  const sources = validatePoints(sourcePoints, 'sourcePoints');
  const targets = validatePoints(targetPoints, 'targetPoints');
  const definitions = validateDefinitions(contactDefinitions);
  const contacts = [];
  for (const source of sources) {
    for (const target of targets) {
      for (const definition of definitions) {
        const rawOffset = definition.id === 'PARALLEL'
          ? source.declinationDeg - target.declinationDeg
          : source.declinationDeg + target.declinationDeg;
        const signedOffsetDeg = rawOffset === 0 ? 0 : rawOffset;
        const absoluteOrbDeg = Math.abs(signedOffsetDeg);
        if (absoluteOrbDeg <= definition.maxOrbDeg) {
          contacts.push(Object.freeze({
            direction,
            source,
            target,
            contactId: definition.id,
            signedOffsetDeg,
            absoluteOrbDeg,
            configuredMaxOrbDeg: definition.maxOrbDeg,
          }));
        }
      }
    }
  }
  return Object.freeze({
    contract: 'DeclinationContactsResult',
    methodVersion: 'DECLINATION_CONTACTS_V1',
    direction,
    sourcePointCount: sources.length,
    targetPointCount: targets.length,
    contactDefinitions: definitions,
    contacts: Object.freeze(contacts),
  });
}
