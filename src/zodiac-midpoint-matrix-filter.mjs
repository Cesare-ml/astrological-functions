/**
 * Deterministic, geometry-only presentation filter over a completed
 * ZodiacMidpointContactMatrix snapshot. No new sky or midpoint calculations.
 */
import { AstrologyError } from './index.mjs';

function selection(names, available, field) {
  if (names === null) return null; // Explicit null means ALL.
  if (!Array.isArray(names)) {
    throw new AstrologyError('INVALID_MATRIX_FILTER_SELECTION', `${field} must be null or a dense array of known unique names`);
  }
  const selected = new Set();
  for (let i = 0; i < names.length; i++) {
    if (!Object.hasOwn(names, i) || typeof names[i] !== 'string' ||
        !names[i].trim() || names[i] !== names[i].trim() ||
        !available.has(names[i]) || selected.has(names[i])) {
      throw new AstrologyError('INVALID_MATRIX_FILTER_SELECTION', `${field} contains a missing, unknown, duplicate or malformed name`);
    }
    selected.add(names[i]);
  }
  return selected; // [] explicitly selects NO points.
}

/**
 * Filter the complete pair x target geometry snapshot with a new inclusive orb.
 * The filter may widen or narrow the original orb: all original angular
 * separations are retained in rows[].targetSweep.targets[].contacts.
 *
 * @param {{matrix:object, sourceNames:string[]|null, targetNames:string[]|null,
 *   maxOrbDeg:number, excludePairMembers:boolean}} input
 */
export function filterZodiacMidpointContactMatrix(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !['matrix', 'sourceNames', 'targetNames', 'maxOrbDeg', 'excludePairMembers']
        .every(name => Object.hasOwn(input, name))) {
    throw new AstrologyError('INVALID_MATRIX_FILTER', 'All five filter input fields must be explicitly supplied');
  }
  const {matrix, sourceNames, targetNames, maxOrbDeg, excludePairMembers} = input;
  if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix) ||
      matrix.contract !== 'ZodiacMidpointContactMatrix' ||
      matrix.contractVersion !== '0.1.0-experimental' ||
      !Array.isArray(matrix.sourceCatalog?.points) ||
      !Array.isArray(matrix.targetPoints) || !Array.isArray(matrix.rows)) {
    throw new AstrologyError('INVALID_MATRIX_FILTER_MATRIX', 'A completed compatible midpoint matrix is required');
  }
  if (typeof maxOrbDeg !== 'number' || !Number.isFinite(maxOrbDeg) ||
      maxOrbDeg < 0 || maxOrbDeg > 90) {
    throw new AstrologyError('INVALID_MATRIX_FILTER_ORB', 'Explicit inclusive orb must be finite and in [0, 90] degrees');
  }
  if (typeof excludePairMembers !== 'boolean') {
    throw new AstrologyError('INVALID_MATRIX_FILTER_POLICY', 'excludePairMembers must be an explicit boolean');
  }
  const availableSources = new Set(matrix.sourceCatalog.points.map(p => p?.name));
  const availableTargets = new Set(matrix.targetPoints.map(p => p?.name));
  const sources = selection(sourceNames, availableSources, 'sourceNames');
  const targets = selection(targetNames, availableTargets, 'targetNames');
  const rows = [];
  const matchedCells = [];
  let consideredCellCount = 0;
  let excludedPairMemberCount = 0;
  for (const row of matrix.rows) {
    if (!row || typeof row.firstName !== 'string' || typeof row.secondName !== 'string' ||
        !Array.isArray(row.targetSweep?.targets) || !row.midpointAxis ||
        !availableSources.has(row.firstName) || !availableSources.has(row.secondName)) {
      throw new AstrologyError('INVALID_MATRIX_FILTER_MATRIX', 'Midpoint matrix contains a malformed pair row');
    }
    if (sources !== null && (!sources.has(row.firstName) || !sources.has(row.secondName))) continue;
    const matchedTargets = [];
    for (const target of row.targetSweep.targets) {
      if (!target || typeof target.name !== 'string' || !availableTargets.has(target.name) ||
          !Array.isArray(target.contacts) || target.contacts.length !== 2 ||
          target.contacts.some(c => !c || typeof c.longitudeDeg !== 'number' ||
            !Number.isFinite(c.longitudeDeg) || typeof c.separationDeg !== 'number' ||
            !Number.isFinite(c.separationDeg) || c.separationDeg < 0 || c.separationDeg > 180)) {
        throw new AstrologyError('INVALID_MATRIX_FILTER_MATRIX', 'Midpoint matrix contains malformed target contact facts');
      }
      if (targets !== null && !targets.has(target.name)) continue;
      if (excludePairMembers && (target.name === row.firstName || target.name === row.secondName)) {
        excludedPairMemberCount++;
        continue;
      }
      consideredCellCount++;
      const matchedAxes = target.contacts
        .filter(c => c.separationDeg <= maxOrbDeg)
        .map(c => c.longitudeDeg);
      if (matchedAxes.length === 0) continue;
      const fact = Object.freeze({
        firstName: row.firstName,
        secondName: row.secondName,
        targetName: target.name,
        targetLongitudeDeg: target.longitudeDeg,
        nearestAxisSeparationDeg: Math.min(...target.contacts.map(c => c.separationDeg)),
        matchingAxisLongitudesDeg: Object.freeze(matchedAxes),
      });
      matchedTargets.push(fact);
      matchedCells.push(fact);
    }
    rows.push(Object.freeze({
      firstName: row.firstName,
      secondName: row.secondName,
      midpointAxis: row.midpointAxis,
      matchedTargets: Object.freeze(matchedTargets),
    }));
  }
  const sourceNamesFilter = sources === null ? null : Object.freeze([...sources].sort());
  const targetNamesFilter = targets === null ? null : Object.freeze([...targets].sort());
  const frozenRows = Object.freeze(rows);
  const frozenMatched = Object.freeze(matchedCells);
  return Object.freeze({
    contract: 'ZodiacMidpointMatrixView',
    contractVersion: '0.1.0-experimental',
    sourceContractVersion: matrix.contractVersion,
    filters: Object.freeze({
      sourceNames: sourceNamesFilter,
      targetNames: targetNamesFilter,
      maxOrbDeg,
      excludePairMembers,
    }),
    rows: frozenRows,
    matchedCells: frozenMatched,
    selectedPairCount: frozenRows.length,
    consideredCellCount,
    excludedPairMemberCount,
    matchedCellCount: frozenMatched.length,
    activePairCount: frozenRows.filter(r => r.matchedTargets.length > 0).length,
    calculationBasis: 'EXISTING_MIDPOINT_CONTACT_GEOMETRY',
    interpretation: 'FACTS_ONLY',
  });
}
