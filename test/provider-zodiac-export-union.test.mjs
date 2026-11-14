import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { calculateNatalWithProvider } from 'astrological-functions/ephemeris-provider';
import { calculateDodecatemoriaFacts } from 'astrological-functions/dodecatemoria';
import { calculateDodecatemoriaBatchFacts } from 'astrological-functions/dodecatemoria-batch';
import { classifyZodiacDecan } from 'astrological-functions/zodiac-decan-facts';
import { normalize360, zodiacSignIndex, locateLongitudeInHouses } from 'astrological-functions';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const packageRequires = createRequire(import.meta.url);
const previous360 = 359.99999999999994;
const metadata = Object.freeze({
  center: 'EARTH', frame: 'ECLIPTIC_OF_DATE', corrections: 'APPARENT',
  engineVersion: 'synthetic', kernelSetId: 'synthetic', timeModel: 'synthetic',
});

test('private typed ESM export map preserves provider plus all main zodiac subpaths', () => {
  assert.equal(manifest.private, true);
  assert.deepEqual(Object.keys(manifest.exports), [
    '.', './ephemeris-provider', './dodecatemoria',
    './dodecatemoria-batch', './zodiac-decan-facts',
  ]);
  assert.equal(manifest.exports['.'], './src/index.mjs');
  for (const key of Object.keys(manifest.exports).filter(key => key !== '.')) {
    const entry = manifest.exports[key];
    assert.equal(Object.keys(entry).join(','), 'types,import', key);
    for (const target of [entry.types, entry.import]) {
      assert.match(target, /^\.\/src\/[a-z0-9.-]+$/);
      assert.ok(existsSync(new URL('../' + target.slice(2), import.meta.url)),
        key + ' missing target ' + target);
    }
    assert.throws(() => packageRequires('astrological-functions/' + key.slice(2)),
      { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }, key);
  }
});

test('public provider→decan import preserves final Pisces ULP', async () => {
  const chart = await calculateNatalWithProvider({
    datetimeUtc: '2026-11-14T12:00:00Z',
    latitudeDeg: 44.8, longitudeDegEast: 11.9, bodyNames: ['Sun'],
    provider: { async getGeocentricEcliptic() {
      return { longitudeDeg: previous360, latitudeDeg: 0, metadata };
    } },
  });
  const sun = chart.bodies.Sun;
  assert.equal(normalize360(previous360), previous360);
  assert.equal(sun.longitudeDeg, previous360);
  assert.equal(sun.zodiacSignIndex, 11);
  const decan = classifyZodiacDecan({ longitudeDeg: sun.longitudeDeg,
    zodiac: { type: 'TROPICAL' } });
  assert.equal(decan.signIndex, zodiacSignIndex(sun.longitudeDeg));
  assert.equal(decan.globalDecanIndex, 35);
  assert.equal(decan.decanNumber, 3);
  assert.equal(Object.isFrozen(decan), true);
  assert.equal(chart.houses, null);
});

test('versioned dodecatemoria and bounded batch share explicit convention', () => {
  const options = { longitudeDeg: 11, zodiac: 'TROPICAL',
    method: 'PAULUS_13_V1' };
  const single = calculateDodecatemoriaFacts(options);
  const batch = calculateDodecatemoriaBatchFacts({
    points: [{ id: 'Sun', longitudeDeg: options.longitudeDeg }],
    zodiac: options.zodiac, method: options.method,
  });
  assert.deepEqual(batch.points[0].facts, single);
  assert.equal(batch.points[0].id, 'Sun');
  assert.equal(Object.isFrozen(batch.points), true);
});

test('merged package retains strict half-open house cusp ownership', () => {
  const cusps = Array.from({ length: 12 }, (_, i) => (30 + i * 30) % 360);
  assert.equal(locateLongitudeInHouses(29.999999999999996, cusps).house, 12);
  assert.equal(locateLongitudeInHouses(30, cusps).house, 1);
});

test('undocumented paths remain invisible to ESM consumers', async () => {
  for (const specifier of [
    'astrological-functions/src/index.mjs',
    'astrological-functions/zodiac-decan',
    'astrological-functions/dodecatemoria-methods',
    'astrological-functions/ephemeris-provider.js',
  ]) {
    await assert.rejects(import(specifier), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
  }
});
