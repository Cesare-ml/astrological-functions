import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRegoloLotsFromVirgoStarsRiseSet } from
  '../src/regolo-lots-rise-set-bridge.mjs';

const JD_EPOCH = 2440587.5;
const jd = time => JD_EPOCH + Date.parse(time) / 86400000;
const pin = Object.freeze({engineId: 'VIRGOSTARS_EPHEMERIS', engineVersion: 'synthetic',
  kernelSetId: 'de441-synthetic', timeModelId: 'mock-ut1'});
const observer = Object.freeze({latitudeDeg: 44, longitudeDegEast: 11,
  elevationMeters: 50});
const natal = Object.freeze({birthTimeKnown: true, zodiac: 'TROPICAL',
  chartContextId: 'regolo-mock', ascendantLongitudeDeg: 350,
  planetsLongitudeDeg: {SUN: 10, MOON: 80, MERCURY: 100, VENUS: 130,
    MARS: 160, JUPITER: 200, SATURN: 260},
  houseCuspsDeg: Array.from({length: 12}, (_, index) => index * 30 + 10),
  midheavenLongitudeDeg: 300, descendantLongitudeDeg: 170});

const hits = [];
const engine = {
  riseTransUt(cursor, body, flags, lon, lat, elevation, pressure, temperature, days) {
    hits.push({cursor, body, flags, lon, lat, elevation, pressure, temperature, days});
    // Deterministic synthetic daily crossings, not astronomical positions.
    const hour = (flags & 1) ? 6 : 18;
    const midnight = Math.floor(cursor + 0.5) - 0.5;
    let event = midnight + hour / 24;
    if (event < cursor - 1e-10) event += 1;
    return event <= cursor + days ? event : null;
  },
};
const base = {datetimeUtc: '2026-11-18T12:00:00Z', ut1MinusUtcSeconds: 0,
  observer, expectedEphemeris: pin, natal,
  precedingNewMoon: {availability: 'UNAVAILABLE', reason: 'NOT_COMPUTED'},
  solarModel: {pressureHpa: 1013.25, temperatureC: 15,
    boundaryUncertaintySeconds: 60}, engine};

const rejects = (input, code) => assert.throws(
  () => calculateRegoloLotsFromVirgoStarsRiseSet(input),
  error => error?.name === 'AstrologyError' && error.code === code,
  `Expected ${code}`);

test('real Node-binding signature is used for apparent refracted SUN CENTRE events', () => {
  hits.length = 0;
  const result = calculateRegoloLotsFromVirgoStarsRiseSet(base);
  assert.equal(result.sect, 'DAY');
  assert.equal(result.kleroi.kleroi.TYCHE.longitudeDeg, 60);
  assert.equal(result.arabicParts.entries.length, 92);
  assert.equal(result.solarEvents.model, 'APPARENT_REFRACTED_SUN_DISC_CENTRE');
  assert.ok(hits.some(c => c.flags === (1 | 256)));
  assert.ok(hits.some(c => c.flags === (2 | 256)));
  assert.ok(hits.every(c => c.body === 0 && c.lon === 11 && c.lat === 44 &&
    c.elevation === 50 && c.pressure === 1013.25 && c.temperature === 15 && c.days === 3));
  assert.ok(result.warnings.some(w => w.includes('CALLER_ASSERTED')));
  assert.equal(result.scientificEvidence, 'INJECTED_EPHEMERIS_ENGINE_NOT_AUTHENTICATED');
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.solarEvents));
});

test('night sect and uncomputed new Moon leave exactly the dependent Arabic parts unavailable', () => {
  const result = calculateRegoloLotsFromVirgoStarsRiseSet({...base,
    datetimeUtc: '2026-11-18T21:00:00Z'});
  assert.equal(result.sect, 'NIGHT');
  assert.equal(result.kleroi.kleroi.TYCHE.longitudeDeg, 280);
  assert.ok(result.arabicParts.availableCount < 92);
  assert.deepEqual(result.arabicParts.entries.find(e => e.id === 'REG_ABU_MASHAR_4_07').missing,
    ['NEW_MOON']);
});

