/**
 * Experimental F4 synastry facts composition: directional cross-aspects plus
 * independently validated house overlays. No ephemeris/house astronomy here.
 */
import { AstrologyError, calculateCrossAspects } from './index.mjs';
import { calculateBidirectionalHouseOverlays } from './directional-house-overlays.mjs';

/**
 * Both natal times and both externally computed house contexts are mandatory
 * for this initial FULL_HOUSES synastry slice. No implicit aspect definitions.
 */
export function calculateSynastryFacts(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AstrologyError('INVALID_ARGUMENT', 'Synastry options must be an object');
  const { chartA, chartB, birthTimeKnownA, birthTimeKnownB,
    cuspSetA, cuspSetB, aspectDefinitions } = input;
  if (!Array.isArray(aspectDefinitions))
    throw new AstrologyError('INVALID_ARGUMENT', 'Explicit aspect definitions array required');

  // Snapshot caller-owned rule data, including sparse entries, before invoking
  // either direction. calculateCrossAspects owns semantic rule validation.
  const definitions = Object.freeze(Array.from(aspectDefinitions, definition =>
    Object.freeze({
      id: definition?.id,
      angleDeg: definition?.angleDeg,
      maxOrbDeg: definition?.maxOrbDeg,
    })
  ));

  const overlays = calculateBidirectionalHouseOverlays({
    chartA, chartB, birthTimeKnownA, birthTimeKnownB, cuspSetA, cuspSetB,
  });
  // House overlays already checked both natal contracts and source positions.
  // Their normalized longitudes are therefore also the inputs to aspect math.
  const pointsA = overlays.aToB.placements.map(({ bodyName, longitudeDeg }) =>
    Object.freeze({ name: bodyName, longitudeDeg }));
  const pointsB = overlays.bToA.placements.map(({ bodyName, longitudeDeg }) =>
    Object.freeze({ name: bodyName, longitudeDeg }));

  const aToB = Object.freeze({
    direction: 'A_TO_B',
    houseOverlays: overlays.aToB,
    aspects: calculateCrossAspects({
      direction: 'A_TO_B',
      sourcePoints: pointsA,
      targetPoints: pointsB,
      aspectDefinitions: definitions,
    }),
  });
  const bToA = Object.freeze({
    direction: 'B_TO_A',
    houseOverlays: overlays.bToA,
    aspects: calculateCrossAspects({
      direction: 'B_TO_A',
      sourcePoints: pointsB,
      targetPoints: pointsA,
      aspectDefinitions: definitions,
    }),
  });
  return Object.freeze({
    contract: 'SynastryFactsResult',
    contractVersion: '0.1.0-experimental',
    houseMode: 'FULL_HOUSES',
    aspectDefinitions: definitions,
    aToB, bToA,
  });
}
