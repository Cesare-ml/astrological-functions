import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrologyError } from '../src/index.mjs';
import { filterZodiacMidpointContactMatrix as filter } from '../src/zodiac-midpoint-matrix-filter.mjs';

function angleDistance(a, b) { const d=Math.abs(a-b)%360; return Math.min(d, 360-d); }
function mockMatrix() {
  const sourceNames=['A','B','C'];
  const targets=[['A',0],['B',180],['X',2],['Y',10],['Z',90]];
  const axes=[['A','B',[0,180]],['A','C',[45,225]],['B','C',[90,270]]];
  return Object.freeze({
    contract:'ZodiacMidpointContactMatrix',contractVersion:'0.1.0-experimental',maxOrbDeg:1,
    sourceCatalog:{points:sourceNames.map(name=>({name,longitudeDeg:0}))},
    targetPoints:targets.map(([name,longitudeDeg])=>({name,longitudeDeg})),
    rows:axes.map(([firstName,secondName,axisLongitudesDeg])=>({
      firstName,secondName,midpointAxis:Object.freeze({axisLongitudesDeg:Object.freeze(axisLongitudesDeg)}),
      targetSweep:{targets:targets.map(([name,longitudeDeg])=>({name,longitudeDeg,
        // Existing snapshots retain *all* separations, including nonmatches.
        hasContact:axisLongitudesDeg.some(a=>angleDistance(a,longitudeDeg)<=1),
        contacts:axisLongitudesDeg.map(longitude=>Object.freeze({longitudeDeg:longitude,separationDeg:angleDistance(longitude,longitudeDeg)})),
      }))},
    })),
  });
}
const view = (overrides={}) => filter({matrix:mockMatrix(),sourceNames:null,targetNames:null,maxOrbDeg:2,excludePairMembers:false,...overrides});

// Every assertion below concerns a view over precomputed angular separations.
test('default explicit all/all view: all pairs and all target cells considered',()=>{
  const f=view();
  assert.equal(f.contract,'ZodiacMidpointMatrixView');
  assert.equal(f.sourceContractVersion,'0.1.0-experimental');
  assert.equal(f.selectedPairCount,3);
  assert.equal(f.consideredCellCount,15);
  assert.equal(f.excludedPairMemberCount,0);
  assert.deepEqual(f.matchedCells.map(x=>[x.firstName,x.secondName,x.targetName]),
    [['A','B','A'],['A','B','B'],['A','B','X'],['B','C','Z']]);
  assert.equal(f.matchedCellCount,4);
  assert.equal(f.activePairCount,2);
});

test('changing orb can widen beyond source original orb without recomputing matrix',()=>{
  const m=mockMatrix();
  assert.equal(m.maxOrbDeg,1);
  const narrow=view({matrix:m,maxOrbDeg:0});
  const wide=view({matrix:m,maxOrbDeg:10});
  assert.deepEqual(narrow.matchedCells.map(x=>x.targetName),['A','B','Z']);
  assert.equal(wide.matchedCellCount,5);
  assert.ok(wide.matchedCells.some(x=>x.targetName==='Y'));
  assert.equal(m.maxOrbDeg,1);
});

test('explicit source selection requires both members and preserves pair order',()=>{
  const f=view({sourceNames:['C','A'],targetNames:['X','Z'],maxOrbDeg:90});
  assert.deepEqual(f.filters.sourceNames,['A','C']);
  assert.deepEqual(f.filters.targetNames,['X','Z']);
  assert.deepEqual(f.rows.map(r=>[r.firstName,r.secondName]),[['A','C']]);
  assert.equal(f.selectedPairCount,1);
  assert.equal(f.consideredCellCount,2);
  assert.equal(f.matchedCellCount,2);
});

test('target selection filters only requested names, with no implicit full-list fallback',()=>{
  const f=view({targetNames:['X']});
  assert.deepEqual(f.matchedCells.map(x=>x.targetName),['X']);
  assert.equal(f.consideredCellCount,3);
});

test('null means all, but [] means deliberately select none',()=>{
  assert.equal(view({sourceNames:[]}).selectedPairCount,0);
  assert.equal(view({sourceNames:[]}).consideredCellCount,0);
  assert.equal(view({targetNames:[]}).selectedPairCount,3);
  assert.equal(view({targetNames:[]}).consideredCellCount,0);
  assert.equal(view({targetNames:[]}).matchedCellCount,0);
  assert.equal(view({targetNames:[]}).activePairCount,0);
});

test('excluding pair-member targets is opt-in, name based and counted',()=>{
  const f=view({excludePairMembers:true});
  assert.equal(f.selectedPairCount,3);
  assert.equal(f.excludedPairMemberCount,4); // Only A and B are target names; C is not.
  assert.equal(f.consideredCellCount,11);
  assert.deepEqual(f.matchedCells.map(x=>x.targetName),['X','Z']);
});

test('explicit self-exclusion never excludes a same-longitude differently named target',()=>{
  const f=view({targetNames:['A','X'],excludePairMembers:true});
  assert.deepEqual(f.matchedCells.map(x=>x.targetName),['X']);
  assert.equal(f.excludedPairMemberCount,2); // A belongs to A/B and A/C
});

test('zero orb is inclusive at exact 0 and excludes a nearby target',()=>{
  const f=view({targetNames:['A','X'],maxOrbDeg:0});
  assert.deepEqual(f.matchedCells.map(x=>x.targetName),['A']);
  assert.equal(f.matchedCells[0].nearestAxisSeparationDeg,0);
});

