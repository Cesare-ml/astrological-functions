import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyOrientedAspectTrend, AspectTrendError} from '../src/aspect-trend.mjs';

const base = {
  source:{longitudeDeg:10,longitudeSpeedDegPerDay:0},
  target:{longitudeDeg:95,longitudeSpeedDegPerDay:1},
  aspectAngleDeg:90,branch:'FORWARD',maxOrbDeg:6,exactToleranceDeg:0,
  stationaryRelativeSpeedDegPerDay:0.001,motionFrame:'COEVOLVING',
};
const classify = change => classifyOrientedAspectTrend({...base,...change});
const rejects = (change,code) => assert.throws(() => classify(change), e => e instanceof AspectTrendError && e.code === code);

test('forward square applies when target catches up from 85 degrees',()=>{
  const f=classify();assert.equal(f.trend,'APPLYING');assert.equal(f.signedResidualDeg,-5);
  assert.equal(f.relativeSpeedDegPerDay,1);
});
test('forward square separates after crossing exact',()=>{
  const f=classify({target:{longitudeDeg:105,longitudeSpeedDegPerDay:1}});
  assert.equal(f.trend,'SEPARATING');assert.equal(f.signedResidualDeg,5);
});
test('reverse square wraps and has independent direction',()=>{
  const f=classify({branch:'REVERSE',target:{longitudeDeg:275,longitudeSpeedDegPerDay:1}});
  assert.equal(f.exactForwardDeg,270);assert.equal(f.observedForwardDeg,265);
  assert.equal(f.trend,'APPLYING');
});
test('conjunction applies across 360->0 without branch flip',()=>{
  const f=classify({aspectAngleDeg:0,source:{longitudeDeg:1,longitudeSpeedDegPerDay:0},
    target:{longitudeDeg:359,longitudeSpeedDegPerDay:1}});
  assert.equal(f.signedResidualDeg,-2);assert.equal(f.trend,'APPLYING');
});
test('opposition phase is continuous on either side of 180',()=>{
  const a=classify({aspectAngleDeg:180,source:{longitudeDeg:10,longitudeSpeedDegPerDay:0},
    target:{longitudeDeg:189,longitudeSpeedDegPerDay:1}});
  const b=classify({aspectAngleDeg:180,source:{longitudeDeg:10,longitudeSpeedDegPerDay:0},
    target:{longitudeDeg:191,longitudeSpeedDegPerDay:1}});
  assert.equal(a.trend,'APPLYING');assert.equal(b.trend,'SEPARATING');
});
test('exact aspect is positional even with unavailable speeds',()=>{
  const f=classify({source:{longitudeDeg:10,longitudeSpeedDegPerDay:null},
    target:{longitudeDeg:100,longitudeSpeedDegPerDay:null}});
  assert.equal(f.trend,'EXACT');assert.equal(f.relativeSpeedDegPerDay,null);
});
test('zero exact tolerance and exact cusp inclusion work',()=>{
  const f=classify({target:{longitudeDeg:104,longitudeSpeedDegPerDay:1},maxOrbDeg:4});
  assert.equal(f.withinOrb,true);assert.equal(f.trend,'SEPARATING');
  const g=classify({target:{longitudeDeg:104.000001,longitudeSpeedDegPerDay:1},maxOrbDeg:4});
  assert.equal(g.trend,'OUTSIDE_ORB');
});
test('missing speed is not stationary',()=>{
  const f=classify({target:{longitudeDeg:95,longitudeSpeedDegPerDay:null}});
  assert.equal(f.trend,'UNAVAILABLE');assert.equal(f.relativeSpeedDegPerDay,null);
});
test('stationary relative speed requires explicit nonzero-or-zero threshold',()=>{
  const f=classify({target:{longitudeDeg:95,longitudeSpeedDegPerDay:0.001}});
  assert.equal(f.trend,'RELATIVE_STATIONARY');
  const g=classify({target:{longitudeDeg:95,longitudeSpeedDegPerDay:0.001001}});
  assert.equal(g.trend,'APPLYING');
});
test('TARGET_FIXED mode rejects moving target, accepts zero',()=>{
  rejects({motionFrame:'TARGET_FIXED'},'INVALID_FIXED_TARGET');
  const f=classify({motionFrame:'TARGET_FIXED',source:{longitudeDeg:10,longitudeSpeedDegPerDay:-1},
    target:{longitudeDeg:95,longitudeSpeedDegPerDay:0}});
  assert.equal(f.trend,'APPLYING');
  const separating=classify({motionFrame:'TARGET_FIXED',source:{longitudeDeg:10,longitudeSpeedDegPerDay:1},
    target:{longitudeDeg:95,longitudeSpeedDegPerDay:0}});
  assert.equal(separating.trend,'SEPARATING');
});
test('invalid or implicit point speed fails closed',()=>{
  for (const speed of [undefined,NaN,Infinity,'1']) {
    rejects({source:{longitudeDeg:1,longitudeSpeedDegPerDay:speed}},'INVALID_POINT');
  }
  rejects({target:{longitudeDeg:'95',longitudeSpeedDegPerDay:1}},'INVALID_POINT');
});
test('branch and aspect bounds are mandatory',()=>{
  for (const branch of [undefined,'AUTO','']) rejects({branch},'INVALID_ASPECT');
  for (const angle of [-1,181,NaN,Infinity]) rejects({aspectAngleDeg:angle},'INVALID_ASPECT');
});
test('small-angle aspect branches cannot claim overlapping orb regions',()=>{
  rejects({aspectAngleDeg:5,maxOrbDeg:6},'INVALID_ORB_POLICY');
  assert.equal(classify({aspectAngleDeg:5, maxOrbDeg:4, target:{longitudeDeg:14,longitudeSpeedDegPerDay:1}}).trend,'APPLYING');
});
test('orb and relative-rate thresholds require strict declarations',()=>{
  for (const maxOrbDeg of [-1,90,Infinity,undefined]) rejects({maxOrbDeg},'INVALID_ORB_POLICY');
  for (const exactToleranceDeg of [-0.1,7,undefined]) rejects({exactToleranceDeg},'INVALID_ORB_POLICY');
  for (const stationaryRelativeSpeedDegPerDay of [-1,Infinity,undefined,'0'])
    rejects({stationaryRelativeSpeedDegPerDay},'INVALID_SPEED_POLICY');
});
test('no silent kinematic frame or malformed input',()=>{
  rejects({motionFrame:'AUTO'},'INVALID_MOTION_FRAME');
  assert.throws(()=>classifyOrientedAspectTrend(null),e=>e.code==='INVALID_INPUT');
});
test('out of orb is determined from geometry only',()=>{
  const f=classify({target:{longitudeDeg:140,longitudeSpeedDegPerDay:null}});
  assert.equal(f.trend,'OUTSIDE_ORB');assert.equal(f.withinOrb,false);
});
test('output is immutable, detached and facts-only',()=>{
  const p={longitudeDeg:95,longitudeSpeedDegPerDay:1};
  const f=classify({target:p});p.longitudeDeg=104;
  assert.equal(f.observedForwardDeg,85);assert.ok(Object.isFrozen(f));
  assert.equal(f.interpretation,'FACTS_ONLY');assert.equal(f.validation,'CALLER_ASSERTED_NOT_SCIENTIFICALLY_VERIFIED');
  assert.equal('synodicMotion' in f,false);
  assert.throws(()=>{f.trend='EXACT'},TypeError);
});
test('swapping both points and reversing branch preserves applying/separating trend',()=>{
  const forward=classify();
  const reverse=classify({source:base.target,target:base.source,branch:'REVERSE'});
  assert.equal(forward.trend,'APPLYING');
  assert.equal(reverse.trend,'APPLYING');
  assert.equal(forward.relativeSpeedDegPerDay,-reverse.relativeSpeedDegPerDay);
});
test('relative speed uses both moving bodies, not just target speed',()=>{
  const f=classify({source:{longitudeDeg:10,longitudeSpeedDegPerDay:2},
    target:{longitudeDeg:95,longitudeSpeedDegPerDay:1}});
  assert.equal(f.relativeSpeedDegPerDay,-1);
  assert.equal(f.trend,'SEPARATING');
});
test('an exact angle tolerance is inclusive and does not imply a station instant',()=>{
  const f=classify({target:{longitudeDeg:100.02,longitudeSpeedDegPerDay:null},
    exactToleranceDeg:0.019,maxOrbDeg:6});
  assert.ok(Math.abs(f.signedResidualDeg-0.02)<1e-10);
  assert.equal(f.trend,'UNAVAILABLE');
  const g=classify({target:{longitudeDeg:100.02,longitudeSpeedDegPerDay:null},
    exactToleranceDeg:0.02,maxOrbDeg:6});
  assert.equal(g.trend,'EXACT');
});

