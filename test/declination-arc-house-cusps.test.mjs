import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateApcHouseCusps as apc,
  calculateSunshineHouseCusps as sunshine,
} from 'astrological-functions/declination-arc-houses';
import {calculateRegiomontanusHouseCusps} from '../src/regiomontanus-houses.mjs';
import {locateLongitudeInHouses,normalize360,signedAngularDistance} from '../src/index.mjs';

const RAD=Math.PI/180,DEG=180/Math.PI;
const diff=(a,b)=>Math.abs(signedAngularDistance(a,b));
const source={engineVersion:'SYNTHETIC_TEST',kernelSetId:'FIXTURE',timeModel:'MODEL_1',
  frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
  observer:{latitudeDeg:41.9028,longitudeDegEast:12.4964}};
const rome={datetimeUtc:'2026-11-10T00:00:00Z',birthTimeKnown:true,
  ascendantDeg:157.82641479007887,midheavenDeg:63.6782674613323,
  armcDeg:61.66688244516181,trueObliquityDeg:23.437859777570328,
  angleModel:'SYNTHETIC_IAU_ANGLES',source};
const sunAt=declinationDeg=>({datetimeUtc:rome.datetimeUtc,declinationDeg,
  modelId:'RUST_PROVIDER_TEST',bodyId:'SUN',frame:'EQUATORIAL_OF_DATE',
  center:'EARTH',corrections:'APPARENT',observerType:'GEOCENTRIC',
  source:{engineVersion:source.engineVersion,kernelSetId:source.kernelSetId,timeModel:source.timeModel}});

// Frozen *synthetic geometry* regressions, not independent scientific parity.
const expectedApc=[157.82641479007887,179.9996125523148,207.18638377586416,
  243.6782674613323,283.3253544207547,314.4064338550298,
  337.82641479007884,2.5538263353044868,29.887655687136405,
  63.6782674613323,100.22213777840979,131.5603589402775];
const expectedSun10=[157.82641479007887,179.76351361338178,206.91070341456253,
  243.6782674613323,283.6427440393229,314.6681828431209,
  337.82641479007884,2.7320990241633467,30.056421480755905,
  63.6782674613323,100.02872204337812,131.3607679873043];

function check(result,method,input=rome){
  assert.equal(result.contract,'DeclinationArcHouseCusps');
  assert.equal(result.contractVersion,'0.1.0-experimental');
  assert.equal(result.houseSystem,method);
  assert.equal(result.interpretation,'FACTS_ONLY');
  assert.equal(result.validation,'CALLER_ASSERTED_ASTRONOMY_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(result.oppositeIntermediateCuspsGuaranteed,false);
  assert.equal(result.cuspsDeg.length,12);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.cuspsDeg));
  assert.ok(Object.isFrozen(result.source));
  assert.ok(Object.isFrozen(result.source.observer));
  for(let i=0;i<12;i++){
    assert.ok(result.cuspsDeg[i]>=0&&result.cuspsDeg[i]<360);
    assert.equal(locateLongitudeInHouses(result.cuspsDeg[i],result.cuspsDeg).house,i+1);
  }
  assert.ok(diff(result.cuspsDeg[0],input.ascendantDeg)<1e-8);
  assert.ok(diff(result.cuspsDeg[3],input.midheavenDeg+180)<1e-8);
  assert.ok(diff(result.cuspsDeg[6],input.ascendantDeg+180)<1e-8);
  assert.ok(diff(result.cuspsDeg[9],input.midheavenDeg)<1e-8);
  assert.ok(result.semiDiurnalArcDeg>0&&result.semiDiurnalArcDeg<180);
  assert.ok(Math.abs(result.semiDiurnalArcDeg+result.semiNocturnalArcDeg-180)<1e-10);
}

