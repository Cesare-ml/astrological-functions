import {bindVirgoStarsNodeHouseAngles} from 'astrological-functions/virgostars-node-house-bridge';
import type {CallerVerifiedNodeBinding, VirgoStarsNativeHouseAngleProvider,
  VirgoStarsNodeHouseBridge} from 'astrological-functions/virgostars-node-house-bridge';
import {calculateAstroComHouseFromProvider} from 'astrological-functions/astro-com-house-provider';

const identity: CallerVerifiedNodeBinding = {
  upstreamCommitSha: 'a'.repeat(40), nativeAddonSha256: 'b'.repeat(64),
  kernelSetId: 'TEST_CONTEXT_NOT_AN_EPHEMERIS_DEPENDENCY',
};
const native: VirgoStarsNativeHouseAngleProvider = {calculateHouseAngles(input) {
  return {...input, model: 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME',
    armcDeg: 60, ascendantDeg: 150, midheavenDeg: 65, trueObliquityDeg: 23.44};
}};
const bridge: Readonly<VirgoStarsNodeHouseBridge> =
  bindVirgoStarsNodeHouseAngles(native, identity);
const output = calculateAstroComHouseFromProvider({datetimeUtc: '2000-01-01T12:00:00Z',
  birthTimeKnown: true, ut1JulianDay: 2451545, ttJulianDay: 2451545.0008,
  latitudeDeg: 40, longitudeDegEast: 12, houseSystem: 'PORPHYRY',
  expectedProvider: bridge.expectedProvider}, bridge);
void output;
// @ts-expect-error caller assertions must include an addon SHA-256
bindVirgoStarsNodeHouseAngles(native, {upstreamCommitSha: 'a'.repeat(40), kernelSetId: 'X'});
const invalidNative: VirgoStarsNativeHouseAngleProvider = {
  calculateHouseAngles: input => ({...input,
    // @ts-expect-error the real binding must return true-of-date sidereal time
    model: 'MEAN_J2000', armcDeg: 60, ascendantDeg: 150,
    midheavenDeg: 65, trueObliquityDeg: 23.44}),
};
void invalidNative;
