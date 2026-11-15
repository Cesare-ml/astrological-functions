import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError } from '../src/index.mjs';
import { calculateZodiacMidpointCatalog as catalog } from '../src/zodiac-midpoint-catalog.mjs';

const point = (name, longitudeDeg) => ({ name, longitudeDeg });
const pairsOf = (...points) => catalog({points});

test('two points yield one axis with 0/360 wrap', () => {
  const facts = pairsOf(point('Sun',350),point('Moon',10));
  assert.equal(facts.pairCount,1);
  assert.equal(facts.pairs[0].firstName,'Moon');
  assert.equal(facts.pairs[0].secondName,'Sun');
  assert.deepEqual(facts.pairs[0].midpointAxis.axisLongitudesDeg,[0,180]);
});

test('three points yield three unordered, non-self pairs', () => {
  const facts = pairsOf(point('Venus',10),point('Sun',20),point('Moon',30));
  assert.deepEqual(facts.pairs.map(p=>[p.firstName,p.secondName]),
    [['Moon','Sun'],['Moon','Venus'],['Sun','Venus']]);
  assert.equal(facts.pairCount,3);
});

test('permuting points does not change the result', () => {
  const a = [point('Venus',10),point('Sun',100),point('Moon',300)];
  assert.deepEqual(catalog({points:a}),catalog({points:[a[1],a[2],a[0]]}));
});

test('maximum 32 points yield 496 unique pairs', () => {
  const p=Array.from({length:32},(_,i)=>point(`P${String(i).padStart(2,'0')}`,i*10));
  const facts=catalog({points:p});
  assert.equal(facts.pairCount,496);
  assert.equal(facts.pairs.length,496);
  assert.equal(new Set(facts.pairs.map(f=>f.firstName+'|'+f.secondName)).size,496);
});

test('rejects empty, singleton and more than 32 points', () => {
  for (const invalid of [[],[point('Sun',10)],Array.from({length:33},(_,i)=>point(`P${i}`,i))]) {
    assert.throws(()=>catalog({points:invalid}),e=>e.code==='INVALID_MIDPOINT_CATALOG');
  }
});

test('rejects sparse point arrays rather than silently dropping holes', () => {
  const p = Array(3);p[0]=point('Sun',0);p[2]=point('Moon',100);
  assert.throws(()=>catalog({points:p}),e=>e.code==='INVALID_MIDPOINT_CATALOG');
});

test('rejects invalid outer structure and non-array points', () => {
  for (const v of [null,undefined,0,'bad',[],{}, {points:{}},{points:'Sun'}]) {
    assert.throws(()=>catalog(v),e=>e instanceof AstrologyError&&e.code==='INVALID_MIDPOINT_CATALOG');
  }
});

test('rejects malformed names and items without implicit trimming', () => {
  const invalid=[null,undefined,[],3,{}, {name:'',longitudeDeg:0},
    {name:' ',longitudeDeg:0},{name:' Sun',longitudeDeg:0},
    {name:'Sun ',longitudeDeg:0},{name:0,longitudeDeg:0}];
  for(const item of invalid){
    assert.throws(()=>pairsOf(point('Moon',10),item),e=>e.code==='INVALID_MIDPOINT_POINT');
  }
});

test('rejects duplicate names even when their positions differ', () => {
  assert.throws(()=>pairsOf(point('Moon',1),point('Moon',2)),
    e=>e instanceof AstrologyError&&e.code==='DUPLICATE_MIDPOINT_POINT');
});

test('preserves case-sensitive distinct names and unusual safe keys', () => {
  const facts=pairsOf(point('__proto__',0),point('sun',60),point('Sun',120));
  assert.equal(facts.pairCount,3);
  assert.deepEqual(facts.points.map(p=>p.name),['Sun','__proto__','sun']);
});

test('rejects invalid longitude via the canonical normalize360 contract', () => {
  for(const value of [undefined,null,'0',NaN,Infinity,-Infinity,{},[]]){
    assert.throws(()=>pairsOf(point('A',0),point('B',value)),
      e=>e instanceof AstrologyError&&e.code==='INVALID_ANGLE');
  }
});

test('exact opposition preserves ambiguous midpoint choice', () => {
  const facts=pairsOf(point('A',0),point('B',180));
  const axis=facts.pairs[0].midpointAxis;
  assert.deepEqual(axis.axisLongitudesDeg,[90,270]);
  assert.equal(axis.hasUniqueShortArcMidpoint,false);
  assert.equal(axis.shortArcMidpointDeg,null);
});

test('coincident points still form a legitimate pair', () => {
  const facts=pairsOf(point('A',360),point('B',0));
  assert.deepEqual(facts.pairs[0].midpointAxis.axisLongitudesDeg,[0,180]);
  assert.deepEqual(facts.points.map(p=>p.longitudeDeg),[0,0]);
});

test('all nested results are frozen and detached from mutable input', () => {
  const original=[point('B',350),point('A',10)];
  const facts=catalog({points:original});
  original[0].longitudeDeg=42; original.push(point('C',0));
  assert.equal(facts.points.length,2);
  assert.equal(facts.points[1].longitudeDeg,350);
  assert.equal(facts.pairCount,1);
  assert.ok(Object.isFrozen(facts));
  assert.ok(Object.isFrozen(facts.points));
  assert.ok(Object.isFrozen(facts.points[0]));
  assert.ok(Object.isFrozen(facts.pairs));
  assert.ok(Object.isFrozen(facts.pairs[0]));
  assert.ok(Object.isFrozen(facts.pairs[0].midpointAxis));
  assert.throws(()=>{facts.points[0].longitudeDeg=90},TypeError);
});

test('result contains only geometry facts and not interpretation or astronomy', () => {
  const facts=pairsOf(point('Sun',0),point('Moon',30));
  assert.equal(facts.contract,'ZodiacMidpointCatalog');
  assert.equal(facts.contractVersion,'0.1.0-experimental');
  assert.equal(facts.calculationBasis,'ECLIPTIC_LONGITUDE_GEOMETRY');
  assert.equal(facts.interpretation,'FACTS_ONLY');
  assert.equal('ephemeris' in facts,false);
  assert.equal('synodicMotion' in facts,false);
});

test('snapshots mutable point name before validating and publishing',()=>{
  const item={longitudeDeg:0};let reads=0;
  Object.defineProperty(item,'name',{get(){return ++reads===1?'Sun':' BAD ';}});
  const result=catalog({points:[item,{name:'Moon',longitudeDeg:180}]});
  assert.equal(result.pairs[0].firstName,'Moon');
  assert.equal(result.pairs[0].secondName,'Sun');
  assert.equal(reads,1);
});
test('captures points array once and never runs caller iterable',()=>{
  const points=[{name:'A',longitudeDeg:0},{name:'B',longitudeDeg:90}];
  let reads=0,iteratorCalls=0;
  points[Symbol.iterator]=()=>{iteratorCalls++;throw Error('forged iterator');};
  const input={};
  Object.defineProperty(input,'points',{get(){return ++reads===1?points:[];}});
  const out=catalog(input);
  assert.equal(out.pairCount,1);assert.equal(reads,1);assert.equal(iteratorCalls,0);
});