test('at 90° orb both antipodal axes may match but count only one cell',()=>{
  const f=view({sourceNames:['A','B'],targetNames:['Z'],maxOrbDeg:90});
  assert.equal(f.matchedCellCount,1);
  assert.deepEqual(f.matchedCells[0].matchingAxisLongitudesDeg,[0,180]);
});

test('result and nested filter and matched cell facts are immutable',()=>{
  const f=view({sourceNames:['B','A'],targetNames:['X']});
  for(const obj of [f,f.filters,f.filters.sourceNames,f.filters.targetNames,f.rows,f.rows[0],f.rows[0].matchedTargets,f.matchedCells,f.matchedCells[0],f.matchedCells[0].matchingAxisLongitudesDeg]){
    assert.ok(Object.isFrozen(obj));
  }
  assert.throws(()=>{f.matchedCells[0].targetName='Moon';},TypeError);
  assert.equal(f.interpretation,'FACTS_ONLY');
  assert.equal(f.calculationBasis,'EXISTING_MIDPOINT_CONTACT_GEOMETRY');
  assert.ok(!Object.hasOwn(f,'ephemeris'));
});

test('missing options or malformed outer input fail closed',()=>{
  for(const x of [null,undefined,[],0,'x',{}, {matrix:mockMatrix()},
    {matrix:mockMatrix(),sourceNames:null,targetNames:null,maxOrbDeg:1}]){
    assert.throws(()=>filter(x),e=>e instanceof AstrologyError && e.code==='INVALID_MATRIX_FILTER');
  }
});

test('forged contract, mismatched versions, malformed rows and targets fail closed',()=>{
  const matrix=mockMatrix();
  for(const x of [null,{}, {...matrix,contract:'Bad'}, {...matrix,contractVersion:'2.0'},
    {...matrix,rows:{}}, {...matrix,rows:[{}]},
    {...matrix,rows:[{firstName:'A',secondName:'B',midpointAxis:{},targetSweep:{targets:[{}]}}]}]){
    assert.throws(()=>view({matrix:x}),e=>e instanceof AstrologyError && e.code==='INVALID_MATRIX_FILTER_MATRIX');
  }
});

test('invalid, missing, duplicate or unknown selectors fail with typed selection error',()=>{
  const invalid=[undefined,{},'A',[null],['Missing'],['A','A'],[' A'],[''],['B',undefined]];
  for(const names of invalid){
    for(const prop of ['sourceNames','targetNames']){
      assert.throws(()=>view({[prop]:names}),e=>e.code==='INVALID_MATRIX_FILTER_SELECTION');
    }
  }
  const sparse=new Array(2);sparse[0]='A';
  assert.throws(()=>view({sourceNames:sparse}),e=>e.code==='INVALID_MATRIX_FILTER_SELECTION');
});

test('orb is required, finite and within 0–90 inclusive',()=>{
  for(const orb of [undefined,null,'2',NaN,Infinity,-Infinity,-0.01,90.01]){
    assert.throws(()=>view({maxOrbDeg:orb}),e=>e.code==='INVALID_MATRIX_FILTER_ORB');
  }
});

test('self-exclusion must be a literal boolean, never inferred from truthiness',()=>{
  for(const policy of [undefined,null,0,1,'true',[]]){
    assert.throws(()=>view({excludePairMembers:policy}),e=>e.code==='INVALID_MATRIX_FILTER_POLICY');
  }
});

test('original snapshot remains unchanged across repeated view computations',()=>{
  const matrix=mockMatrix();
  const before=JSON.stringify(matrix);
  const a=view({matrix,sourceNames:null,maxOrbDeg:0,excludePairMembers:true});
  const b=view({matrix,sourceNames:null,maxOrbDeg:90,excludePairMembers:false});
  assert.ok(b.matchedCellCount>a.matchedCellCount);
  assert.equal(JSON.stringify(matrix),before);
});

test('bounded 496-pair by 32-target complete view handles 15,872 cells',()=>{
  const pointNames=Array.from({length:32},(_,i)=>`S${String(i).padStart(2,'0')}`);
  const targets=Array.from({length:32},(_,i)=>({name:`T${String(i).padStart(2,'0')}`,longitudeDeg:0}));
  const sourceRows=[];
  for(let a=0;a<32;a++) for(let b=a+1;b<32;b++) {
    const contacts=targets.map(t=>({name:t.name,longitudeDeg:t.longitudeDeg,
      contacts:[{longitudeDeg:0,separationDeg:0},{longitudeDeg:180,separationDeg:180}]}));
    sourceRows.push({firstName:pointNames[a],secondName:pointNames[b],
      midpointAxis:Object.freeze({axisLongitudesDeg:Object.freeze([0,180])}),
      targetSweep:{targets:contacts}});
  }
  const matrix=Object.freeze({
    contract:'ZodiacMidpointContactMatrix',contractVersion:'0.1.0-experimental',
    sourceCatalog:{points:pointNames.map(name=>({name,longitudeDeg:0}))},
    targetPoints:targets,rows:sourceRows,
  });
  const viewAll=filter({matrix,sourceNames:null,targetNames:null,maxOrbDeg:0,excludePairMembers:false});
  assert.equal(viewAll.selectedPairCount,496);
  assert.equal(viewAll.consideredCellCount,15872);
  assert.equal(viewAll.matchedCellCount,15872);
  assert.equal(viewAll.activePairCount,496);
  assert.equal(viewAll.rows.length,496);
  assert.ok(Object.isFrozen(viewAll.matchedCells));
});
