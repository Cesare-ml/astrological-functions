import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCampanusHouseCusps as campanus,
  calculateAlcabitiusHouseCusps as alcabitius,
  calculatePolichPageHouseCusps as polichPage,
} from 'astrological-functions/diurnal-houses';
import {calculateRegiomontanusHouseCusps as regiomontanus} from '../src/regiomontanus-houses.mjs';
import {locateLongitudeInHouses, normalize360, signedAngularDistance} from '../src/index.mjs';

const RAD=Math.PI/180;
const DEG=180/Math.PI;
const diff=(a,b)=>Math.abs(signedAngularDistance(a,b));
const source={
  engineVersion:'SYNTHETIC_TEST',kernelSetId:'SYNTHETIC_FIXTURE',timeModel:'MODEL_1',
  frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
  observer:{latitudeDeg:41.9028,longitudeDegEast:12.4964},
};
const rome={
  datetimeUtc:'2026-11-10T00:00:00Z',birthTimeKnown:true,
  ascendantDeg:157.82641479007887,midheavenDeg:63.6782674613323,
  armcDeg:61.66688244516181,trueObliquityDeg:23.437859777570328,
  angleModel:'TEST_IAU_ANGLES',source,
};

function check(result,id,input=rome) {
  assert.equal(result.contract,'DiurnalHouseCusps');
  assert.equal(result.contractVersion,'0.1.0-experimental');
  assert.equal(result.houseSystem,id);
  assert.equal(result.birthTimeKnown,true);
  assert.equal(result.interpretation,'FACTS_ONLY');
  assert.equal(result.validation,'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(result.cuspsDeg.length,12);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.cuspsDeg));
  assert.ok(Object.isFrozen(result.source));
  assert.ok(Object.isFrozen(result.source.observer));
  for(let i=0;i<12;i++) {
    assert.ok(result.cuspsDeg[i]>=0&&result.cuspsDeg[i]<360);
    assert.equal(locateLongitudeInHouses(result.cuspsDeg[i],result.cuspsDeg).house,i+1);
    assert.ok(diff(result.cuspsDeg[(i+6)%12],result.cuspsDeg[i]+180)<1e-8);
  }
  assert.ok(diff(result.cuspsDeg[0],input.ascendantDeg)<1e-9);
  assert.ok(diff(result.cuspsDeg[9],input.midheavenDeg)<1e-9);
  assert.ok(diff(result.cuspsDeg[3],input.midheavenDeg+180)<1e-9);
}

// These are static *synthetic* double-precision regressions from each
// geometric construction, NOT independent Astro.com parity fixtures.
const cases=[
  [campanus,'CAMPANUS','PRIME_VERTICAL_TRISECTION',
    [157.82641479007887,187.8900447412235,215.85306585428376,243.6782674613323,273.42883171325695,305.53822871172764,337.82641479007884,7.8900447412235,35.85306585428372,63.6782674613323,93.42883171325703,125.5382287117276]],
  [alcabitius,'ALCABITIUS','ASCENDANT_SEMIARCS_TRISECTED_IN_RIGHT_ASCENSION',
    [157.82641479007887,187.5001143873777,216.60728068682383,243.6782674613323,273.92544225482953,304.54972681411255,337.82641479007884,7.50011438737772,36.60728068682384,63.6782674613323,93.92544225482955,124.54972681411256]],
  [polichPage,'POLICH_PAGE','TOPOCENTRIC_POLAR_HEIGHT_THIRDS',
    [157.82641479007887,181.44261714802752,210.25924263243513,243.6782674613323,278.29097165954096,310.2142701888028,337.82641479007884,1.44261714802752,30.259242632435132,63.6782674613323,98.29097165954097,130.2142701888028]],
];

for(const [calculate,id,geometry,expected] of cases) {
  test(`${id} Rome geometry preserves 12 ordered cusps, oppositions and known axes`,()=>{
    const result=calculate(rome);
    check(result,id);
    assert.equal(result.geometry,geometry);
    for(let i=0;i<12;i++) assert.ok(diff(result.cuspsDeg[i],expected[i])<1e-8,`cusp ${i+1}`);
  });
}

test('the three methods are not relabeled Regiomontanus or one another',()=>{
  const results=[...cases.map(([fn])=>fn(rome)),regiomontanus(rome)];
  for(let a=0;a<results.length;a++)for(let b=a+1;b<results.length;b++)
    assert.ok(results[a].cuspsDeg.some((x,i)=>diff(x,results[b].cuspsDeg[i])>0.1));
});

test('Alcabitius divides the Ascendant RA semiarc into exact thirds',()=>{
  const result=alcabitius(rome),epsilon=rome.trueObliquityDeg*RAD;
  const ra=longitude=>normalize360(Math.atan2(
    Math.sin(longitude*RAD)*Math.cos(epsilon),Math.cos(longitude*RAD),
  )*DEG);
  const diurnal=result.ascendantSemidiurnalArcDeg;
  const nocturnal=180-diurnal;
  assert.ok(diurnal>90&&diurnal<180);
  assert.ok(diff(ra(result.cuspsDeg[10]),rome.armcDeg+diurnal/3)<1e-8);
  assert.ok(diff(ra(result.cuspsDeg[11]),rome.armcDeg+2*diurnal/3)<1e-8);
  assert.ok(diff(ra(result.cuspsDeg[1]),ra(rome.ascendantDeg)+nocturnal/3)<1e-8);
  assert.ok(diff(ra(result.cuspsDeg[2]),ra(rome.ascendantDeg)+2*nocturnal/3)<1e-8);
  assert.equal(result.polarHeightsDeg,null);
});

test('Polich-Page uses specified distinct polar heights',()=>{
  const result=polichPage(rome),latitude=rome.source.observer.latitudeDeg*RAD;
  assert.ok(result.polarHeightsDeg!==null);
  assert.ok(Object.isFrozen(result.polarHeightsDeg));
  assert.ok(Math.abs(Math.tan(result.polarHeightsDeg[0]*RAD)-Math.tan(latitude)/3)<1e-12);
  assert.ok(Math.abs(Math.tan(result.polarHeightsDeg[1]*RAD)-2*Math.tan(latitude)/3)<1e-12);
  assert.equal(result.ascendantSemidiurnalArcDeg,null);
});

test('southern and equatorial synthetic astronomy is handled, including 0°/360°',()=>{
  const ε=rome.trueObliquityDeg*RAD;
  function synthetic(armcDeg,latitudeDeg) {
    const θ=armcDeg*RAD,φ=latitudeDeg*RAD;
    return {...rome,armcDeg,
      ascendantDeg:normalize360(Math.atan2(-Math.cos(θ),
        Math.sin(ε)*Math.tan(φ)+Math.cos(ε)*Math.sin(θ))*DEG+180),
      midheavenDeg:normalize360(Math.atan2(Math.sin(θ),Math.cos(θ)*Math.cos(ε))*DEG),
      source:{...source,observer:{latitudeDeg,longitudeDegEast:12}},
    };
  }
  for(const latitudeDeg of [-45,-25,0,25,45]) {
    for(const armcDeg of [0,0.0000001,90,179.9999999,270,359.9999999]) {
      const input=synthetic(armcDeg,latitudeDeg);
      for(const [fn,id] of cases) check(fn(input),id,input);
    }
  }
});

test('inverted/polar geometry fails without a fallback or malformed cusp array',()=>{
  const ε=rome.trueObliquityDeg*RAD,θ=rome.armcDeg*RAD;
  const latitudeDeg=-78,φ=latitudeDeg*RAD;
  const high={...rome,
    ascendantDeg:normalize360(Math.atan2(-Math.cos(θ),
      Math.sin(ε)*Math.tan(φ)+Math.cos(ε)*Math.sin(θ))*DEG+180),
    source:{...source,observer:{latitudeDeg,longitudeDegEast:12}},
  };
  for(const [fn] of cases) assert.throws(()=>fn(high),error=>
    ['DEGENERATE_QUADRANTS','HOUSE_GEOMETRY_UNAVAILABLE','ASCENDANT_ARC_UNAVAILABLE'].includes(error.code));
  const southern={...high,source:{...source,observer:{latitudeDeg:-66,longitudeDegEast:12}},
    ascendantDeg:normalize360(Math.atan2(-Math.cos(θ),
      Math.sin(ε)*Math.tan(-66*RAD)+Math.cos(ε)*Math.sin(θ))*DEG+180)};
  assert.throws(()=>polichPage(southern),{code:'HOUSE_GEOMETRY_UNAVAILABLE'});
  for(const [fn] of cases) assert.throws(()=>fn({...rome,source:{...source,observer:{latitudeDeg:90,longitudeDegEast:12}}}),
    {code:'INCOMPATIBLE_ANGLE_SOURCE'});
});

test('invalid UTC, unknown time, source provenance and mismatched astronomy fail closed',()=>{
  for(const [fn] of cases) {
    assert.throws(()=>fn({...rome,birthTimeKnown:false}),{code:'BIRTH_TIME_UNKNOWN'});
    assert.throws(()=>fn({...rome,birthTimeKnown:null}),{code:'INVALID_DIURNAL_INPUT'});
    assert.throws(()=>fn({...rome,datetimeUtc:'2026-02-29T00:00:00Z'}),{code:'INVALID_UTC'});
    assert.throws(()=>fn({...rome,datetimeUtc:'2026-11-10T00:00:00+01:00'}),{code:'INVALID_UTC'});
    assert.throws(()=>fn({...rome,source:{...source,frame:'J2000'}}),{code:'INCOMPATIBLE_ANGLE_SOURCE'});
    assert.throws(()=>fn({...rome,source:{...source,kernelSetId:''}}),{code:'INCOMPATIBLE_ANGLE_SOURCE'});
    assert.throws(()=>fn({...rome,armcDeg:rome.armcDeg+1}),{code:'INCONSISTENT_ANGLES'});
    assert.throws(()=>fn({...rome,midheavenDeg:rome.midheavenDeg+1}),{code:'INCONSISTENT_ANGLES'});
    assert.throws(()=>fn({...rome,ascendantDeg:rome.ascendantDeg+1}),{code:'INCONSISTENT_ANGLES'});
    assert.throws(()=>fn({...rome,trueObliquityDeg:0}),{code:'INVALID_ANGLES'});
    assert.throws(()=>fn({...rome,angleModel:' '}),{code:'INVALID_ANGLE_MODEL'});
    assert.throws(()=>fn({...rome,otherField:1}),{code:'INVALID_DIURNAL_INPUT'});
  }
});

test('outputs are frozen snapshots even if the caller mutates the supplied observer',()=>{
  const mutable={...source,observer:{latitudeDeg:41.9028,longitudeDegEast:12}};
  const result=campanus({...rome,source:mutable});
  mutable.engineVersion='MUTATED';mutable.observer.latitudeDeg=10;
  assert.equal(result.source.engineVersion,'SYNTHETIC_TEST');
  assert.equal(result.source.observer.latitudeDeg,41.9028);
});
