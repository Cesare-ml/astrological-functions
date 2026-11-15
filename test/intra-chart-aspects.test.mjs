import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateIntraChartAspects } from '../src/intra-chart-aspects.mjs';

const conjunction = { id: 'conjunction', angleDeg: 0, maxOrbDeg: 3 };
const opposition = { id: 'opposition', angleDeg: 180, maxOrbDeg: 1 };

function errorCode(code) { return (error) => error?.code === code; }

test('unordered within-chart pairs are unique, ordered, and preserve configured orbs', () => {
  const facts = calculateIntraChartAspects({
    points: [
      { id: 'Sun', longitudeDeg: 359 },
      { id: 'Moon', longitudeDeg: 2 },
      { id: 'Mars', longitudeDeg: 179 },
    ],
    aspectDefinitions: [conjunction, opposition],
  });
  assert.equal(facts.length, 2);
  assert.deepEqual(facts.map((fact) => [fact.pointAId, fact.pointBId, fact.aspectId]), [
    ['Sun', 'Moon', 'conjunction'],
    ['Sun', 'Mars', 'opposition'],
  ]);
  assert.equal(facts[0].actualAngleDeg, 3);
  assert.equal(facts[0].absoluteOrbDeg, 3);
  assert.equal(facts[0].signedOrbDeg, 3);
  assert.equal(facts[1].actualAngleDeg, 180);
  assert.equal(facts[1].signedOrbDeg, 0);
});

test('0/360 equivalence and zero-orb exact conjunction', () => {
  const facts = calculateIntraChartAspects({
    points: [{ id: 'a', longitudeDeg: -360 }, { id: 'b', longitudeDeg: 720 }],
    aspectDefinitions: [{ id: 'exact', angleDeg: 0, maxOrbDeg: 0 }],
  });
  assert.equal(facts.length, 1);
  assert.equal(facts[0].actualAngleDeg, 0);
});

test('negative signed orb is geometry, not applying/separating motion', () => {
  const facts = calculateIntraChartAspects({
    points: [{ id: 'a', longitudeDeg: 0 }, { id: 'b', longitudeDeg: 89 }],
    aspectDefinitions: [{ id: 'square', angleDeg: 90, maxOrbDeg: 2 }],
  });
  assert.equal(facts[0].signedOrbDeg, -1);
  assert.equal(facts[0].absoluteOrbDeg, 1);
});

test('multiple explicit overlapping definitions can match the same pair', () => {
  const facts = calculateIntraChartAspects({
    points: [{ id: 'a', longitudeDeg: 0 }, { id: 'b', longitudeDeg: 90 }],
    aspectDefinitions: [
      { id: 'exact-square', angleDeg: 90, maxOrbDeg: 0 },
      { id: 'wide-square', angleDeg: 90, maxOrbDeg: 5 },
    ],
  });
  assert.deepEqual(facts.map(({ aspectId }) => aspectId), ['exact-square', 'wide-square']);
});

test('out of orb and explicit empty arrays return no facts', () => {
  assert.equal(calculateIntraChartAspects({
    points: [{ id: 'a', longitudeDeg: 0 }, { id: 'b', longitudeDeg: 91 }],
    aspectDefinitions: [{ id: 'sq', angleDeg: 90, maxOrbDeg: 0 }],
  }).length, 0);
  assert.deepEqual(calculateIntraChartAspects({ points: [], aspectDefinitions: [] }), []);
});

test('returns immutable detached facts after caller input changes', () => {
  const points = [{ id: 'a', longitudeDeg: 0 }, { id: 'b', longitudeDeg: 120 }];
  const definitions = [{ id: 'trine', angleDeg: 120, maxOrbDeg: 1 }];
  const facts = calculateIntraChartAspects({ points, aspectDefinitions: definitions });
  points[0].id = 'modified';
  points[0].longitudeDeg = 45;
  definitions[0].id = 'modified';
  assert.equal(facts[0].pointAId, 'a');
  assert.equal(facts[0].aspectId, 'trine');
  assert.ok(Object.isFrozen(facts));
  assert.ok(Object.isFrozen(facts[0]));
  assert.throws(() => { facts[0].pointAId = 'mutation'; }, TypeError);
});

test('rejects missing, sparse, oversized, or non-array inputs', () => {
  assert.throws(() => calculateIntraChartAspects(), errorCode('INVALID_POINTS'));
  assert.throws(() => calculateIntraChartAspects({ points: {}, aspectDefinitions: [] }), errorCode('INVALID_POINTS'));
  assert.throws(() => calculateIntraChartAspects({ points: new Array(1), aspectDefinitions: [] }), errorCode('INVALID_POINT'));
  assert.throws(() => calculateIntraChartAspects({ points: Array.from({ length: 129 }, () => ({})), aspectDefinitions: [] }), errorCode('INVALID_POINTS'));
  assert.throws(() => calculateIntraChartAspects({ points: [], aspectDefinitions: new Array(65) }), errorCode('INVALID_ASPECTS'));
  assert.throws(() => calculateIntraChartAspects({ points: [], aspectDefinitions: new Array(1) }), errorCode('INVALID_ASPECT'));
});

