/** Runtime companion for the experimental typed EphemerisProvider contract.
 * Delegates to the existing guarded functions; performs no astronomy.
 * VirgoStars: https://github.com/Cesare-ml/virgostars-ephemeris
 */
export {
  calculateNatalWithProvider,
  resolveHouseSystem,
  resolveHousePlacementPolicy,
  locateLongitudeWithHousePolicy,
  validateHouseCuspSet,
  validateHouseCuspContext,
  placeNatalBodiesInHouses
} from './index.mjs';
