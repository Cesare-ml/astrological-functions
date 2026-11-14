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
  const names = new Set();
  return Object.freeze(points.map((point, index) => {
    if (!point || typeof point !== 'object' || Array.isArray(point) ||
        typeof point.name !== 'string' || !point.name.trim() || names.has(point.name) ||
        typeof point.declinationDeg !== 'number' || !Number.isFinite(point.declinationDeg) ||
        Math.abs(point.declinationDeg) > 90) {
      throw new AstrologyError('INVALID_DECLINATION_POINT', `${field}[${index}] must have a unique name and finite declination in [-90,90]`);
    }
    names.add(point.name);
    return Object.freeze({
      name: point.name,
      declinationDeg: point.declinationDeg === 0 ? 0 : point.declinationDeg,
    });
  }));
}

function validateDefinitions(definitions) {
  if (!Array.isArray(definitions) || definitions.length < 1 || definitions.length > 2) {
    throw new AstrologyError('INVALID_DECLINATION_CONTACT', 'Explicitly configure 1..2 declination contact definitions');
  }
  const ids = new Set();
  return Object.freeze(definitions.map((definition, index) => {
    if (!definition || typeof definition !== 'object' || Array.isArray(definition) ||
        !CONTACT_IDS.has(definition.id) || ids.has(definition.id) ||
        typeof definition.maxOrbDeg !== 'number' || !Number.isFinite(definition.maxOrbDeg) ||
        definition.maxOrbDeg < 0 || definition.maxOrbDeg > 90) {
      throw new AstrologyError('INVALID_DECLINATION_CONTACT', `contactDefinitions[${index}] must use a unique PARALLEL/CONTRA_PARALLEL id and finite orb in [0,90]`);
    }
    ids.add(definition.id);
    return Object.freeze({ id: definition.id, maxOrbDeg: definition.maxOrbDeg });
  }));
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