test('relative speed overflow fails closed even for individually finite rates',()=>{
  rejects({source:{longitudeDeg:10,longitudeSpeedDegPerDay:-1e308},
    target:{longitudeDeg:95,longitudeSpeedDegPerDay:1e308}}, 'INVALID_RELATIVE_SPEED');
});


test('one-ULP pre-360 conjunction stays applying, not falsely exact',()=>{
  const below360=360-2**-44; // immediately previous representable binary64 value
  const fact=classify({aspectAngleDeg:0,maxOrbDeg:1,exactToleranceDeg:0,
    source:{longitudeDeg:0,longitudeSpeedDegPerDay:0},
    target:{longitudeDeg:below360,longitudeSpeedDegPerDay:1}});
  assert.equal(fact.observedForwardDeg,below360);
  assert.equal(fact.signedResidualDeg,-(2**-44));
  assert.equal(fact.trend,'APPLYING');
});

test('binary64 values on either side of opposition retain direction',()=>{
  const before=classify({aspectAngleDeg:180,maxOrbDeg:1,exactToleranceDeg:0,
    source:{longitudeDeg:0,longitudeSpeedDegPerDay:0},
    target:{longitudeDeg:180-2**-45,longitudeSpeedDegPerDay:1}});
  const after=classify({aspectAngleDeg:180,maxOrbDeg:1,exactToleranceDeg:0,
    source:{longitudeDeg:0,longitudeSpeedDegPerDay:0},
    target:{longitudeDeg:180+2**-45,longitudeSpeedDegPerDay:1}});
  assert.equal(before.signedResidualDeg,-(2**-45));
  assert.equal(after.signedResidualDeg,2**-45);
  assert.equal(before.trend,'APPLYING');
  assert.equal(after.trend,'SEPARATING');
});

