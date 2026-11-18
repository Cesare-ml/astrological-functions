import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRegoloLotsFromAstronomicalFacts } from '../src/regolo-lots-astronomy-bridge.mjs';

const pin = Object.freeze({engineId: 'VIRGOSTARS_EPHEMERIS',
  engineVersion: 'synthetic-test-1', kernelSetId: 'synthetic-kernel',
  timeModelId: 'synthetic-time'});
const observer = Object.freeze({latitudeDeg: 44.8, longitudeDegEast: 11.6, elevationMeters: 12});
const natal = Object.freeze({birthTimeKnown: true, zodiac: 'TROPICAL',
  chartContextId: 'synthetic-horizon-lots', ascendantLongitudeDeg: 350,
  planetsLongitudeDeg: Object.freeze({SUN:10, MOON:80, MERCURY:100, VENUS:130,
    MARS:160, JUPITER:200, SATURN:260}),
  houseCuspsDeg: Object.freeze(Array.from({length: 12}, (_, i) => i * 30 + 10)),
  midheavenLongitudeDeg: 300, descendantLongitudeDeg: 170});
const birthUtc = '2026-11-18T12:00:00Z';
const sunHorizon = Object.freeze({...pin, datetimeUtc: birthUtc, observer,
  altitudeType: 'APPARENT_SUN_CENTER_TOPOCENTRIC', horizonModelId: 'TEST_HORIZON',
  sunAltitudeDeg: 8, horizonAltitudeDeg: 0, uncertaintyDeg: 0.01,
  warnings: Object.freeze([])});
const precedingNewMoon = Object.freeze({...pin, availability: 'AVAILABLE',
  relation: 'LATEST_PRECEDING_NEW_MOON', eventDatetimeUtc: '2026-11-10T01:00:00Z',
  moonLongitudeDeg: 245, center: 'EARTH', frame: 'ECLIPTIC_OF_DATE',
  corrections: 'APPARENT', zodiac: 'TROPICAL', warnings: Object.freeze([])});
const input = Object.freeze({datetimeUtc: birthUtc, observer, expectedEphemeris: pin,
  natal, sunHorizon, precedingNewMoon});

const invalid = (fn, code) => assert.throws(fn,
  error => error?.name === 'AstrologyError' && error.code === code,
  `Expected AstrologyError ${code}`);

test('injects caller-asserted astronomical facts into all 9 kleroi and 92 day parts', () => {
  const result = calculateRegoloLotsFromAstronomicalFacts(input);
  assert.equal(result.sect, 'DAY');
  assert.equal(result.kleroi.kleroi.TYCHE.longitudeDeg, 60);
  assert.equal(result.arabicParts.availableCount, 92);
  assert.equal(result.precedingNewMoon.moonLongitudeDeg, 245);
  assert.equal(result.horizon.clearanceDeg, 8);
  assert.ok(result.warnings.some(w => w.includes('CALLER_ASSERTED')));
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.observer));
});

test('night sect is taken exclusively from Sun altitude and unavailable lunation affects only dependent parts', () => {
  const result = calculateRegoloLotsFromAstronomicalFacts({...input,
    sunHorizon: {...sunHorizon, sunAltitudeDeg: -3},
    precedingNewMoon: {availability: 'UNAVAILABLE', reason: 'NOT_COMPUTED'},
  });
  assert.equal(result.sect, 'NIGHT');
  assert.equal(result.kleroi.kleroi.TYCHE.longitudeDeg, 280);
  assert.equal(result.arabicParts.entries.length, 92);
  assert.ok(result.arabicParts.availableCount < 92);
  const missing = result.arabicParts.entries.find(e => e.id === 'REG_ABU_MASHAR_4_07');
  assert.equal(missing.status, 'UNAVAILABLE_MISSING_INPUT');
  assert.deepEqual(missing.missing, ['NEW_MOON']);
});