test('APC synthetic Rome reference divides the Ascendant declination parallel',()=>{
  const result=apc(rome);
  check(result,'APC');
  assert.equal(result.declinationReference,'ASCENDANT_DERIVED');
  assert.equal(result.sun,null);
  const expectedDecl=Math.asin(Math.sin(rome.trueObliquityDeg*RAD)*
    Math.sin(rome.ascendantDeg*RAD))*DEG;
  assert.ok(Math.abs(result.declinationCircleDeg-expectedDecl)<1e-10);
  for(let i=0;i<12;i++)assert.ok(diff(result.cuspsDeg[i],expectedApc[i])<1e-8);
  assert.ok(diff(result.cuspsDeg[4],result.cuspsDeg[10]+180)>1);
  assert.ok(diff(result.cuspsDeg[1],result.cuspsDeg[7]+180)>1);
});

test('Sunshine synthetic Rome reference uses separate pinned Sun declination',()=>{
  const result=sunshine({...rome,sun:sunAt(10)});
  check(result,'SUNSHINE');
  assert.equal(result.declinationReference,'EXTERNAL_APPARENT_SUN');
  assert.equal(result.declinationCircleDeg,10);
  assert.equal(result.sun?.source?.kernelSetId,'FIXTURE');
  assert.ok(Object.isFrozen(result.sun));
  assert.ok(Object.isFrozen(result.sun.source));
  for(let i=0;i<12;i++)assert.ok(diff(result.cuspsDeg[i],expectedSun10[i])<1e-8);
  assert.ok(diff(result.cuspsDeg[4],result.cuspsDeg[10]+180)>1);
});

test('Sunshine with Sun declination zero matches equatorial Regiomontanus geometry',()=>{
  const sunshineZero=sunshine({...rome,sun:sunAt(0)});
  const regio=calculateRegiomontanusHouseCusps(rome);
  check(sunshineZero,'SUNSHINE');
  for(let i=0;i<12;i++)assert.ok(diff(sunshineZero.cuspsDeg[i],regio.cuspsDeg[i])<1e-8);
});

test('same parallel declination produces identical pure geometry without collapsing the source identities',()=>{
  const apcResult=apc(rome);
  const sunshineResult=sunshine({...rome,sun:sunAt(apcResult.declinationCircleDeg)});
  for(let i=0;i<12;i++)assert.ok(diff(apcResult.cuspsDeg[i],sunshineResult.cuspsDeg[i])<1e-8);
  assert.equal(apcResult.sun,null);
  assert.equal(sunshineResult.sun?.bodyId,'SUN');
});

function synthetic(armcDeg,latitudeDeg){
  const θ=armcDeg*RAD,φ=latitudeDeg*RAD,ε=rome.trueObliquityDeg*RAD;
  return {...rome,armcDeg,
    ascendantDeg:normalize360(Math.atan2(-Math.cos(θ),
      Math.sin(ε)*Math.tan(φ)+Math.cos(ε)*Math.sin(θ))*DEG+180),
    midheavenDeg:normalize360(Math.atan2(Math.sin(θ),Math.cos(θ)*Math.cos(ε))*DEG),
    source:{...source,observer:{latitudeDeg,longitudeDegEast:12}},
  };
}

test('northern, southern and equatorial nonpolar geometry stays forward across the 0° seam',()=>{
  for(const latitudeDeg of [-45,-25,0,25,45]){
    for(const armcDeg of [0,0.0000001,60,90,179.9999999,270,359.9999999]){
      const input=synthetic(armcDeg,latitudeDeg);
      const sun={...sunAt(10),source:{...sunAt(10).source}};
      check(apc(input),'APC',input);
      check(sunshine({...input,sun}),'SUNSHINE',input);
    }
  }
});

test('Sunshine fails closed when the Sun is circumpolar or has no rise/set arc',()=>{
  const input=synthetic(0,78);
  assert.throws(()=>sunshine({...input,sun:sunAt(23.437859777570328)}),error=>
    ['DECLINATION_ARC_UNAVAILABLE','DEGENERATE_QUADRANTS'].includes(error.code));
  assert.throws(()=>sunshine({...input,sun:sunAt(-23.437859777570328)}),error=>
    ['DECLINATION_ARC_UNAVAILABLE','DEGENERATE_QUADRANTS'].includes(error.code));
});

