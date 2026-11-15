import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError } from '../src/index.mjs';
import { calculateZodiacMidpointTargetSweep as sweep } from '../src/zodiac-midpoint-target-sweep.mjs';
import { calculateZodiacMidpointContacts as single } from '../src/zodiac-midpoint-contact.mjs';

const p=(name,longitudeDeg)=>({name,longitudeDeg});
const run=(targets,maxOrbDeg=2)=>sweep({firstLongitudeDeg:350,secondLongitudeDeg:10,targetPoints:targets,maxOrbDeg});

test('screens multiple named targets against both axis endpoints',()=>{
  const facts=run([p('Saturn',170),p('Venus',358),p('Moon',182),p('Sun',45)]);
  assert.deepEqual(facts.midpointAxis.axisLongitudesDeg,[0,180]);
  assert.deepEqual(facts.targets.map(x=>x.name),['Moon','Saturn','Sun','Venus']);
  assert.deepEqual(facts.matchedTargetNames,['Moon','Venus']);
  assert.equal(facts.targetCount,4);
  assert.equal(facts.matchCount,2);
  assert.equal(facts.hasContact,true);
  assert.equal(facts.targets.find(x=>x.name==='Sun').nearestAxisSeparationDeg,45);
});

test('inclusive orb and zero orb have exact documented behavior',()=>{
  assert.deepEqual(run([p('exact',0),p('edge',2),p('outside',2.01)]).matchedTargetNames,['edge','exact']);
  assert.deepEqual(run([p('a',0),p('b',0.00001)],0).matchedTargetNames,['a']);
});

test('90-degree orb can match both antipodal axis values for one target',()=>{
  const f=run([p('Quarter',90)],90);
  assert.deepEqual(f.targets[0].matchingAxisLongitudesDeg,[0,180]);
  assert.deepEqual(f.targets[0].contacts.map(x=>x.separationDeg),[90,90]);
  assert.equal(f.matchCount,1);
});

test('exact opposition preserves the ambiguous shortest arc without inventing a choice',()=>{
  const facts=sweep({firstLongitudeDeg:0,secondLongitudeDeg:180,targetPoints:[p('Moon',90)],maxOrbDeg:0});
  assert.deepEqual(facts.midpointAxis.axisLongitudesDeg,[90,270]);
  assert.equal(facts.midpointAxis.shortArcMidpointDeg,null);
  assert.equal(facts.midpointAxis.hasUniqueShortArcMidpoint,false);
  assert.equal(facts.hasContact,true);
});

test('source reversal and target reordering give identical output',()=>{
  const targets=[p('C',358),p('B',182),p('A',50)];
  const a=run(targets);
  const b=sweep({firstLongitudeDeg:10,secondLongitudeDeg:350,targetPoints:[targets[2],targets[0],targets[1]],maxOrbDeg:2});
  assert.deepEqual(a.targets,b.targets);
  assert.deepEqual(a.midpointAxis.axisLongitudesDeg,b.midpointAxis.axisLongitudesDeg);
  assert.equal(a.midpointAxis.shortArcMidpointDeg,b.midpointAxis.shortArcMidpointDeg);
  assert.deepEqual(a.matchedTargetNames,b.matchedTargetNames);
});

test('individual sweep matches identical public single-target contact calculations',()=>{
  const facts=run([p('Sun',0),p('Moon',180),p('Mars',47)],3);
  for(const t of facts.targets){
    const reference=single({firstLongitudeDeg:350,secondLongitudeDeg:10,targetLongitudeDeg:t.longitudeDeg,maxOrbDeg:3});
    assert.deepEqual(t.contacts,reference.contacts);
    assert.deepEqual(t.matchingAxisLongitudesDeg,reference.matchingAxisLongitudesDeg);
    assert.equal(t.hasContact,reference.hasContact);
  }
});

test('accepts 32 unique targets and returns at most 32 matched names',()=>{
  const targets=Array.from({length:32},(_,i)=>p('T'+String(i).padStart(2,'0'),i*11.25));
  const f=run(targets,1);
  assert.equal(f.targetCount,32);
  assert.equal(f.targets.length,32);
  assert.equal(f.matchCount,f.matchedTargetNames.length);
});