test('does not guess sect at the apparent Sun-horizon boundary or within its uncertainty', () => {
  for (const sunAltitudeDeg of [0, -0.01, 0.0099]) {
    invalid(() => calculateRegoloLotsFromAstronomicalFacts({...input,
      sunHorizon: {...sunHorizon, sunAltitudeDeg},
    }), 'AMBIGUOUS_SECT');
  }
});

test('requires an exactly matching UTC observer, source pin and available horizon model', () => {
  invalid(() => calculateRegoloLotsFromAstronomicalFacts({...input,
    datetimeUtc: '2026-02-30T12:00:00Z'}), 'INVALID_UTC');
  invalid(() => calculateRegoloLotsFromAstronomicalFacts({...input,
    sunHorizon: {...sunHorizon, datetimeUtc: '2026-11-18T12:00:01Z'},
  }), 'INCOMPATIBLE_SUN_SOURCE');
  invalid(() => calculateRegoloLotsFromAstronomicalFacts({...input,
    sunHorizon: {...sunHorizon, observer: {...observer, latitudeDeg: observer.latitudeDeg + 1}},
  }), 'INCOMPATIBLE_SUN_SOURCE');
  invalid(() => calculateRegoloLotsFromAstronomicalFacts({...input,
    sunHorizon: {...sunHorizon, engineVersion: 'different'},
  }), 'INCOMPATIBLE_SUN_SOURCE');
  invalid(() => calculateRegoloLotsFromAstronomicalFacts({...input,
    sunHorizon: {...sunHorizon, warnings: ['LOW_CONFIDENCE']},
  }), 'INCOMPATIBLE_SUN_SOURCE');
});

test('rejects missing or incoherent new-Moon event selection without inventing a longitude', () => {
  invalid(() => calculateRegoloLotsFromAstronomicalFacts({...input,
    precedingNewMoon: {...precedingNewMoon, eventDatetimeUtc: '2026-11-19T00:00:00Z'},
  }), 'INCOMPATIBLE_LUNATION_EPOCH');
  invalid(() => calculateRegoloLotsFromAstronomicalFacts({...input,
    precedingNewMoon: {...precedingNewMoon, eventDatetimeUtc: '2026-10-01T00:00:00Z'},
  }), 'INCOMPATIBLE_LUNATION_EPOCH');
  invalid(() => calculateRegoloLotsFromAstronomicalFacts({...input,
    precedingNewMoon: {...precedingNewMoon, kernelSetId: 'different'},
  }), 'INCOMPATIBLE_LUNATION_SOURCE');
  invalid(() => calculateRegoloLotsFromAstronomicalFacts({...input,
    precedingNewMoon: {...precedingNewMoon, moonLongitudeDeg: NaN},
  }), 'INVALID_ANGLE');
  invalid(() => calculateRegoloLotsFromAstronomicalFacts({...input,
    precedingNewMoon: {availability: 'UNAVAILABLE', reason: 'GUESS'},
  }), 'INVALID_LUNATION');
});

test('rejects silently supplied sect, sidereal positions and unknown birth time', () => {
  invalid(() => calculateRegoloLotsFromAstronomicalFacts({...input,
    natal: {...natal, sect: 'NIGHT'},
  }), 'INVALID_NATAL_CHART');
  invalid(() => calculateRegoloLotsFromAstronomicalFacts({...input,
    natal: {...natal, zodiac: 'SIDEREAL'},
  }), 'UNSUPPORTED_ZODIAC');
  invalid(() => calculateRegoloLotsFromAstronomicalFacts({...input,
    natal: {...natal, birthTimeKnown: false},
  }), 'BIRTH_TIME_REQUIRED');
});

test('exports the opt-in ESM astronomy facts bridge without changing the root API', async () => {
  const module = await import('astrological-functions/regolo-lots-astronomy-bridge');
  assert.equal(module.calculateRegoloLotsFromAstronomicalFacts,
    calculateRegoloLotsFromAstronomicalFacts);
});
