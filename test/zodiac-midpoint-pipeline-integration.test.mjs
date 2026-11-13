import test from 'node:test';
import assert from 'node:assert/strict';
import {AstrologyError, calculateNatalWithProvider} from '../src/index.mjs';
import {calculateZodiacMidpointContactMatrix as matrix} from '../src/zodiac-midpoint-contact-matrix.mjs';
import {filterZodiacMidpointContactMatrix as filter} from '../src/zodiac-midpoint-matrix-filter.mjs';
import {calculateZodiacMidpointContacts as contacts} from '../src/zodiac-midpoint-contact.mjs';

const p=(name,longitudeDeg)=>({name,longitudeDeg});
const fixture=()=>({
  sourcePoints:[p('Sun',350),p('Moon',10)],
  targetPoints:[p('Mars',0),p('Venus',180),p('Sun',350)],
  maxOrbDeg:1,
});
const view=(m,other={})=>filter({
  matrix:m,sourceNames:null,targetNames:null,maxOrbDeg:m.maxOrbDeg,
  excludePairMembers:false,...other,
});

test('real named longitudes flow through the pair catalog, matrix and filter',()=>{
  const m=matrix(fixture()), v=view(m);
  assert.equal(m.pairCount,1);
  assert.equal(m.cellCount,3);
  assert.equal(m.matchedCellCount,2);
  assert.equal(v.matchedCellCount,2);
  assert.deepEqual(v.matchedCells.map(x=>x.targetName),['Mars','Venus']);
  assert.deepEqual(v.rows[0].midpointAxis.axisLongitudesDeg,[0,180]);
  for(const x of v.matchedCells){
    const direct=contacts({firstLongitudeDeg:10,secondLongitudeDeg:350,
      targetLongitudeDeg:x.targetLongitudeDeg,maxOrbDeg:1});
    assert.deepEqual(x.matchingAxisLongitudesDeg,direct.matchingAxisLongitudesDeg);
  }
});

test('widening a filter orb finds stored original nonmatches without mutation',()=>{
  const m=matrix(fixture()), snapshot=JSON.stringify(m);
  assert.equal(m.maxOrbDeg,1);
  assert.equal(view(m,{maxOrbDeg:0}).matchedCellCount,2);
  const wider=view(m,{maxOrbDeg:10});
  assert.equal(wider.matchedCellCount,3);
  assert.deepEqual(wider.matchedCells.map(x=>x.targetName),['Mars','Sun','Venus']);
  assert.equal(JSON.stringify(m),snapshot);
});

test('self-exclusion removes pair-member names but not coincident different-name targets',()=>{
  const m=matrix({sourcePoints:[p('Sun',0),p('Moon',0)],
    targetPoints:[p('Sun',0),p('Alias',0)],maxOrbDeg:0});
  assert.equal(view(m).matchedCellCount,2);
  const v=view(m,{excludePairMembers:true});
  assert.deepEqual(v.matchedCells.map(x=>x.targetName),['Alias']);
  assert.equal(v.excludedPairMemberCount,1);
  assert.equal(v.consideredCellCount,1);
});

test('source and target selectors retain a single named pair and target',()=>{
  const m=matrix({sourcePoints:[p('Sun',350),p('Moon',10),p('Venus',90)],
    targetPoints:[p('Mars',0),p('Jupiter',180)],maxOrbDeg:2});
  const v=view(m,{sourceNames:['Sun','Moon'],targetNames:['Mars']});
  assert.equal(m.pairCount,3);
  assert.equal(v.selectedPairCount,1);
  assert.equal(v.consideredCellCount,1);
  assert.deepEqual(v.rows.map(x=>[x.firstName,x.secondName]),[['Moon','Sun']]);
  assert.deepEqual(v.matchedCells.map(x=>x.targetName),['Mars']);
});

test('explicit [] selectors produce no selected pairs or targets, unlike null',()=>{
  const m=matrix(fixture());
  assert.equal(view(m,{sourceNames:[]}).selectedPairCount,0);
  assert.equal(view(m,{sourceNames:[]}).matchedCellCount,0);
  assert.equal(view(m,{targetNames:[]}).selectedPairCount,1);
  assert.equal(view(m,{targetNames:[]}).consideredCellCount,0);
});

test('exact 180 degree opposition never chooses a shortest-arc midpoint',()=>{
  const m=matrix({sourcePoints:[p('Sun',0),p('Moon',180)],
    targetPoints:[p('Mars',90)],maxOrbDeg:0});
  const v=view(m);
  assert.equal(v.matchedCellCount,1);
  assert.deepEqual(v.rows[0].midpointAxis.axisLongitudesDeg,[90,270]);
  assert.equal(v.rows[0].midpointAxis.hasUniqueShortArcMidpoint,false);
  assert.equal(v.rows[0].midpointAxis.shortArcMidpointDeg,null);
});

test('at inclusive 90 degree orb a double-axis hit is one matrix cell',()=>{
  const m=matrix({sourcePoints:[p('Sun',350),p('Moon',10)],
    targetPoints:[p('Mars',90)],maxOrbDeg:0});
  assert.equal(m.matchedCellCount,0);
  const v=view(m,{maxOrbDeg:90});
  assert.equal(v.matchedCellCount,1);
  assert.deepEqual(v.matchedCells[0].matchingAxisLongitudesDeg,[0,180]);
});

