/**
 * Combine the independently defined zodiac midpoint pair catalog and
 * multi-target contact sweep into deterministic chart-wide geometry facts.
 * Sources and targets are independent, explicitly supplied namespaces.
 */
import { AstrologyError } from './index.mjs';
import { calculateZodiacMidpointCatalog } from './zodiac-midpoint-catalog.mjs';
import { calculateZodiacMidpointTargetSweep } from './zodiac-midpoint-target-sweep.mjs';

/**
 * For 2..32 source points and 1..32 target points, check all unordered source
 * pairs against each target. Caller supplies a finite inclusive orb in [0,90].
 * Overlapping source/target names are NOT filtered by an implicit policy.
 *
 * @param {{sourcePoints:readonly {name:string,longitudeDeg:number}[],
 *   targetPoints:readonly {name:string,longitudeDeg:number}[],maxOrbDeg:number}} input
 */
export function calculateZodiacMidpointContactMatrix(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !Object.hasOwn(input, 'sourcePoints') ||
      !Object.hasOwn(input, 'targetPoints') ||
      !Object.hasOwn(input, 'maxOrbDeg')) {
    throw new AstrologyError('INVALID_MIDPOINT_MATRIX',
      'Explicit sourcePoints, targetPoints and maxOrbDeg are required');
  }

  // Keep each existing primitive the single owner of its validation rules.
  const sourceCatalog = calculateZodiacMidpointCatalog({points: input.sourcePoints});
  const longitudeByName = new Map(
    sourceCatalog.points.map(({name, longitudeDeg}) => [name, longitudeDeg])
  );
  const rows = [];
  const matchedCells = [];
  let activePairCount = 0;
  for (const pair of sourceCatalog.pairs) {
    const targetSweep = calculateZodiacMidpointTargetSweep({
      firstLongitudeDeg: longitudeByName.get(pair.firstName),
      secondLongitudeDeg: longitudeByName.get(pair.secondName),
      targetPoints: input.targetPoints,
      maxOrbDeg: input.maxOrbDeg,
    });
    rows.push(Object.freeze({
      firstName: pair.firstName,
      secondName: pair.secondName,
      midpointAxis: pair.midpointAxis,
      targetSweep,
    }));
    if (targetSweep.hasContact) activePairCount++;
    for (const target of targetSweep.targets) {
      if (!target.hasContact) continue;
      matchedCells.push(Object.freeze({
        firstName: pair.firstName,
        secondName: pair.secondName,
        targetName: target.name,
        targetLongitudeDeg: target.longitudeDeg,
        nearestAxisSeparationDeg: target.nearestAxisSeparationDeg,
        matchingAxisLongitudesDeg: target.matchingAxisLongitudesDeg,
      }));
    }
  }
  const firstSweep = rows[0].targetSweep;
  const targetPoints = Object.freeze(firstSweep.targets.map(({name, longitudeDeg}) =>
    Object.freeze({name, longitudeDeg})
  ));
  return Object.freeze({
    contract: 'ZodiacMidpointContactMatrix',
    contractVersion: '0.1.0-experimental',
    sourceCatalog,
    targetPoints,
    maxOrbDeg: firstSweep.maxOrbDeg,
    rows: Object.freeze(rows),
    matchedCells: Object.freeze(matchedCells),
    pairCount: sourceCatalog.pairCount,
    targetCount: firstSweep.targetCount,
    cellCount: sourceCatalog.pairCount * firstSweep.targetCount,
    matchedCellCount: matchedCells.length,
    activePairCount,
    calculationBasis: 'ECLIPTIC_LONGITUDE_GEOMETRY',
    interpretation: 'FACTS_ONLY',
  });
}
