/**
 * F3 experimental: a desktop-friendly placement matrix for 2 or 3 explicitly
 * provided house methods with one caller-asserted position snapshot.
 *
 * Reuses the existing paired point/house source gate for every additional
 * method. No astronomy, house-cusp algorithms, or provenance authentication.
 */
import { AstrologyError } from './index.mjs';
import { compareHousePlacementsWithSourcedPoints } from './sourced-house-points.mjs';

const fail = (code, message) => { throw new AstrologyError(code, message); };
const plain = value => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype ||
  Object.getPrototypeOf(value) === null);
const ROOT_KEYS = new Set(['birthTimeKnown', 'methods', 'positions']);

export function buildSourcedHousePlacementMatrix(input) {
  if (!plain(input) || Object.keys(input).some(key => !ROOT_KEYS.has(key))) {
    fail('INVALID_HOUSE_MATRIX', 'Expected explicit methods and sourced positions');
  }
  if (input.birthTimeKnown !== true) {
    fail('BIRTH_TIME_UNKNOWN', 'A known birth time is required to compare house systems');
  }
  const { methods, positions } = input;
  if (!Array.isArray(methods) || methods.length < 2 || methods.length > 3 ||
      Array.from({length:methods.length}, (_, i) => i).some(i => !Object.hasOwn(methods, i))) {
    fail('INVALID_HOUSE_MATRIX', 'Supply a dense list of two or three house methods');
  }
  const names = [];
  const seen = new Set();
  for (const side of methods) {
    if (!plain(side) || !plain(side.snapshot) ||
        typeof side.snapshot.houseSystem !== 'string') {
      fail('INVALID_HOUSE_MATRIX', 'Every method must declare a house snapshot');
    }
    const name = side.snapshot.houseSystem;
    if (seen.has(name)) {
      fail('DUPLICATE_HOUSE_METHOD', 'House methods must be unique in a comparison matrix');
    }
    seen.add(name);
    names.push(name);
  }
  // The parent pairwise implementation is the single authority for source,
  // zodiac/UTC, point IDs, cusp ordering and exact boundary assignment.
  const comparisons = [];
  for (let i = 1; i < methods.length; i++) {
    comparisons.push(compareHousePlacementsWithSourcedPoints({
      birthTimeKnown: true,
      left: methods[0],
      right: methods[i],
      positions,
    }));
  }
  const baselineFacts = comparisons[0].houseComparison.comparison.facts;
  const methodNames = Object.freeze(names.slice());
  const rows = Object.freeze(baselineFacts.map((fact, index) => {
    const placements = Object.freeze([
      Object.freeze({houseSystem: methodNames[0], house: fact.leftHouse}),
      ...comparisons.map((result, j) => {
        const rightFact = result.houseComparison.comparison.facts[index];
        if (rightFact.id !== fact.id || rightFact.longitudeDeg !== fact.longitudeDeg) {
          fail('INCOMPATIBLE_HOUSE_MATRIX', 'Paired comparisons disagree on point identity or position');
        }
        return Object.freeze({houseSystem: methodNames[j + 1], house: rightFact.rightHouse});
      }),
    ]);
    const changed = placements.some(placement => placement.house !== placements[0].house);
    return Object.freeze({id: fact.id, longitudeDeg: fact.longitudeDeg, placements, changed});
  }));
  const changedPointIds = Object.freeze(rows.filter(row => row.changed).map(row => row.id));
  return Object.freeze({
    contract: 'SourcedHousePlacementMatrix',
    contractVersion: '0.1.0-experimental',
    status: 'MATCHING_CALLER_ASSERTED_SOURCES_NOT_INDEPENDENTLY_VERIFIED',
    pointProvenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    source: comparisons[0].source,
    methodNames,
    rows,
    changedPointIds,
    pointCount: rows.length,
    changedCount: changedPointIds.length,
  });
}
