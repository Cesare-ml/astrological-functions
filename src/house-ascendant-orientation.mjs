/**
 * Internal geometric consistency check for a caller-supplied Ascendant.
 *
 * This does NOT calculate sidereal time, obliquity, or a birth-chart angle
 * from an epoch. Those inputs must come from the pinned Rust ephemeris.
 * The two intersections of the ecliptic with the local horizon are opposite;
 * the Ascendant is the one moving upward as local sidereal time increases.
 */
import {normalize360} from './index.mjs';

const RADIANS = Math.PI / 180;
const DEGREES = 180 / Math.PI;

export function expectedRisingAscendantDeg(armcDeg, trueObliquityDeg, latitudeDeg) {
  const sidereal = normalize360(armcDeg) * RADIANS;
  const obliquity = trueObliquityDeg * RADIANS;
  const latitude = latitudeDeg * RADIANS;
  const candidate = normalize360(Math.atan2(-Math.cos(sidereal),
    Math.sin(obliquity) * Math.tan(latitude) +
    Math.cos(obliquity) * Math.sin(sidereal)) * DEGREES + 180);

  // Eastward horizon component of the candidate's ecliptic unit vector.
  // A negative projection selects the setting intersection; its antipode
  // is rising. At exact tangency the branch is indeterminate, so preserve
  // the traditional candidate (matching the upstream angle convention).
  const longitude = candidate * RADIANS;
  const eastward = Math.cos(sidereal) * Math.cos(obliquity) * Math.sin(longitude) -
    Math.sin(sidereal) * Math.cos(longitude);
  return eastward < 0 ? normalize360(candidate + 180) : candidate;
}
