import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSourcedHousePlacementMatrix} from '../src/sourced-house-placement-matrix.mjs';
import {locateLongitudeInHouses} from '../src/index.mjs';

const datetimeUtc='2026-11-13T16:00:00Z';
const longitudeBasis={type:'TROPICAL'};
const source={
  datetimeUtc,frame:'ECLIPTIC_OF_DATE',longitudeBasis,
  observerType:'TOPOCENTRIC',observer:{latitudeDeg:44,longitudeDegEast:11},
  engineVersion:'SYNTHETIC_RUST',kernelSetId:'SYNTHETIC_KERNEL',
  timeModel:'SYNTHETIC_TIME',corrections:'APPARENT',calculationProfileId:'CANONICAL_V1',
};
const snapshot={
  datetimeUtc,frame:'ECLIPTIC_OF_DATE',longitudeBasis,
  provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
};
const whole={snapshot:{...snapshot,houseSystem:'WHOLE_SIGN',
  cuspsDeg:[330,0,30,60,90,120,150,180,210,240,270,300]},source};
const equal={snapshot:{...snapshot,houseSystem:'EQUAL_ASCENDANT',
  cuspsDeg:[345,15,45,75,105,135,165,195,225,255,285,315]},source};
const porphyry={snapshot:{...snapshot,houseSystem:'PORPHYRY',
  provenanceStatus:'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED',
  cuspsDeg:[10,41.66666666666667,73.33333333333334,105,
    133.33333333333334,161.66666666666666,190,221.66666666666666,
    253.33333333333334,285,313.3333333333333,341.6666666666667]},source};
const positions={source,provenanceStatus:'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
  points:[{id:'SUN',longitudeDeg:0},{id:'MOON',longitudeDeg:345},
    {id:'VENUS',longitudeDeg:30},{id:'MARS',longitudeDeg:200}]};
const base={birthTimeKnown:true,methods:[whole,equal,porphyry],positions};
const build=patch=>buildSourcedHousePlacementMatrix({...base,...patch});
const err=code=>e=>e?.name==='AstrologyError'&&e.code===code;
const labels=['WHOLE_SIGN','EQUAL_ASCENDANT','PORPHYRY'];

test('three systems yield explicit planet-to-house matrix with stable order',()=>{
  const r=build();
  assert.deepEqual(r.methodNames,labels);
  assert.deepEqual(r.rows.map(x=>[x.id,...x.placements.map(p=>p.house)]),[
    ['SUN',2,1,12],['MOON',1,1,12],['VENUS',3,2,1],['MARS',8,8,7],
  ]);
  assert.deepEqual(r.changedPointIds,['SUN','MOON','VENUS','MARS']);
  assert.equal(r.changedCount,4);
  assert.equal(r.pointCount,4);
  assert.equal(r.contract,'SourcedHousePlacementMatrix');
});

test('two systems are sufficient and preserve caller-selected column order',()=>{
  const r=build({methods:[porphyry,equal],positions:{...positions,
    points:[{id:'same',longitudeDeg:10},{id:'diff',longitudeDeg:0}]}});
  assert.deepEqual(r.methodNames,['PORPHYRY','EQUAL_ASCENDANT']);
  assert.deepEqual(r.rows.map(x=>x.placements.map(y=>y.house)),[[1,1],[12,1]]);
  assert.deepEqual(r.changedPointIds,['diff']);
  assert.equal(r.changedCount,1);
});

test('three methods in any order have equivalent per-method assignments',()=>{
  const a=build({methods:[whole,equal,porphyry]});
  const b=build({methods:[porphyry,whole,equal]});
  const byId=rows=>rows.map(row=>Object.fromEntries(row.placements.map(p=>[p.houseSystem,p.house]).sort(([a],[b])=>a.localeCompare(b))));
  assert.deepEqual(byId(a.rows),byId(b.rows));
  assert.deepEqual(a.changedPointIds,b.changedPointIds);
});

test('zero points have no fabricated rows and still validate all sources',()=>{
  const r=build({positions:{...positions,points:[]}});
  assert.deepEqual(r.rows,[]);
  assert.deepEqual(r.changedPointIds,[]);
  assert.equal(r.pointCount,0);
  assert.equal(r.changedCount,0);
});

