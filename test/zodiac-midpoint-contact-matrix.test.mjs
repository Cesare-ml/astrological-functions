import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError } from '../src/index.mjs';
import { calculateZodiacMidpointContactMatrix as matrix } from '../src/zodiac-midpoint-contact-matrix.mjs';
import { calculateZodiacMidpointCatalog as catalog } from '../src/zodiac-midpoint-catalog.mjs';
import { calculateZodiacMidpointTargetSweep as sweep } from '../src/zodiac-midpoint-target-sweep.mjs';

const p = (name, longitudeDeg) => ({name, longitudeDeg});
const base = () => ({
  sourcePoints: [p('B',10),p('C',90),p('A',350)],
  targetPoints: [p('Z',45),p('Y',180),p('X',0)],
  maxOrbDeg:2,
});

test('creates all source pairs × all targets, with exact two matches', () => {
  const m = matrix(base());
  assert.equal(m.contract,'ZodiacMidpointContactMatrix');
  assert.equal(m.contractVersion,'0.1.0-experimental');
  assert.equal(m.pairCount,3);
  assert.equal(m.targetCount,3);
  assert.equal(m.cellCount,9);
  assert.equal(m.matchedCellCount,2);
  assert.equal(m.activePairCount,1);
  assert.deepEqual(m.targetPoints.map(x=>x.name),['X','Y','Z']);
  assert.deepEqual(m.rows.map(x=>[x.firstName,x.secondName]),[['A','B'],['A','C'],['B','C']]);
  assert.deepEqual(m.matchedCells.map(x=>[x.firstName,x.secondName,x.targetName]),
    [['A','B','X'],['A','B','Y']]);
  assert.deepEqual(m.rows[0].midpointAxis.axisLongitudesDeg,[0,180]);
  assert.equal(m.rows[0].targetSweep.matchCount,2);
  assert.equal(m.rows[1].targetSweep.matchCount,0);
});

test('permutations of source and target arrays preserve the entire matrix', () => {
  const input = base();
  const a = matrix(input);
  const b = matrix({...input,
    sourcePoints:[...input.sourcePoints].reverse(),
    targetPoints:[input.targetPoints[1],input.targetPoints[2],input.targetPoints[0]],
  });
  assert.deepEqual(a,b);
});

test('each nested row uses the exact existing catalog and sweep semantics', () => {
  const input = base();
  const m=matrix(input), c=catalog({points:input.sourcePoints});
  assert.deepEqual(m.sourceCatalog,c);
  for(const [i,row] of m.rows.entries()) {
    const pair=c.pairs[i];
    assert.deepEqual(row.midpointAxis,pair.midpointAxis);
    const a=c.points.find(x=>x.name===pair.firstName).longitudeDeg;
    const b=c.points.find(x=>x.name===pair.secondName).longitudeDeg;
    assert.deepEqual(row.targetSweep,sweep({firstLongitudeDeg:a,secondLongitudeDeg:b,
      targetPoints:input.targetPoints,maxOrbDeg:input.maxOrbDeg}));
  }
});

test('exact opposition returns both axes but no arbitrary shortest-arc midpoint', () => {
  const m=matrix({sourcePoints:[p('Sun',0),p('Moon',180)],targetPoints:[p('Venus',90)],maxOrbDeg:0});
  assert.deepEqual(m.rows[0].midpointAxis.axisLongitudesDeg,[90,270]);
  assert.equal(m.rows[0].midpointAxis.shortArcMidpointDeg,null);
  assert.equal(m.rows[0].targetSweep.matchedTargetNames[0],'Venus');
  assert.equal(m.matchedCellCount,1);
});

test('at 90° orb, a target can match both axes but counts once per cell', () => {
  const m=matrix({sourcePoints:[p('A',350),p('B',10)],targetPoints:[p('C',90)],maxOrbDeg:90});
  assert.deepEqual(m.matchedCells[0].matchingAxisLongitudesDeg,[0,180]);
  assert.equal(m.pairCount,1);
  assert.equal(m.cellCount,1);
  assert.equal(m.matchedCellCount,1);
});

test('zero orb is exact and off-axis values remain present as nonmatches', () => {
  const m=matrix({sourcePoints:[p('A',350),p('B',10)],targetPoints:[p('Exact',0),p('Near',0.001)],maxOrbDeg:0});
  assert.deepEqual(m.matchedCells.map(x=>x.targetName),['Exact']);
  assert.deepEqual(m.rows[0].targetSweep.targets.map(x=>x.hasContact),[true,false]);
});

test('source and target are distinct namespaces: matching names are NOT implicitly excluded', () => {
  const m=matrix({sourcePoints:[p('Sun',0),p('Moon',0)],targetPoints:[p('Sun',0)],maxOrbDeg:0});
  assert.equal(m.matchedCellCount,1);
  assert.equal(m.matchedCells[0].targetName,'Sun');
});

