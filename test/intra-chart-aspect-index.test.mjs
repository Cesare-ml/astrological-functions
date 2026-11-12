import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateIntraChartAspects } from '../src/intra-chart-aspects.mjs';
import { indexIntraChartAspects } from '../src/intra-chart-aspect-index.mjs';

const points = [
  { id: 'Sun', longitudeDeg: 359 },
  { id: 'Moon', longitudeDeg: 2 },
  { id: 'Mars', longitudeDeg: 179 },
  { id: 'Venus', longitudeDeg: 72 },
];
const definitions = [{ id: 'conjunction', angleDeg: 0, maxOrbDeg: 3 },
  { id: 'opposition', angleDeg: 180, maxOrbDeg: 2 }];
const facts = () => calculateIntraChartAspects({points, aspectDefinitions:definitions});
const make = (pointIds = points.map(p=>p.id), edges = facts()) =>
  indexIntraChartAspects({ pointIds, facts: edges });
const failsWith = (fn, code) => assert.throws(fn, e => e?.code === code && e.name === 'AstrologyError');

test('integrates PR #30 fact engine into symmetrical point lookups', () => {
  const result = make();
  assert.equal(result.contract, 'IntraChartAspectIndex');
  assert.equal(result.pointCount, 4);
  assert.equal(result.factCount, 2);
  assert.equal(result.nodes.length, 4);
  assert.deepEqual(result.nodes.map(n=>n.pointId), ['Mars','Moon','Sun','Venus']);
  const sun = result.nodes.find(n=>n.pointId === 'Sun');
  assert.deepEqual(sun.connections.map(c=>[c.otherPointId,c.aspectId]),
    [['Mars','opposition'],['Moon','conjunction']]);
  assert.deepEqual(result.nodes.find(n=>n.pointId==='Moon').connections.map(c=>c.otherPointId), ['Sun']);
  assert.equal(result.nodes.find(n=>n.pointId==='Venus').connections.length,0);
  assert.equal(sun.connections[1].absoluteOrbDeg,3);
});

test('independent of pointIds and fact order', () => {
  const a = make();
  const b = make(points.map(p=>p.id).reverse(), facts().slice().reverse());
  assert.deepEqual(a,b);
});

test('overlapping aspect definitions produce separate symmetric lookup entries', () => {
  const f = calculateIntraChartAspects({
    points:[{id:'A',longitudeDeg:0},{id:'B',longitudeDeg:0}],
    aspectDefinitions:[{id:'z',angleDeg:0,maxOrbDeg:2},{id:'a',angleDeg:0,maxOrbDeg:0}],
  });
  const result=make(['A','B'],f);
  assert.deepEqual(result.nodes[0].connections.map(c=>c.aspectId),['a','z']);
  assert.equal(result.nodes[1].connections.length,2);
});

test('empty or isolated chart is represented explicitly', () => {
  assert.deepEqual(make([],[]).nodes,[]);
  const result=make(['Alone'],[]);
  assert.deepEqual(result.nodes[0], {pointId:'Alone',connections:[]});
});

test('rejects duplicate point ids and malformed graph arrays', () => {
  failsWith(()=>make(['Sun','Sun'],[]),'DUPLICATE_POINT');
  failsWith(()=>indexIntraChartAspects(),'INVALID_ASPECT_INDEX');
  failsWith(()=>make(new Array(1),[]),'INVALID_ASPECT_INDEX');
  failsWith(()=>make(['A'],new Array(1)),'INVALID_ASPECT_FACT');
  failsWith(()=>make(Array.from({length:129},(_,i)=>`P${i}`),[]),'INVALID_ASPECT_INDEX');
});

test('rejects dangling edges, self-aspects and malformed identifiers', () => {
  const original=facts()[0];
  failsWith(()=>make(['Sun'],[original]),'UNKNOWN_POINT');
  failsWith(()=>make(['Sun'],[{...original,pointBId:'Sun'}]),'INVALID_ASPECT_FACT');
  failsWith(()=>make(['Sun','Moon'],[{...original,aspectId:'  '}]),'INVALID_ASPECT_INDEX');
  failsWith(()=>make([' Sun '],[]),'INVALID_ASPECT_INDEX');
});

test('rejects duplicate unordered/aspect edge even when reversed', () => {
  const original=facts()[0];
  const reversed={...original,pointAId:original.pointBId,pointBId:original.pointAId};
  failsWith(()=>make(points.map(p=>p.id),[original,reversed]),'DUPLICATE_ASPECT_FACT');
});

test('rejects nonfinite, inconsistent and out-of-orb source geometry', () => {
  const f=facts()[0];
  for(const patch of [
    {actualAngleDeg:NaN},{exactAngleDeg:-1},{configuredMaxOrbDeg:Infinity},
    {signedOrbDeg:5},{absoluteOrbDeg:5},{configuredMaxOrbDeg:0},
  ]) failsWith(()=>make(points.map(p=>p.id),[{...f,...patch}]),'INVALID_ASPECT_FACT');
});

test('outputs detached immutable snapshots, not aliases to input', () => {
  const raw={...facts()[0]};
  const result=make(points.map(p=>p.id),[raw]);
  raw.aspectId='changed';
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.nodes));
  assert.ok(Object.isFrozen(result.nodes[0]));
  assert.ok(Object.isFrozen(result.nodes[0].connections));
  const sun = result.nodes.find(n=>n.pointId==='Sun');
  assert.ok(Object.isFrozen(sun.connections[0]));
  assert.notEqual(sun.connections[0].aspectId,'changed');
  assert.throws(()=>result.nodes.push({}),TypeError);
});

test('untrusted object-key-like point ids are safe and JSON serializable', () => {
  const f=calculateIntraChartAspects({
    points:[{id:'__proto__',longitudeDeg:0},{id:'constructor',longitudeDeg:90}],
    aspectDefinitions:[{id:'square',angleDeg:90,maxOrbDeg:0}],
  });
  const result=make(['__proto__','constructor'],f);
  assert.equal(result.factCount,1);
  assert.equal(JSON.parse(JSON.stringify(result)).nodes.length,2);
  assert.equal({}.polluted, undefined);
});

test('does not make claims of applying, direction or astronomical verification', () => {
  const result=make();
  assert.equal(result.validationStatus,'CALLER_SUPPLIED_FACTS_NOT_ASTRONOMICALLY_VERIFIED');
  assert.equal('direction' in result.nodes[0].connections[0],false);
  assert.equal('applying' in result.nodes[0].connections[0],false);
});