test('exact cusp, modulo 360 and negative-longitude aliases inherit existing policy',()=>{
  const r=build({positions:{...positions,points:[
    {id:'exact',longitudeDeg:0},{id:'alias',longitudeDeg:360},
    {id:'negative',longitudeDeg:-15},{id:'first',longitudeDeg:330},
  ]}});
  assert.deepEqual(r.rows.map(x=>x.longitudeDeg),[0,0,345,330]);
  assert.deepEqual(r.rows[0].placements.map(x=>x.house),[2,1,12]);
  assert.deepEqual(r.rows[1].placements.map(x=>x.house),[2,1,12]);
  assert.deepEqual(r.rows[2].placements.map(x=>x.house),[1,1,12]);
});

test('unknown or malformed time never creates house positions',()=>{
  for(const birthTimeKnown of [false,undefined,'true',null,0])
    assert.throws(()=>build({birthTimeKnown}),err('BIRTH_TIME_UNKNOWN'));
});

test('rejects less than two or more than three systems and sparse arrays',()=>{
  for(const methods of [null,undefined,[],[whole],[whole,equal,porphyry,whole],
    Array(2),[whole,,porphyry],{}])
    assert.throws(()=>build({methods}),err('INVALID_HOUSE_MATRIX'));
});

test('duplicate labels fail even if cusp snapshots differ',()=>{
  for(const methods of [[whole,whole],[whole,equal,{...whole}]])
    assert.throws(()=>build({methods}),err('DUPLICATE_HOUSE_METHOD'));
});

test('unsupported house names never silently become a fallback',()=>{
  assert.throws(()=>build({methods:[whole,{...equal,snapshot:{...equal.snapshot,houseSystem:'VEHLOW'}}]}),
    err('INVALID_HOUSE_SNAPSHOT'));
  assert.throws(()=>build({methods:[whole,{...equal,snapshot:{...equal.snapshot,houseSystem:null}}]}),
    err('INVALID_HOUSE_MATRIX'));
});

test('a different kernel, time model or profile anywhere in the matrix is rejected',()=>{
  for(const [key,value] of [['kernelSetId','DIFFERENT'],['timeModel','OTHER'],
    ['calculationProfileId','LEGACY']]){
    const bad={...porphyry,source:{...source,[key]:value}};
    assert.throws(()=>build({methods:[whole,equal,bad]}),err('INCOMPATIBLE_SOURCE_CONTEXT'));
  }
});

test('a different observer, clock or zodiac basis anywhere is rejected',()=>{
  for(const patch of [
    {observer:{latitudeDeg:45,longitudeDegEast:11}},
    {datetimeUtc:'2026-11-13T16:00:01Z'},
    {longitudeBasis:{type:'SIDEREAL',ayanamsaId:'TEST'}},
  ]) assert.throws(()=>build({methods:[whole,equal,{...porphyry,source:{...source,...patch}}]}),
    err('INCOMPATIBLE_SOURCE_CONTEXT'));
});

test('a planet-source mismatch is rejected even if three house methods agree',()=>{
  const bad={...positions,source:{...source,kernelSetId:'OTHER'}};
  assert.throws(()=>build({positions:bad}),err('INCOMPATIBLE_POINT_SOURCE_CONTEXT'));
});

test('point IDs, longitudes and source provenance use the original strict gate',()=>{
  for(const points of [
    [{id:'SUN',longitudeDeg:0},{id:'SUN',longitudeDeg:30}],
    [{id:'X',longitudeDeg:NaN}],Array(1),
  ]) assert.throws(()=>build({positions:{...positions,points}}),err('INVALID_POINTS'));
  assert.throws(()=>build({positions:{...positions,provenanceStatus:'VALIDATED'}}),
    err('INVALID_SOURCED_HOUSE_POINTS'));
});

test('invalid geometry in a third method is never ignored',()=>{
  const bad={...porphyry,snapshot:{...porphyry.snapshot,cuspsDeg:Array(12).fill(0)}};
  assert.throws(()=>build({methods:[whole,equal,bad]}),err('INVALID_CUSPS'));
});

test('deeply frozen result is detached from caller mutation',()=>{
  const mutable=structuredClone(base);
  const r=buildSourcedHousePlacementMatrix(mutable);
  mutable.methods[0].snapshot.cuspsDeg[0]=0;
  mutable.positions.points[0].id='MODIFIED';
  mutable.positions.source.kernelSetId='CHANGED';
  assert.equal(r.source.kernelSetId,'SYNTHETIC_KERNEL');
  assert.equal(r.rows[0].id,'SUN');
  assert.equal(r.methodNames[0],'WHOLE_SIGN');
  for(const x of [r,r.source,r.source.observer,r.source.longitudeBasis,r.methodNames,
    r.rows,r.rows[0],r.rows[0].placements,r.rows[0].placements[0],r.changedPointIds])
    assert.ok(Object.isFrozen(x));
  assert.throws(()=>{r.rows[0].placements[0].house=4},TypeError);
  assert.doesNotThrow(()=>JSON.stringify(r));
});

