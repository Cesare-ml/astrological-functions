/**
 * Runtime ESM companion to ephemeris-provider.d.ts.
 *
 * Re-export the existing validated experimental API without wrapping the
 * injected provider, introducing astronomy, or adding an implicit fallback.
 * This path is not a Rust/WASM implementation or a released package entry.
 */
export {
  calculateNatalWithProvider,
  resolveHouseSystem,
  resolveHousePlacementPolicy,
  locateLongitudeWithHousePolicy,
  validateHouseCuspSet,
  validateHouseCuspContext,
  placeNatalBodiesInHouses,
} from './index.mjs';