test('rejects invalid outer argument, empty target array and >32 targets',()=>{
  const bad=[null,undefined,[],{},0,'x',{firstLongitudeDeg:0,secondLongitudeDeg:10,maxOrbDeg:1,targetPoints:[]},
    {firstLongitudeDeg:0,secondLongitudeDeg:10,maxOrbDeg:1,targetPoints:Array.from({length:33},(_,i)=>p('T'+i,i))}];
  for(const input of bad)assert.throws(()=>sweep(input),e=>e instanceof AstrologyError&&e.code==='INVALID_MIDPOINT_TARGET_SWEEP');
});

test('rejects sparse target arrays instead of silently dropping holes',()=>{
  const targets=Array(2);targets[0]=p('Sun',0);
  assert.throws(()=>run(targets),e=>e.code==='INVALID_MIDPOINT_TARGET_SWEEP');
});

test('rejects nonunique or malformed target names without implicit trimming',()=>{
  for(const invalid of [null,undefined,[],0,{},p('',0),p(' ',0),p(' Sun',0),p('Sun ',0),{name:7,longitudeDeg:0}]){
    assert.throws(()=>run([p('Moon',3),invalid]),e=>e.code==='INVALID_MIDPOINT_TARGET');
  }
  assert.throws(()=>run([p('Moon',1),p('Moon',3)]),e=>e.code==='DUPLICATE_MIDPOINT_TARGET');
});

test('preserves distinct case-sensitive safe names and canonical sort order',()=>{
  const f=run([p('__proto__',2),p('sun',3),p('Sun',4)]);
  assert.deepEqual(f.targets.map(t=>t.name),['Sun','__proto__','sun']);
});

test('fails closed on nonfinite or nonnumeric target longitudes',()=>{
  for(const invalid of [NaN,Infinity,-Infinity,null,undefined,'0',{},[]]){
    assert.throws(()=>run([p('Moon',invalid)]),e=>e.code==='INVALID_ANGLE');
  }
});

test('delegates invalid source longitude or orb to the primitive',()=>{
  const base={firstLongitudeDeg:350,secondLongitudeDeg:10,targetPoints:[p('Moon',1)],maxOrbDeg:1};
  assert.throws(()=>sweep({...base,firstLongitudeDeg:NaN}),e=>e.code==='INVALID_ANGLE');
  assert.throws(()=>sweep({...base,maxOrbDeg:91}),e=>e.code==='INVALID_MIDPOINT_CONTACT_ORB');
  assert.throws(()=>sweep({...base,maxOrbDeg:undefined}),e=>e.code==='INVALID_MIDPOINT_CONTACT_ORB');
});

test('wrap, immutability, snapshots and no interpretation',()=>{
  const targets=[p('Moon',-360)];
  const f=run(targets);
  targets[0].longitudeDeg=60;
  assert.equal(f.targets[0].longitudeDeg,0);
  assert.equal(f.calculationBasis,'ECLIPTIC_LONGITUDE_GEOMETRY');
  assert.equal(f.interpretation,'FACTS_ONLY');
  assert.equal(f.contract,'ZodiacMidpointTargetSweep');
  for (const item of [f,f.midpointAxis,f.targets,f.targets[0],f.targets[0].contacts,f.targets[0].contacts[0],f.matchedTargetNames])assert.ok(Object.isFrozen(item));
  assert.throws(()=>{f.targets[0].name='change'},TypeError);
  assert.ok(!('synodicPhase' in f));
});

test('snapshots target array, names, longitude and input angles once',()=>{
  const target={};let names=0,lon=0,array=0,first=0,orb=0;
  Object.defineProperty(target,'name',{get(){return ++names===1?'T':' INVALID ';}});
  Object.defineProperty(target,'longitudeDeg',{get(){return ++lon===1?0:NaN;}});
  const request={secondLongitudeDeg:10};
  Object.defineProperty(request,'firstLongitudeDeg',{get(){return ++first===1?350:NaN;}});
  Object.defineProperty(request,'maxOrbDeg',{get(){return ++orb===1?0:NaN;}});
  Object.defineProperty(request,'targetPoints',{get(){return ++array===1?[target]:[];}});
  const result=sweep(request);
  assert.equal(result.targetCount,1);assert.equal(result.hasContact,true);
  for(const n of [names,lon,array,first,orb])assert.equal(n,1);
});