test('sub-ULP negative zodiac offset preserves trend even if displayed longitude aliases zero',()=>{
  const tiny=2**-50;
  const fact=classify({aspectAngleDeg:0,maxOrbDeg:1,exactToleranceDeg:0,
    source:{longitudeDeg:0,longitudeSpeedDegPerDay:0},
    target:{longitudeDeg:-tiny,longitudeSpeedDegPerDay:1}});
  assert.equal(fact.observedForwardDeg,0);
  assert.equal(fact.signedResidualDeg,-tiny);
  assert.equal(fact.trend,'APPLYING');
  assert.equal(fact.withinOrb,true);
});

test('reverse aspect branch remains exact at wrapped -angle and preserves local signed offset',()=>{
  const exact=classify({aspectAngleDeg:30,branch:'REVERSE',maxOrbDeg:1,
    source:{longitudeDeg:0,longitudeSpeedDegPerDay:0},
    target:{longitudeDeg:330,longitudeSpeedDegPerDay:1}});
  const near=classify({aspectAngleDeg:30,branch:'REVERSE',maxOrbDeg:1,
    source:{longitudeDeg:0,longitudeSpeedDegPerDay:0},
    target:{longitudeDeg:330+2**-44,longitudeSpeedDegPerDay:1}});
  assert.equal(exact.trend,'EXACT');
  assert.equal(near.signedResidualDeg,2**-44);
  assert.equal(near.trend,'SEPARATING');
});


test('reverse major-aspect binary64 neighbors do not collapse to EXACT',()=>{
  for (const angle of [30,60,90,120,150,180]) {
    const exact=360-angle;
    const ulp=2**(Math.floor(Math.log2(exact))-52);
    const inputs={aspectAngleDeg:angle,branch:'REVERSE',maxOrbDeg:1,exactToleranceDeg:0,
      source:{longitudeDeg:0,longitudeSpeedDegPerDay:0}};
    const before=classify({...inputs,target:{longitudeDeg:exact-ulp,longitudeSpeedDegPerDay:1}});
    const on=classify({...inputs,target:{longitudeDeg:exact,longitudeSpeedDegPerDay:1}});
    const after=classify({...inputs,target:{longitudeDeg:exact+ulp,longitudeSpeedDegPerDay:1}});
    assert.equal(before.signedResidualDeg,-ulp,'reverse '+angle+' before');
    assert.equal(on.signedResidualDeg,0,'reverse '+angle+' exact');
    assert.equal(after.signedResidualDeg,ulp,'reverse '+angle+' after');
    assert.equal(before.trend,'APPLYING','reverse '+angle+' before');
    assert.equal(on.trend,'EXACT','reverse '+angle+' exact');
    assert.equal(after.trend,'SEPARATING','reverse '+angle+' after');
  }
});

test('swapped forward/reverse major aspect retains derivative trend at one ULP',()=>{
  for (const angle of [120,150,180]) {
    const exact=360-angle;
    const ulp=2**(Math.floor(Math.log2(exact))-52);
    for (const offset of [-ulp,ulp]) {
      const source={longitudeDeg:0,longitudeSpeedDegPerDay:0};
      const target={longitudeDeg:exact+offset,longitudeSpeedDegPerDay:1};
      const a=classify({source,target,aspectAngleDeg:angle,branch:'REVERSE',
        maxOrbDeg:1,exactToleranceDeg:0});
      const b=classify({source:target,target:source,aspectAngleDeg:angle,branch:'FORWARD',
        maxOrbDeg:1,exactToleranceDeg:0});
      assert.equal(a.trend,b.trend,'swapped aspect '+angle);
      assert.equal(a.signedResidualDeg,-b.signedResidualDeg,'swapped residual '+angle);
      assert.equal(a.relativeSpeedDegPerDay,-b.relativeSpeedDegPerDay);
    }
  }
});