test('rejects duplicate, blank, padded or oversized point identifiers', () => {
  const defs = [];
  for (const points of [
    [{ id: 'Sun', longitudeDeg: 0 }, { id: 'Sun', longitudeDeg: 1 }],
    [{ id: '  ', longitudeDeg: 0 }],
    [{ id: ' Sun ', longitudeDeg: 0 }],
    [{ id: 'x'.repeat(129), longitudeDeg: 0 }],
  ]) {
    assert.throws(() => calculateIntraChartAspects({ points, aspectDefinitions: defs }),
      errorCode(points.length === 2 ? 'DUPLICATE_POINT' : 'INVALID_POINT'));
  }
});

test('rejects nonfinite longitudes, invalid definitions and duplicate aspect ids', () => {
  for (const longitudeDeg of [NaN, Infinity, -Infinity, '90', undefined]) {
    assert.throws(() => calculateIntraChartAspects({
      points: [{ id: 'x', longitudeDeg }], aspectDefinitions: [],
    }), errorCode('INVALID_POINT'));
  }
  const base = [{ id: 'a', longitudeDeg: 0 }, { id: 'b', longitudeDeg: 45 }];
  const invalids = [
    { id: 'sq', angleDeg: -1, maxOrbDeg: 1 },
    { id: 'sq', angleDeg: 181, maxOrbDeg: 1 },
    { id: 'sq', angleDeg: 90, maxOrbDeg: -1 },
    { id: 'sq', angleDeg: 90, maxOrbDeg: 181 },
    { id: 'sq', angleDeg: Infinity, maxOrbDeg: 0 },
    { id: 'sq', angleDeg: 90, maxOrbDeg: NaN },
    { id: ' sq ', angleDeg: 90, maxOrbDeg: 2 },
  ];
  for (const def of invalids) {
    assert.throws(() => calculateIntraChartAspects({ points: base, aspectDefinitions: [def] }), errorCode('INVALID_ASPECT'));
  }
  assert.throws(() => calculateIntraChartAspects({
    points: base, aspectDefinitions: [conjunction, conjunction],
  }), errorCode('DUPLICATE_ASPECT'));
});

test('three same-longitude points create exactly three unordered edges', () => {
  const facts = calculateIntraChartAspects({
    points: ['a', 'b', 'c'].map((id) => ({ id, longitudeDeg: 30 })),
    aspectDefinitions: [{ id: 'conj', angleDeg: 0, maxOrbDeg: 0 }],
  });
  assert.deepEqual(facts.map(({ pointAId, pointBId }) => `${pointAId}-${pointBId}`),
    ['a-b', 'a-c', 'b-c']);
});

test('never invokes custom input iterators or maps',()=>{
  let called=0;
  const points=[{id:'A',longitudeDeg:0},{id:'B',longitudeDeg:90}];
  const aspectDefinitions=[{id:'square',angleDeg:90,maxOrbDeg:0}];
  for(const arr of [points,aspectDefinitions]){
    arr[Symbol.iterator]=()=>{called++;throw Error('iterator invoked');};
    arr.map=()=>{called++;throw Error('map invoked');};
  }
  const facts=calculateIntraChartAspects({points,aspectDefinitions});
  assert.equal(facts.length,1);assert.equal(called,0);
});
test('snapshots point and aspect getters exactly once',()=>{
  let reads=0,angleReads=0,orbReads=0;
  const p={id:'A'},def={id:'square'};
  Object.defineProperty(p,'longitudeDeg',{get(){return ++reads===1?0:NaN;}});
  Object.defineProperty(def,'angleDeg',{get(){return ++angleReads===1?90:NaN;}});
  Object.defineProperty(def,'maxOrbDeg',{get(){return ++orbReads===1?0:NaN;}});
  const res=calculateIntraChartAspects({points:[p,{id:'B',longitudeDeg:90}],aspectDefinitions:[def]});
  assert.equal(res.length,1);assert.equal(reads,1);assert.equal(angleReads,1);assert.equal(orbReads,1);
});
test('rejects sparse own slots regardless of synthetic iterators',()=>{
  const points=new Array(1);points[Symbol.iterator]=function*(){yield {id:'A',longitudeDeg:0};};
  assert.throws(()=>calculateIntraChartAspects({points,aspectDefinitions:[]}),errorCode('INVALID_POINT'));
  const aspectDefinitions=new Array(1);
  aspectDefinitions[Symbol.iterator]=function*(){yield {id:'square',angleDeg:0,maxOrbDeg:0};};
  assert.throws(()=>calculateIntraChartAspects({points:[],aspectDefinitions}),errorCode('INVALID_ASPECT'));
});