test('available preceding new Moon re-enables 92 Arabic parts without inferring event selection', () => {
  const moon = {...pin, availability: 'AVAILABLE',
    relation: 'LATEST_PRECEDING_NEW_MOON', eventDatetimeUtc: '2026-11-10T01:00:00Z',
    moonLongitudeDeg: 245, center: 'EARTH', frame: 'ECLIPTIC_OF_DATE',
    corrections: 'APPARENT', zodiac: 'TROPICAL', warnings: []};
  const result = calculateRegoloLotsFromVirgoStarsRiseSet({...base, precedingNewMoon: moon});
  assert.equal(result.arabicParts.availableCount, 92);
  assert.equal(result.precedingNewMoon.moonLongitudeDeg, 245);
  rejects({...base, precedingNewMoon: {...moon, engineVersion: 'wrong'}},
    'INCOMPATIBLE_LUNATION_SOURCE');
  rejects({...base, precedingNewMoon: {...moon,
    eventDatetimeUtc: '2026-11-19T01:00:00Z'}}, 'INCOMPATIBLE_LUNATION_EPOCH');
});

test('sunrise, sunset and uncertainty intervals fail closed, even for a zero-width astronomical instant', () => {
  for (const datetimeUtc of ['2026-11-18T06:00:00Z', '2026-11-18T06:00:30Z',
    '2026-11-18T18:00:00Z', '2026-11-18T18:00:30Z']) {
    rejects({...base, datetimeUtc}, 'AMBIGUOUS_SECT');
  }
  const after = calculateRegoloLotsFromVirgoStarsRiseSet({...base,
    datetimeUtc: '2026-11-18T06:01:01Z'});
  assert.equal(after.sect, 'DAY');
  const before = calculateRegoloLotsFromVirgoStarsRiseSet({...base,
    datetimeUtc: '2026-11-18T05:58:59Z'});
  assert.equal(before.sect, 'NIGHT');
});

test('UT1−UTC offset is included in the actual engine Julian-date argument', () => {
  hits.length = 0;
  calculateRegoloLotsFromVirgoStarsRiseSet({...base, ut1MinusUtcSeconds: 0.4});
  // First request begins exactly 2.25 days before birth UT1.
  assert.ok(Math.abs(hits[0].cursor - (jd(base.datetimeUtc) + 0.4 / 86400 - 2.25)) < 1e-8);
});

test('polar/missing events, invalid providers and pathological returned roots never infer sect', () => {
  rejects({...base, engine: {riseTransUt: () => null}}, 'SECT_UNAVAILABLE');
  rejects({...base, engine: {}}, 'INVALID_EPHEMERIS_PROVIDER');
  rejects({...base, engine: {riseTransUt: () => Infinity}}, 'INVALID_EPHEMERIS_EVENT');
  rejects({...base, engine: {riseTransUt: () => {throw new Error('ephemeris unavailable');}}},
    'EPHEMERIS_EVENT_FAILURE');
  rejects({...base, engine: {riseTransUt: cursor => cursor}}, 'INVALID_EPHEMERIS_EVENT');
  rejects({...base, engine: {riseTransUt: cursor => cursor + 4}}, 'INVALID_EPHEMERIS_EVENT');
});

test('strict input contract rejects hidden sect, unknown birth time and incompatible assumptions', () => {
  rejects({...base, natal: {...natal, sect: 'NIGHT'}}, 'INVALID_NATAL_CHART');
  rejects({...base, natal: {...natal, birthTimeKnown: false}}, 'BIRTH_TIME_REQUIRED');
  rejects({...base, natal: {...natal, zodiac: 'SIDEREAL'}}, 'UNSUPPORTED_ZODIAC');
  rejects({...base, ut1MinusUtcSeconds: 2}, 'INVALID_SOLAR_MODEL');
  rejects({...base, solarModel: {...base.solarModel, pressureHpa: NaN}}, 'INVALID_SOLAR_MODEL');
  rejects({...base, solarModel: {...base.solarModel, boundaryUncertaintySeconds: 0}},
    'INVALID_SOLAR_MODEL');
  rejects({...base, expectedEphemeris: {...pin, engineId: 'OTHER'}},
    'INVALID_EPHEMERIS_PIN');
  rejects({...base, datetimeUtc: '2026-02-30T12:00:00Z'}, 'INVALID_UTC');
  rejects({...base, observer: {...observer, latitudeDeg: 95}}, 'INVALID_OBSERVER');
});

test('opt-in ESM entrypoint is available without expanding the root API', async () => {
  const mod = await import('astrological-functions/regolo-lots-rise-set-bridge');
  assert.equal(mod.calculateRegoloLotsFromVirgoStarsRiseSet,
    calculateRegoloLotsFromVirgoStarsRiseSet);
});