test('top-level malformed structures and unknown keys are explicitly rejected',()=>{
  for(const input of [null,undefined,[],{...base,extra:true}])
    assert.throws(()=>buildSourcedHousePlacementMatrix(input),err('INVALID_HOUSE_MATRIX'));
  assert.throws(()=>buildSourcedHousePlacementMatrix({}),err('BIRTH_TIME_UNKNOWN'));
});

test('result always discloses caller-asserted, not independently verified, origin',()=>{
  const r=build();
  assert.equal(r.status,'MATCHING_CALLER_ASSERTED_SOURCES_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(r.pointProvenanceStatus,'CALLER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED');
});

test('pairwise deltas cover all three unordered house-method pairs in caller order',()=>{
  const r=build();
  assert.deepEqual(r.pairwiseChanges.map(x=>[x.leftHouseSystem,x.rightHouseSystem,x.changedCount,x.changedPointIds]),[
    ['WHOLE_SIGN','EQUAL_ASCENDANT',2,['SUN','VENUS']],
    ['WHOLE_SIGN','PORPHYRY',4,['SUN','MOON','VENUS','MARS']],
    ['EQUAL_ASCENDANT','PORPHYRY',4,['SUN','MOON','VENUS','MARS']],
  ]);
  assert.equal(r.changedCount,4);
});

test('pairwise deltas respect non-default method order and two-column matrices',()=>{
  const r=build({methods:[porphyry,equal],positions:{...positions,
    points:[{id:'same',longitudeDeg:10},{id:'diff',longitudeDeg:0}]}});
  assert.deepEqual(r.pairwiseChanges,[{
    leftHouseSystem:'PORPHYRY',rightHouseSystem:'EQUAL_ASCENDANT',
    changedCount:1,changedPointIds:['diff'],
  }]);
});

test('empty matrices still expose each method pair with zero deltas',()=>{
  const r=build({positions:{...positions,points:[]}});
  assert.equal(r.pairwiseChanges.length,3);
  assert.deepEqual(r.pairwiseChanges.map(x=>x.changedCount),[0,0,0]);
  assert.deepEqual(r.pairwiseChanges.map(x=>x.changedPointIds),[[],[],[]]);
});

test('pairwise summaries are detached and deeply frozen',()=>{
  const mutable=structuredClone(base);
  const r=buildSourcedHousePlacementMatrix(mutable);
  mutable.positions.points[0].id='ALTERED';
  mutable.methods[0].snapshot.cuspsDeg[0]=0;
  assert.equal(r.pairwiseChanges[0].changedPointIds[0],'SUN');
  assert.ok(Object.isFrozen(r.pairwiseChanges));
  assert.ok(Object.isFrozen(r.pairwiseChanges[0]));
  assert.ok(Object.isFrozen(r.pairwiseChanges[0].changedPointIds));
  assert.throws(()=>{r.pairwiseChanges[0].changedCount=999;},TypeError);
  assert.throws(()=>{r.pairwiseChanges[0].changedPointIds[0]='MUTATED';},TypeError);
});

test('128-point upper bound agrees with the canonical single-house locator across all three methods',()=>{
  const points=Array.from({length:128},(_,i)=>({id:`BODY_${String(i).padStart(3,'0')}`,longitudeDeg:360*i/128}));
  const r=build({positions:{...positions,points}});
  assert.equal(r.pointCount,128);
  assert.equal(r.rows.length,128);
  assert.equal(r.methodNames.length,3);
  const methodSides=[whole,equal,porphyry];
  for (let i=0;i<points.length;i++){
    const row=r.rows[i];
    assert.equal(row.id,points[i].id);
    assert.equal(row.longitudeDeg,points[i].longitudeDeg);
    const houses=methodSides.map(side=>locateLongitudeInHouses(points[i].longitudeDeg,side.snapshot.cuspsDeg).house);
    assert.deepEqual(row.placements.map(p=>p.house),houses);
    assert.equal(row.changed,houses.some(h=>h!==houses[0]));
  }
  const union=new Set(r.pairwiseChanges.flatMap(pair=>pair.changedPointIds));
  assert.deepEqual(r.changedPointIds,r.rows.filter(row=>union.has(row.id)).map(row=>row.id));
  assert.equal(r.changedCount,union.size);
  for(const pair of r.pairwiseChanges) assert.equal(pair.changedCount,pair.changedPointIds.length);
});

test('129 points are rejected rather than silently truncated for desktop display',()=>{
  const points=Array.from({length:129},(_,i)=>({id:`BODY_${i}`,longitudeDeg:i}));
  assert.throws(()=>build({positions:{...positions,points}}),err('INVALID_POINTS'));
});

test('occupancy gives twelve numbered houses for every method, including empty houses',()=>{
  const r=build();
  assert.deepEqual(r.occupancyByMethod.map(m=>m.houseSystem),labels);
  for(const method of r.occupancyByMethod){
    assert.deepEqual(method.houses.map(h=>h.house),Array.from({length:12},(_,i)=>i+1));
    assert.equal(method.houses.reduce((sum,h)=>sum+h.count,0),r.pointCount);
    for(const house of method.houses) assert.equal(house.count,house.pointIds.length);
  }
  assert.deepEqual(r.occupancyByMethod[0].houses[0],{house:1,count:1,pointIds:['MOON']});
  assert.deepEqual(r.occupancyByMethod[0].houses[1],{house:2,count:1,pointIds:['SUN']});
  assert.deepEqual(r.occupancyByMethod[0].houses[2],{house:3,count:1,pointIds:['VENUS']});
  assert.deepEqual(r.occupancyByMethod[1].houses[0],{house:1,count:2,pointIds:['SUN','MOON']});
  assert.deepEqual(r.occupancyByMethod[2].houses[11],{house:12,count:2,pointIds:['SUN','MOON']});
  assert.deepEqual(r.occupancyByMethod[2].houses[6],{house:7,count:1,pointIds:['MARS']});
  assert.deepEqual(r.occupancyByMethod[2].houses[5],{house:6,count:0,pointIds:[]});
});

test('occupancy follows explicit two-method column order and caller point order',()=>{
  const r=build({methods:[porphyry,whole],positions:{...positions,points:[
    {id:'LAST',longitudeDeg:345},{id:'FIRST',longitudeDeg:0},
    {id:'ALSO_LAST',longitudeDeg:345},
  ]}});
  assert.deepEqual(r.occupancyByMethod.map(m=>m.houseSystem),['PORPHYRY','WHOLE_SIGN']);
  assert.deepEqual(r.occupancyByMethod[0].houses[11].pointIds,
    ['LAST','FIRST','ALSO_LAST']);
  assert.deepEqual(r.occupancyByMethod[1].houses[0].pointIds,
    ['LAST','ALSO_LAST']);
  assert.deepEqual(r.occupancyByMethod[1].houses[1].pointIds,['FIRST']);
});

test('empty and 128-point input occupancy agrees with row assignments without re-placement',()=>{
  const empty=build({positions:{...positions,points:[]}});
  assert.equal(empty.occupancyByMethod.length,3);
  for(const method of empty.occupancyByMethod){
    assert.equal(method.houses.length,12);
    assert.ok(method.houses.every(h=>h.count===0&&h.pointIds.length===0));
  }
  const points=Array.from({length:128},(_,i)=>({
    id:`B${i}`,longitudeDeg:i*360/128,
  }));
  const full=build({positions:{...positions,points}});
  for(let j=0;j<3;j++){
    const method=full.occupancyByMethod[j];
    assert.equal(method.houses.reduce((total,h)=>total+h.count,0),128);
    for(const house of method.houses){
      const expected=full.rows.filter(row=>row.placements[j].house===house.house)
        .map(row=>row.id);
      assert.deepEqual(house.pointIds,expected);
    }
  }
});

test('occupancy is deeply immutable and detached from modified input points',()=>{
  const mutable=structuredClone(base);
  const result=buildSourcedHousePlacementMatrix(mutable);
  mutable.positions.points[0].id='ALTERED';
  mutable.methods[0].snapshot.cuspsDeg[0]=0;
  assert.equal(result.occupancyByMethod[0].houses[1].pointIds[0],'SUN');
  assert.ok(Object.isFrozen(result.occupancyByMethod));
  for(const method of result.occupancyByMethod){
    assert.ok(Object.isFrozen(method));
    assert.ok(Object.isFrozen(method.houses));
    for(const house of method.houses){
      assert.ok(Object.isFrozen(house));
      assert.ok(Object.isFrozen(house.pointIds));
    }
  }
  assert.throws(()=>{result.occupancyByMethod[0].houses[1].pointIds[0]='X'},TypeError);
  assert.throws(()=>{result.occupancyByMethod[0].houses[1].count=999},TypeError);
  assert.doesNotThrow(()=>JSON.stringify(result));
});
