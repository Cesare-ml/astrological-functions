import {
  AstrologyError,
  angularSeparation,
  calculateCrossAspects,
  calculateNatalWithProvider,
  dodecatemoriaLongitude,
  locateLongitudeInHouses,
  normalize360,
  signedAngularDistance,
  zodiacSignIndex,
} from "astrological-functions";

const normalized: number = normalize360(-20);
const signed: number = signedAngularDistance(350, 10);
const separation: number = angularSeparation(350, 10);
const sign: number = zodiacSignIndex(45);
const dodecatemoria: number = dodecatemoriaLongitude(30);
const house = locateLongitudeInHouses(0, [345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315]);
const aspects = calculateCrossAspects({
  direction: "SKY_TO_NATAL",
  sourcePoints: [{ name: "Sun", longitudeDeg: 0 }],
  targetPoints: [{ name: "Moon", longitudeDeg: 0 }],
  aspectDefinitions: [{ id: "conjunction", angleDeg: 0, maxOrbDeg: 6 }],
});
const provider = {
  async getGeocentricEcliptic() {
    return {
      longitudeDeg: 12,
      latitudeDeg: 0,
      longitudeSpeedDegPerDay: 1,
      metadata: {
        center: "EARTH" as const,
        frame: "ECLIPTIC_OF_DATE" as const,
        corrections: "APPARENT" as const,
        engineVersion: "fixture",
      },
    };
  },
};
const natal = await calculateNatalWithProvider({
  datetimeUtc: "2026-11-16T12:00:00Z",
  latitudeDeg: 44.8,
  longitudeDegEast: 11.9,
  bodyNames: ["Sun"],
  provider,
});
const error: AstrologyError = new AstrologyError("INVALID_ANGLE", "Invalid angle");

void [normalized, signed, separation, sign, dodecatemoria, house, aspects, natal, error];
