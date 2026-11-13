/**
 * MANUAL F3 integration gate — not part of automatic npm test discovery.
 *
 * Run only after the independently reviewed #29/#39/#40/#61 producer paths
 * have been integrated alongside #43/#48/#55/#57:
 *
 *   node --test scripts/verify-f3-house-producer-matrix.mjs
 *
 * Until then, this branch intentionally does not vendor/copy producer files.
 * Synthetic astronomy inputs; exact source declarations are not JPL proof.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWholeSignHouseCusps } from '../src/whole-sign-house-cusps.mjs';
import { calculateEqualHouseCusps } from '../src/equal-house-cusps.mjs';
import { calculatePorphyryHouseCusps } from '../src/porphyry-houses.mjs';
import { adaptPorphyryToPinnedComparison } from '../src/porphyry-sourced-side.mjs';
import { buildSourcedHousePlacementMatrix } from '../src/sourced-house-placement-matrix.mjs';
import { locateLongitudeInHouses } from '../src/index.mjs';

const datetimeUtc = '2026-11-13T16:00:00.000Z';
const longitudeBasis = { type: 'TROPICAL' };
const observer = { latitudeDeg: 44, longitudeDegEast: 11 };
const source = {
  datetimeUtc, frame: 'ECLIPTIC_OF_DATE', longitudeBasis,
  observerType: 'TOPOCENTRIC', observer,
  engineVersion: 'SYNTHETIC_TEST_ENGINE',
  kernelSetId: 'SYNTHETIC_TEST_KERNEL',
  timeModel: 'SYNTHETIC_TEST_UTC',
  corrections: 'APPARENT',
  calculationProfileId: 'SYNTHETIC_TEST_PROFILE',
};
const angleSource = {
  engineVersion: source.engineVersion, kernelSetId: source.kernelSetId,
  timeModel: source.timeModel, frame: source.frame, zodiac: 'TROPICAL',
  observerType: source.observerType, observer,
};
const positions = {
  source,
  provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
  points: [
    { id: 'SUN', longitudeDeg: 0 },
    { id: 'MOON', longitudeDeg: 345 },
    { id: 'MARS', longitudeDeg: 200 },
  ],
};

function makeInputs({ ascendantDeg = 350, midheavenDeg = 250 } = {}) {
  const common = {
    ascendantLongitudeDeg: ascendantDeg, datetimeUtc,
    frame: source.frame, longitudeBasis,
  };
  const whole = calculateWholeSignHouseCusps({ ...common, birthTimeKnown: true });
  const equal = calculateEqualHouseCusps(common);
  const porphyry = calculatePorphyryHouseCusps({
    ascendantDeg, midheavenDeg, datetimeUtc, source: angleSource,
  });
  // The independently supplied declaration does not authenticate the producer.
  const normalizeSide = produced => ({
    snapshot: {
      houseSystem: produced.houseSystem,
      datetimeUtc: produced.datetimeUtc,
      frame: produced.frame,
      longitudeBasis: produced.longitudeBasis,
      cuspsDeg: produced.cuspsDeg,
      provenanceStatus: produced.provenanceStatus,
    },
    source: structuredClone(source),
  });
  const porphyrySide = adaptPorphyryToPinnedComparison({
    birthTimeKnown: true, produced: porphyry,
    declaredSource: structuredClone(source),
  });
  return { whole: normalizeSide(whole), equal: normalizeSide(equal),
    porphyry: porphyrySide, porphyryProduced: porphyry };
}

const create = (methods, points = positions.points, pointSource = source) =>
  buildSourcedHousePlacementMatrix({
    birthTimeKnown: true, methods,
    positions: {
      source: pointSource,
      provenanceStatus: 'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
      points,
    },
  });
const hasCode = expected => e => e?.name === 'AstrologyError' && e.code === expected;

test('three REAL producers compose to one immutable sourced placement matrix', () => {
  const {whole,equal,porphyry} = makeInputs();
  const matrix = create([whole,equal,porphyry]);
  assert.deepEqual(matrix.methodNames, ['WHOLE_SIGN','EQUAL_ASCENDANT','PORPHYRY']);
  assert.deepEqual(matrix.rows.map(row => [row.id,...row.placements.map(x=>x.house)]),
    [['SUN',2,1,1], ['MOON',1,12,12], ['MARS',8,8,8]]);
  assert.deepEqual(matrix.pairwiseChanges.map(x => [x.changedCount,x.changedPointIds]),
    [[2,['SUN','MOON']], [2,['SUN','MOON']], [0,[]]]);
  assert.deepEqual(matrix.changedPointIds, ['SUN','MOON']);
  assert.equal(matrix.changedCount, 2);
  assert.ok(Object.isFrozen(matrix));
  assert.ok(Object.isFrozen(matrix.rows[0].placements));
  assert.equal(matrix.status,
    'MATCHING_CALLER_ASSERTED_SOURCES_NOT_INDEPENDENTLY_VERIFIED');
});

test('two real producers also work, regardless of selected display order', () => {
  const {whole,equal,porphyry} = makeInputs();
  const matrix = create([porphyry,whole]);
  assert.deepEqual(matrix.methodNames, ['PORPHYRY','WHOLE_SIGN']);
  assert.deepEqual(matrix.rows.map(row=>row.placements.map(x=>x.house)),
    [[1,2],[12,1],[8,8]]);
  assert.deepEqual(matrix.pairwiseChanges[0].changedPointIds,['SUN','MOON']);
  const reversed = create([whole,porphyry]);
  assert.deepEqual(reversed.rows.map(row=>row.placements.map(x=>x.house)),
    [[2,1],[1,12],[8,8]]);
  assert.equal(create([whole,equal],[]).pointCount, 0);
});

test('producer-originated planet positions must declare identical source', () => {
  const {whole,equal,porphyry} = makeInputs();
  assert.throws(()=>create([whole,equal,porphyry],positions.points,
    {...source,kernelSetId:'DIFFERENT'}),hasCode('INCOMPATIBLE_POINT_SOURCE_CONTEXT'));
  assert.throws(()=>create([whole,equal,porphyry],positions.points,
    {...source,observer:{...observer,longitudeDegEast:12}}),
    hasCode('INCOMPATIBLE_POINT_SOURCE_CONTEXT'));
});

test('changing the source of only the Porphyry producer side fails closed', () => {
  const {whole,equal,porphyry} = makeInputs();
  const changed = {
    ...porphyry, source: {...porphyry.source,timeModel:'DIFFERENT'},
  };
  assert.throws(()=>create([whole,equal,changed]),
    hasCode('INCOMPATIBLE_SOURCE_CONTEXT'));
});

test('forged interior cusp is rejected by the REAL Porphyry adapter before matrix', () => {
  const {porphyryProduced} = makeInputs();
  const forged = {
    ...porphyryProduced,
    cuspsDeg: [...porphyryProduced.cuspsDeg],
  };
  forged.cuspsDeg[1] += 0.1;
  assert.throws(()=>adaptPorphyryToPinnedComparison({
    birthTimeKnown:true, produced:forged,
    declaredSource:structuredClone(source),
  }),hasCode('INVALID_PORPHYRY_GEOMETRY'));
});

test('different textual UTC representations are not silently relabeled', () => {
  const whole = calculateWholeSignHouseCusps({
    ascendantLongitudeDeg:350, birthTimeKnown:true,
    datetimeUtc:'2026-11-13T16:00:00Z',
    frame:source.frame, longitudeBasis,
  });
  const {equal,porphyry} = makeInputs();
  const mismatched = {
    snapshot: {
      houseSystem:whole.houseSystem,datetimeUtc:whole.datetimeUtc,
      frame:whole.frame,longitudeBasis:whole.longitudeBasis,
      provenanceStatus:whole.provenanceStatus,cuspsDeg:whole.cuspsDeg,
    },
    source:structuredClone(source),
  };
  assert.throws(()=>create([mismatched,equal,porphyry]),
    hasCode('INCOMPATIBLE_HOUSE_CONTEXT'));
});

test('known birth time is mandatory with real producer snapshots', () => {
  const {whole,equal,porphyry} = makeInputs();
  assert.throws(()=>buildSourcedHousePlacementMatrix({
    birthTimeKnown:false, methods:[whole,equal,porphyry],positions,
  }),hasCode('BIRTH_TIME_UNKNOWN'));
});

test('invalid Porphyry angles fail instead of triggering silent house fallback', () => {
  assert.throws(()=>makeInputs({ascendantDeg:350,midheavenDeg:170}),
    hasCode('DEGENERATE_QUADRANTS'));
});

test('36x36 ASC/MC producer grid composes all valid geometry with exact placements', () => {
  let valid = 0, degenerate = 0, placements = 0;
  for (let ascendantDeg = 0; ascendantDeg < 360; ascendantDeg += 10) {
    for (let midheavenDeg = 0; midheavenDeg < 360; midheavenDeg += 10) {
      let sides;
      try {
        sides = makeInputs({ ascendantDeg, midheavenDeg });
      } catch (e) {
        assert.equal(e?.code, 'DEGENERATE_QUADRANTS');
        degenerate++;
        continue;
      }
      const methods = [sides.whole, sides.equal, sides.porphyry];
      const longitudes = [0,360,-15,ascendantDeg,midheavenDeg,ascendantDeg+180];
      const points = longitudes.map((longitudeDeg,i)=>({id:`P${i}`,longitudeDeg}));
      const result = create(methods,points);
      valid++;
      for (let i = 0; i < points.length; i++) {
        const expected = methods.map(method =>
          locateLongitudeInHouses(points[i].longitudeDeg,method.snapshot.cuspsDeg).house);
        assert.deepEqual(result.rows[i].placements.map(p=>p.house),expected);
        placements += expected.length;
      }
      const distinct = new Set(result.pairwiseChanges.flatMap(pair=>pair.changedPointIds));
      assert.equal(result.changedCount,distinct.size);
    }
  }
  assert.equal(valid,612);
  assert.equal(degenerate,684);
  assert.equal(placements,11016);
});
