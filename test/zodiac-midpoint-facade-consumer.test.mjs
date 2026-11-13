import test from 'node:test';
import assert from 'node:assert/strict';
import * as midpoints from '../src/experimental/zodiac-midpoints.mjs';
import { AstrologyError } from '../src/index.mjs';

const point=(name,longitudeDeg)=>({name,longitudeDeg});

test('experimental facade exports precisely the six reviewed facts-only operations',()=>{
  assert.deepEqual(Object.keys(midpoints).sort(),[
    'calculateZodiacMidpointAxis',
    'calculateZodiacMidpointCatalog',
    'calculateZodiacMidpointContactMatrix',
    'calculateZodiacMidpointContacts',
    'calculateZodiacMidpointTargetSweep',
    'filterZodiacMidpointContactMatrix',
  ]);
  for(const key of Object.keys(midpoints)) assert.equal(typeof midpoints[key],'function');
});

test('facade builds an axis, single target contact, and pair catalog consistently',()=>{
  const axis=midpoints.calculateZodiacMidpointAxis({firstLongitudeDeg:350,secondLongitudeDeg:10});
  const contact=midpoints.calculateZodiacMidpointContacts({
    firstLongitudeDeg:350,secondLongitudeDeg:10,targetLongitudeDeg:1,maxOrbDeg:2,
  });
  const catalog=midpoints.calculateZodiacMidpointCatalog({
    points:[point('Moon',10),point('Sun',350)],
  });
  assert.deepEqual(axis.axisLongitudesDeg,[0,180]);
  assert.deepEqual(contact.midpointAxis,axis);
  // The sorted catalog preserves its own source-name order in inputs metadata.
  assert.deepEqual(catalog.pairs[0].midpointAxis.axisLongitudesDeg,axis.axisLongitudesDeg);
  assert.equal(catalog.pairs[0].midpointAxis.shortArcMidpointDeg,axis.shortArcMidpointDeg);
  assert.deepEqual(contact.matchingAxisLongitudesDeg,[0]);
});

test('facade multi-target sweep and matrix agree about each matching body',()=>{
  const targets=[point('Mars',0),point('Venus',180),point('Jupiter',90)];
  const sweep=midpoints.calculateZodiacMidpointTargetSweep({
    firstLongitudeDeg:350,secondLongitudeDeg:10,targetPoints:targets,maxOrbDeg:2,
  });
  const matrix=midpoints.calculateZodiacMidpointContactMatrix({
    sourcePoints:[point('Moon',10),point('Sun',350)],targetPoints:targets,maxOrbDeg:2,
  });
  assert.deepEqual(sweep.matchedTargetNames,['Mars','Venus']);
  // The matrix preserves canonical pair-name ordering; compare geometric facts.
  assert.deepEqual(matrix.rows[0].targetSweep.targets,sweep.targets);
  assert.deepEqual(matrix.rows[0].targetSweep.matchedTargetNames,sweep.matchedTargetNames);
  assert.deepEqual(matrix.rows[0].targetSweep.midpointAxis.axisLongitudesDeg,sweep.midpointAxis.axisLongitudesDeg);
  assert.equal(matrix.matchedCellCount,2);
});

test('facade matrix view can widen orb and opt in to pair-member exclusion',()=>{
  const matrix=midpoints.calculateZodiacMidpointContactMatrix({
    sourcePoints:[point('Moon',0),point('Sun',0)],
    targetPoints:[point('Mars',5),point('Sun',0)],
    maxOrbDeg:0,
  });
  const view=midpoints.filterZodiacMidpointContactMatrix({
    matrix,sourceNames:null,targetNames:null,maxOrbDeg:5,excludePairMembers:true,
  });
  assert.equal(matrix.matchedCellCount,1);
  assert.equal(view.matchedCellCount,1);
  assert.deepEqual(view.matchedCells.map(c=>c.targetName),['Mars']);
  assert.equal(view.excludedPairMemberCount,1);
  assert.ok(Object.isFrozen(view.matchedCells));
  assert.equal(view.interpretation,'FACTS_ONLY');
});

test('facade preserves explicit incomplete-selection failure semantics',()=>{
  const matrix=midpoints.calculateZodiacMidpointContactMatrix({
    sourcePoints:[point('Moon',0),point('Sun',0)],
    targetPoints:[point('Mars',0)],maxOrbDeg:0,
  });
  assert.throws(()=>midpoints.filterZodiacMidpointContactMatrix({
    matrix,sourceNames:['Unknown'],targetNames:null,maxOrbDeg:2,excludePairMembers:false,
  }),e=>e instanceof AstrologyError&&e.code==='INVALID_MATRIX_FILTER_SELECTION');
  assert.throws(()=>midpoints.calculateZodiacMidpointContactMatrix({
    sourcePoints:[point('Moon',0)],targetPoints:[point('Mars',0)],maxOrbDeg:0,
  }),e=>e instanceof AstrologyError&&e.code==='INVALID_MIDPOINT_CATALOG');
});

test('facade does not silently convert an opposed source pair to a unique short midpoint',()=>{
  const axis=midpoints.calculateZodiacMidpointAxis({firstLongitudeDeg:0,secondLongitudeDeg:180});
  assert.equal(axis.hasUniqueShortArcMidpoint,false);
  assert.equal(axis.shortArcMidpointDeg,null);
  assert.deepEqual(axis.axisLongitudesDeg,[90,270]);
});
