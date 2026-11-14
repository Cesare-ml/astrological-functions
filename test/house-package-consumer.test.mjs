import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePorphyryHouseCusps } from 'astrological-functions/porphyry-houses';
import { calculateVehlowHouseCusps } from 'astrological-functions/vehlow-houses';
import { calculatePorphyryHouseCusps as porphyryFile } from '../src/porphyry-houses.mjs';
import { calculateVehlowHouseCusps as vehlowFile } from '../src/vehlow-houses.mjs';

test('private ESM house subpaths resolve to their runtime functions', () => {
  assert.equal(calculatePorphyryHouseCusps, porphyryFile);
  assert.equal(calculateVehlowHouseCusps, vehlowFile);
});

test('Vehlow retains the explicitly approximate angle model', () => {
  const result = calculateVehlowHouseCusps({
    profile: 'VEHLOW_ASC_CENTERED_V1', birthTimeKnown: true,
    datetimeUtc: '2026-11-10T00:00:00Z', ascendantDeg: 157.8,
    source: {engineVersion:'experimental', kernelSetId:'local', timeModel:'explicit-UT1',
      center:'EARTH', frame:'ECLIPTIC_OF_DATE', corrections:'IAU2006_2000B_APPROXIMATE',
      zodiac:'TROPICAL', observerType:'TOPOCENTRIC', observer:{latitudeDeg:41.9, longitudeDegEast:12.5}},
  });
  assert.equal(result.source.corrections, 'IAU2006_2000B_APPROXIMATE');
});

test('house calculations retain the first validated angle and observer values', () => {
  for (const calculate of [calculatePorphyryHouseCusps, calculateVehlowHouseCusps]) {
    let ascReads = 0, latReads = 0;
    const input = {
      profile: 'VEHLOW_ASC_CENTERED_V1', birthTimeKnown: true,
      datetimeUtc: '2026-11-12T20:30:00Z', midheavenDeg: 285,
      get ascendantDeg() { return ++ascReads === 1 ? 10 : NaN; },
      source: {
        engineVersion: 'test', kernelSetId: 'test', timeModel: 'test',
        frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT', center: 'EARTH',
        zodiac: 'TROPICAL', observerType: 'TOPOCENTRIC',
        observer: { get latitudeDeg() { return ++latReads === 1 ? 44 : 100; }, longitudeDegEast: 11 },
      },
    };
    const result = calculate(input);
    assert.equal(result.source.observer.latitudeDeg, 44);
    assert.equal(ascReads, 1);
    assert.equal(latReads, 1);
    assert.ok(result.cuspsDeg.every(Number.isFinite));
  }
});