test('APC and Sunshine reject unknown time, inconsistent angles and unsupported provenance',()=>{
  for(const fn of [apc,sunshine]){
    const good=fn===apc?rome:{...rome,sun:sunAt(10)};
    assert.throws(()=>fn({...good,birthTimeKnown:false}),{code:'BIRTH_TIME_UNKNOWN'});
    assert.throws(()=>fn({...good,birthTimeKnown:null}),{code:'INVALID_DECLINATION_HOUSE_INPUT'});
    assert.throws(()=>fn({...good,datetimeUtc:'2026-02-29T00:00:00Z'}),{code:'INVALID_UTC'});
    assert.throws(()=>fn({...good,source:{...source,frame:'J2000'}}),{code:'INCOMPATIBLE_ANGLE_SOURCE'});
    assert.throws(()=>fn({...good,source:{...source,kernelSetId:''}}),{code:'INCOMPATIBLE_ANGLE_SOURCE'});
    assert.throws(()=>fn({...good,armcDeg:rome.armcDeg+1}),{code:'INCONSISTENT_ANGLES'});
    assert.throws(()=>fn({...good,ascendantDeg:rome.ascendantDeg+1}),{code:'INCONSISTENT_ANGLES'});
    assert.throws(()=>fn({...good,midheavenDeg:rome.midheavenDeg+1}),{code:'INCONSISTENT_ANGLES'});
    assert.throws(()=>fn({...good,trueObliquityDeg:0}),{code:'INVALID_ANGLES'});
    assert.throws(()=>fn({...good,angleModel:''}),{code:'INVALID_ANGLE_MODEL'});
    assert.throws(()=>fn({...good,unexpected:1}),{code:'INVALID_DECLINATION_HOUSE_INPUT'});
  }
  assert.throws(()=>apc({...rome,sun:sunAt(10)}),{code:'INVALID_DECLINATION_HOUSE_INPUT'});
  assert.throws(()=>sunshine(rome),{code:'INCOMPATIBLE_SUN_SOURCE'});
});

test('Sun source is pinned to matching instant, kernel, frame, body, corrections and declared model',()=>{
  const input={...rome,sun:sunAt(10)};
  const badSun=[
    {...input.sun,datetimeUtc:'2026-11-10T00:01:00Z'},
    {...input.sun,bodyId:'MOON'},
    {...input.sun,frame:'J2000'},
    {...input.sun,center:'SUN'},
    {...input.sun,corrections:'GEOMETRIC'},
    {...input.sun,observerType:'TOPOCENTRIC'},
    {...input.sun,modelId:''},
    {...input.sun,declinationDeg:NaN},
    {...input.sun,declinationDeg:90},
    {...input.sun,source:{...input.sun.source,kernelSetId:'DIFFERENT'}},
    {...input.sun,source:{...input.sun.source,timeModel:'DIFFERENT'}},
    {...input.sun,source:{...input.sun.source,engineVersion:'DIFFERENT'}},
  ];
  for(const sun of badSun)assert.throws(()=>sunshine({...input,sun}),{code:'INCOMPATIBLE_SUN_SOURCE'});
});

test('outputs copy and freeze all caller-provided source metadata',()=>{
  const mutable={...source,observer:{latitudeDeg:41.9028,longitudeDegEast:12.4964}};
  const sun={...sunAt(10),source:{...sunAt(10).source}};
  const result=sunshine({...rome,source:mutable,sun});
  mutable.engineVersion='ALTERED';mutable.observer.latitudeDeg=-10;
  sun.source.engineVersion='ALTERED';sun.declinationDeg=-10;
  assert.equal(result.source.engineVersion,'SYNTHETIC_TEST');
  assert.equal(result.source.observer.latitudeDeg,41.9028);
  assert.equal(result.sun.source.engineVersion,'SYNTHETIC_TEST');
  assert.equal(result.sun.declinationDeg,10);
});
