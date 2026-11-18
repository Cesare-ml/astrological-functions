import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonomericCrossGeometry, MonomericCrossError } from '../src/monomeric-cross.mjs';

const base = Object.freeze({
  hourRuler: 'MERCURY', houseSystemId: 'VEHLOW',
  planetLongitudesDeg: {
    SUN: 330, MOON: 117, MERCURY: 4.5, VENUS: 354, MARS: 176,
    JUPITER: 280, SATURN: 8,
  },
  houseCuspsDeg: Array.from({length: 12}, (_, i) => (i * 30 + 5) % 360),
});

test('master, quadratures and opposite retain the required visual direction', () => {
  const cross = buildMonomericCrossGeometry(base);
  assert.deepEqual(cross.arms.map(a => a.role),
    ['master', 'square-left', 'square-right', 'opposite']);
  assert.deepEqual(cross.arms.map(a => a.longitudeDeg), [4.5, 94.5, 274.5, 184.5]);
  assert.deepEqual(cross.arms.map(a => a.signRuler), ['MARS', 'MOON', 'SATURN', 'VENUS']);
  assert.equal(cross.catalogStatus, 'UNRESOLVED');
  assert.equal(cross.arms[0].geometricDegreeIndex, 4);
  assert.equal(cross.arms[0].house, 12);
  assert.equal(cross.arms[0].rulerHouse, 6);
});

test('near 0/360 normalizes without assigning historical monomer text', () => {
  const cross = buildMonomericCrossGeometry({
    ...base, hourRuler: 'SUN', planetLongitudesDeg: {...base.planetLongitudesDeg, SUN: 359.999},
  });
  assert.ok(cross.arms[0].longitudeDeg < 360);
  assert.equal(cross.arms[0].signIndex, 11);
  assert.equal(cross.arms[1].signIndex, 2);
  assert.equal(cross.arms[2].signIndex, 8);
  assert.equal(cross.arms[3].signIndex, 5);
  assert.ok(!('monomerText' in cross.arms[0]));
});

test('rejects unknown planetary-hour ruler and incomplete house geometry', () => {
  assert.throws(() => buildMonomericCrossGeometry({...base, hourRuler:'URANUS'}),
    e => e instanceof MonomericCrossError && e.code === 'INVALID_HOUR_RULER');
  assert.throws(() => buildMonomericCrossGeometry({...base, houseCuspsDeg:[]}),
    e => e instanceof MonomericCrossError && e.code === 'INVALID_HOUSES');
  assert.throws(() => buildMonomericCrossGeometry({...base, planetLongitudesDeg:{MERCURY:1}}),
    e => e instanceof MonomericCrossError && e.code === 'MISSING_PLANET');
});
