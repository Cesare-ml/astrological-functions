import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedRisingAscendantDeg} from '../src/house-ascendant-orientation.mjs';
import {calculateAstroComHouseMethod} from '../src/astro-com-house-selector.mjs';
import {normalize360, signedAngularDistance} from '../src/index.mjs';

const R = Math.PI / 180;
const armcDeg = 292.95347186375847;
const trueObliquityDeg = 23.437676823739082;
const mcDeg = 291.23482098822;
const ascNorthRisingDeg = 344.5489205114233;
const ascNorthSettingDeg = 164.5489205114233;

function horizonCrossing(latitudeDeg, armc, obliquity, longitudeDeg) {
  const theta = armc * R, epsilon = obliquity * R;
  const phi = latitudeDeg * R, lambda = longitudeDeg * R;
  const rightAscension = Math.atan2(Math.sin(lambda) * Math.cos(epsilon), Math.cos(lambda));
  const declination = Math.asin(Math.sin(lambda) * Math.sin(epsilon));
  const hourAngle = theta - rightAscension;
  return {
    sinAltitude: Math.sin(phi) * Math.sin(declination) +
      Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle),
    risingRate: -Math.cos(phi) * Math.cos(declination) * Math.sin(hourAngle),
  };
}

test('ecliptic crossing selects the rising—not setting—antipode at 80° N', () => {
  const rising = expectedRisingAscendantDeg(armcDeg, trueObliquityDeg, 80);
  assert.ok(Math.abs(signedAngularDistance(rising, ascNorthRisingDeg)) < 1e-9);
  assert.ok(horizonCrossing(80, armcDeg, trueObliquityDeg, rising).risingRate > 0);
  assert.ok(horizonCrossing(80, armcDeg, trueObliquityDeg, ascNorthSettingDeg).risingRate < 0);
  assert.ok(Math.abs(signedAngularDistance(rising, normalize360(ascNorthSettingDeg + 180))) < 1e-9);
});

test('the rising horizon branch remains geometrically consistent across both hemispheres', () => {
  for (const epsilon of [23.437676823739082, 23.9]) {
    for (const latitude of [-85, -80, -70, -60, -40, 0, 40, 60, 70, 80, 85]) {
      for (let armc = 0; armc < 360; armc += 5) {
        const asc = expectedRisingAscendantDeg(armc, epsilon, latitude);
        const {sinAltitude, risingRate} = horizonCrossing(latitude, armc, epsilon, asc);
        assert.ok(asc >= 0 && asc < 360);
        assert.ok(Math.abs(sinAltitude) < 1e-10, `${latitude}°/${armc}° must be on horizon`);
        assert.ok(risingRate > 0, `${latitude}°/${armc}° must be the rising branch`);
      }
    }
  }
});

test('8 formerly false angle mismatches become explicit method outcomes at 80° N', () => {
  // Synthetic owner-geometry replay only. No real rebuilt Rust addon, no
  // independent method-cusp reference, and no scientific parity asserted.
  const input = {datetimeUtc: '2000-01-01T12:00:00Z', birthTimeKnown: true,
    armcDeg, trueObliquityDeg, ascendantDeg: ascNorthRisingDeg,
    midheavenDeg: mcDeg, angleModel: 'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME',
    source: {engineVersion: 'SYNTHETIC_ONLY', kernelSetId: 'NO_KERNEL',
      timeModel: 'SYNTHETIC_UTC', frame: 'ECLIPTIC_OF_DATE', zodiac: 'TROPICAL',
      observerType: 'TOPOCENTRIC', observer: {latitudeDeg: 80, longitudeDegEast: 12.4964}}};
  const expectations = Object.freeze({
    CAMPANUS: 'HOUSE_GEOMETRY_UNAVAILABLE',
    REGIOMONTANUS: 'HOUSE_GEOMETRY_UNAVAILABLE',
    ALCABITIUS: 'SUCCESS',
    KRUSINSKI_PISA_GOELZER: 'SUCCESS',
    AZIMUTH: 'SUCCESS',
    POLICH_PAGE: 'HOUSE_GEOMETRY_UNAVAILABLE',
    APC: 'HOUSE_GEOMETRY_UNAVAILABLE',
    ALBATEGNIUS: 'ALBATEGNIUS_HOUSES_UNAVAILABLE',
  });
  for (const [houseSystem, outcome] of Object.entries(expectations)) {
    if (outcome === 'SUCCESS') {
      const result = calculateAstroComHouseMethod({houseSystem, input});
      assert.equal(result.houseSystem, houseSystem);
      assert.equal(result.cuspsDeg.length, 12);
      assert.ok(result.cuspsDeg.every(value => Number.isFinite(value) && value >= 0 && value < 360));
      assert.match(result.validation, /^CALLER_ASSERTED_/);
    } else {
      assert.throws(() => calculateAstroComHouseMethod({houseSystem, input}),
        error => error?.code === outcome, `${houseSystem} must fail with ${outcome}`);
    }
  }
});