test('source and target reordering preserves every matrix and view fact',()=>{
  const input=fixture(), m=matrix(input);
  const reordered=matrix({...input,sourcePoints:[...input.sourcePoints].reverse(),
    targetPoints:[...input.targetPoints].reverse()});
  assert.deepEqual(reordered,m);
  assert.deepEqual(view(m,{maxOrbDeg:10,excludePairMembers:true}),
    view(reordered,{maxOrbDeg:10,excludePairMembers:true}));
});

test('outputs remain frozen snapshots after caller mutates input points',()=>{
  const input=fixture(), m=matrix(input), v=view(m,{maxOrbDeg:10});
  input.sourcePoints[0].longitudeDeg=45;
  input.targetPoints[0].longitudeDeg=90;
  assert.equal(v.matchedCells[0].targetLongitudeDeg,0);
  for(const x of [m,m.sourceCatalog,m.rows,v,v.filters,v.rows,v.rows[0],
    v.matchedCells,v.matchedCells[0],v.matchedCells[0].matchingAxisLongitudesDeg]){
    assert.ok(Object.isFrozen(x));
  }
  assert.throws(()=>{v.matchedCells[0].targetName='changed';},TypeError);
  assert.equal(v.interpretation,'FACTS_ONLY');
});

test('real matrix rejects nonnumeric geometry and view rejects unknown names or orb',()=>{
  assert.throws(()=>matrix({...fixture(),sourcePoints:[p('Sun',NaN),p('Moon',10)]}),
    e=>e instanceof AstrologyError&&e.code==='INVALID_ANGLE');
  const m=matrix(fixture());
  assert.throws(()=>view(m,{maxOrbDeg:NaN}),
    e=>e instanceof AstrologyError&&e.code==='INVALID_MATRIX_FILTER_ORB');
  assert.throws(()=>view(m,{targetNames:['Unknown']}),
    e=>e instanceof AstrologyError&&e.code==='INVALID_MATRIX_FILTER_SELECTION');
});

test('actual maximum-size matrix flows through the filter with 15,872 cells',()=>{
  const sourcePoints=Array.from({length:32},(_,i)=>p('S'+String(i).padStart(2,'0'),i*11.25));
  const targetPoints=Array.from({length:32},(_,i)=>p('T'+String(i).padStart(2,'0'),i*11.25));
  const m=matrix({sourcePoints,targetPoints,maxOrbDeg:0}), v=view(m,{maxOrbDeg:90});
  assert.equal(m.pairCount,496);
  assert.equal(m.cellCount,15872);
  assert.equal(v.selectedPairCount,496);
  assert.equal(v.consideredCellCount,15872);
  assert.equal(v.matchedCellCount,15872);
  assert.equal(v.activePairCount,496);
});

test('synthetic apparent-of-date provider natal facts compose with matrix and view',async()=>{
  const longitudes={Sun:350,Moon:10,Mars:0,Venus:180}, requests=[];
  const provider={getGeocentricEcliptic:async({bodyName,corrections,frame})=>{
    requests.push([bodyName,corrections,frame]);
    return {longitudeDeg:longitudes[bodyName],latitudeDeg:0,
      metadata:{center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT',
        engineVersion:'synthetic-test-only'}};
  }};
  const natal=await calculateNatalWithProvider({
    datetimeUtc:'2026-11-13T12:00:00Z',latitudeDeg:44,longitudeDegEast:11,
    bodyNames:Object.keys(longitudes),provider,
  });
  assert.equal(natal.contract,'NatalChartResult');
  assert.equal(natal.houses,null);
  assert.equal(requests.length,4);
  for(const [,corrections,frame] of requests){
    assert.equal(corrections,'APPARENT');
    assert.equal(frame,'ECLIPTIC_OF_DATE');
  }
  const points=Object.values(natal.bodies).map(x=>p(x.name,x.longitudeDeg));
  const m=matrix({sourcePoints:points,targetPoints:points,maxOrbDeg:0});
  const v=view(m,{excludePairMembers:true});
  assert.equal(m.pairCount,6);
  assert.equal(m.cellCount,24);
  assert.equal(v.consideredCellCount,12);
  assert.ok(v.matchedCells.some(x=>x.firstName==='Moon'&&x.secondName==='Sun'&&x.targetName==='Mars'));
});

test('incompatible geometric J2000 mock provider fails before any matrix creation',async()=>{
  const provider={getGeocentricEcliptic:async()=>({
    longitudeDeg:10,latitudeDeg:0,
    metadata:{center:'EARTH',frame:'J2000',corrections:'GEOMETRIC'},
  })};
  await assert.rejects(()=>calculateNatalWithProvider({
    datetimeUtc:'2026-11-13T12:00:00Z',latitudeDeg:0,longitudeDegEast:0,
    bodyNames:['Sun'],provider,
  }),e=>e instanceof AstrologyError&&e.code==='INCOMPATIBLE_EPHEMERIS');
});