test('32 source and 32 target positions produce exactly 15,872 bounded cells', () => {
  const sources=Array.from({length:32},(_,i)=>p('S'+String(i).padStart(2,'0'),i*11.25));
  const targets=Array.from({length:32},(_,i)=>p('T'+String(i).padStart(2,'0'),(i*11.25+1)%360));
  const m=matrix({sourcePoints:sources,targetPoints:targets,maxOrbDeg:0.01});
  assert.equal(m.pairCount,496);
  assert.equal(m.targetCount,32);
  assert.equal(m.cellCount,15872);
  assert.equal(m.rows.length,496);
  assert.equal(m.matchedCellCount,m.matchedCells.length);
  assert.equal(m.activePairCount,m.rows.filter(x=>x.targetSweep.hasContact).length);
});

test('fails closed for missing or malformed outer fields',()=>{
  for(const x of [null,undefined,0,[],{},'wrong',
    {sourcePoints:[],targetPoints:[]},
    {sourcePoints:[],maxOrbDeg:1},
    {targetPoints:[],maxOrbDeg:1}]) {
    assert.throws(()=>matrix(x),e=>e instanceof AstrologyError && e.code==='INVALID_MIDPOINT_MATRIX');
  }
});

test('source points must pass catalog bounds and unique-name rules',()=>{
  for(const sources of [[],[p('Sun',0)],Array.from({length:33},(_,i)=>p('S'+i,i))]){
    assert.throws(()=>matrix({...base(),sourcePoints:sources}),e=>e.code==='INVALID_MIDPOINT_CATALOG');
  }
  assert.throws(()=>matrix({...base(),sourcePoints:[p('Sun',0),p('Sun',90)]}),e=>e.code==='DUPLICATE_MIDPOINT_POINT');
});

test('target points must pass sweep length and unique-name rules',()=>{
  for(const targets of [[],Array.from({length:33},(_,i)=>p('T'+i,i))]) {
    assert.throws(()=>matrix({...base(),targetPoints:targets}),e=>e.code==='INVALID_MIDPOINT_TARGET_SWEEP');
  }
  assert.throws(()=>matrix({...base(),targetPoints:[p('Sun',0),p('Sun',10)]}),e=>e.code==='DUPLICATE_MIDPOINT_TARGET');
});

test('sparse source and target arrays are both rejected',()=>{
  const source = Array(3);source[0]=p('A',0);source[2]=p('B',90);
  const targets=Array(2);targets[0]=p('X',90);
  assert.throws(()=>matrix({...base(),sourcePoints:source}),e=>e.code==='INVALID_MIDPOINT_CATALOG');
  assert.throws(()=>matrix({...base(),targetPoints:targets}),e=>e.code==='INVALID_MIDPOINT_TARGET_SWEEP');
});

test('nonfinite positions or invalid orb are rejected by the upstream contracts',()=>{
  assert.throws(()=>matrix({...base(),sourcePoints:[p('A',NaN),p('B',10)]}),e=>e.code==='INVALID_ANGLE');
  assert.throws(()=>matrix({...base(),targetPoints:[p('A',Infinity)]}),e=>e.code==='INVALID_ANGLE');
  for(const orb of [undefined,null,NaN,-1,90.01,Infinity,'1']) {
    assert.throws(()=>matrix({...base(),maxOrbDeg:orb}),e=>e.code==='INVALID_MIDPOINT_CONTACT_ORB');
  }
});

test('nested facts are immutable snapshots, independent of later caller mutations',()=>{
  const data=base();const m=matrix(data);
  data.sourcePoints[0].longitudeDeg=44;
  data.targetPoints[0].longitudeDeg=55;
  assert.deepEqual(m.sourceCatalog.points.map(x=>x.longitudeDeg),[350,10,90]);
  assert.deepEqual(m.targetPoints.map(x=>x.longitudeDeg),[0,180,45]);
  for(const value of [m,m.sourceCatalog,m.targetPoints,m.targetPoints[0],m.rows,m.rows[0],m.rows[0].targetSweep,m.matchedCells,m.matchedCells[0]]){
    assert.ok(Object.isFrozen(value));
  }
  assert.throws(()=>{m.rows[0].firstName='Changed'},TypeError);
  assert.throws(()=>{m.matchedCells[0].targetName='Changed'},TypeError);
  assert.equal(m.calculationBasis,'ECLIPTIC_LONGITUDE_GEOMETRY');
  assert.equal(m.interpretation,'FACTS_ONLY');
  assert.ok(!Object.hasOwn(m,'ephemeris'));
  assert.ok(!Object.hasOwn(m,'synodicPhase'));
});

test('normalized longitude and source ordering are stable across zodiac boundary',()=>{
  const a=matrix({sourcePoints:[p('B',730),p('A',-10)],targetPoints:[p('X',-360)],maxOrbDeg:0});
  const b=matrix({sourcePoints:[p('A',350),p('B',10)],targetPoints:[p('X',0)],maxOrbDeg:0});
  assert.deepEqual(a,b);
});
