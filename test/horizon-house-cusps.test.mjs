import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateKrusinskiPisaGoelzerHouseCusps as krusinski,
  calculateAzimuthHouseCusps as azimuth,
} from 'astrological-functions/horizon-houses';
import {calculateCampanusHouseCusps} from '../src/diurnal-house-cusps.mjs';
import {calculateMeridianHouseCusps} from '../src/axial-house-cusps.mjs';
import {locateLongitudeInHouses, normalize360, signedAngularDistance} from '../src/index.mjs';

const RAD=Math.PI/180,DEG=180/Math.PI;
const diff=(a,b)=>Math.abs(signedAngularDistance(a,b));
const source={engineVersion:'SYNTHETIC_TEST',kernelSetId:'SYNTHETIC_FIXTURE',
  timeModel:'MOCK_UTC',frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',
  observerType:'TOPOCENTRIC',observer:{latitudeDeg:41.9028,longitudeDegEast:12.4964}};
const rome={datetimeUtc:'2026-11-10T00:00:00Z',birthTimeKnown:true,
  ascendantDeg:157.82641479007887,midheavenDeg:63.6782674613323,
  armcDeg:61.66688244516181,trueObliquityDeg:23.437859777570328,
  angleModel:'SYNTHETIC_IAU_ANGLES',source};
const expectedK=[157.82641479007887,181.76556693386445,209.19546719012573,
  243.6782674613323,281.01603929250444,312.44143100786584,
  337.82641479007884,1.7655669338644777,29.1954671901257,
  63.6782674613323,101.0160392925045,132.44143100786584];
const expectedA=[127.51120508081989,201.1323679735582,230.44183069368648,
  243.6782674613323,254.49464835873368,269.43871159694015,
  307.5112050808199,21.132367973558203,50.4418306936865,
  63.6782674613323,74.49464835873371,89.43871159694012];

function assertTwelve(result,method,input=rome){
  assert.equal(result.houseSystem,method);
  assert.equal(result.contractVersion,'0.1.0-experimental');
  assert.equal(result.validation,'CALLER_ASSERTED_ANGLES_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(result.interpretation,'FACTS_ONLY');
  assert.equal(result.cuspsDeg.length,12);
  for(let i=0;i<12;i++){
    assert.ok(result.cuspsDeg[i]>=0&&result.cuspsDeg[i]<360,`cusp ${i+1}`);
    assert.equal(locateLongitudeInHouses(result.cuspsDeg[i],result.cuspsDeg).house,i+1);
    assert.ok(diff(result.cuspsDeg[(i+6)%12],result.cuspsDeg[i]+180)<1e-8);
  }
  assert.ok(diff(result.cuspsDeg[9],input.midheavenDeg)<1e-8);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.cuspsDeg));
  assert.ok(Object.isFrozen(result.source));
  assert.ok(Object.isFrozen(result.source.observer));
}

function directions(input){
  const θ=input.armcDeg*RAD,φ=input.source.observer.latitudeDeg*RAD;
  return {
    east:[-Math.sin(θ),Math.cos(θ),0],
    north:[-Math.sin(φ)*Math.cos(θ),-Math.sin(φ)*Math.sin(θ),Math.cos(φ)],
    zenith:[Math.cos(φ)*Math.cos(θ),Math.cos(φ)*Math.sin(θ),Math.sin(φ)],
  };
}
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
function eclipticVec(longitude,epsilon){
  const λ=longitude*RAD,ε=epsilon*RAD;
  return [Math.cos(λ),Math.sin(λ)*Math.cos(ε),Math.sin(λ)*Math.sin(ε)];
}

test('Krusinski–Pisa–Goelzer Rome synthetic 12-cusp regression',()=>{
  const result=krusinski(rome);
  assertTwelve(result,'KRUSINSKI_PISA_GOELZER');
  assert.equal(result.cusp1Anchor,'ASCENDANT');
  assert.equal(result.geometry,'ASCENDANT_ZENITH_GREAT_CIRCLE_TO_RIGHT_ASCENSION');
  assert.ok(diff(result.cuspsDeg[0],rome.ascendantDeg)<1e-9);
  for(let i=0;i<12;i++)assert.ok(diff(result.cuspsDeg[i],expectedK[i])<1e-8);
});

test('Krusinski projection retains each constructed great-circle point right ascension',()=>{
  const result=krusinski(rome);
  const {zenith}=directions(rome);
  const asc=eclipticVec(rome.ascendantDeg,rome.trueObliquityDeg);
  const ε=rome.trueObliquityDeg*RAD;
  assert.ok(Math.abs(dot(asc,zenith))<1e-9);
  for(let i=0;i<12;i++){
    const a=-i*30*RAD;
    const p=asc.map((v,j)=>v*Math.cos(a)+zenith[j]*Math.sin(a));
    const raPoint=normalize360(Math.atan2(p[1],p[0])*DEG);
    const λ=result.cuspsDeg[i]*RAD;
    const raCusp=normalize360(Math.atan2(Math.sin(λ)*Math.cos(ε),Math.cos(λ))*DEG);
    assert.ok(diff(raPoint,raCusp)<1e-8);
  }
});

test('Azimuth Rome synthetic 12-cusp regression; first cusp is east Antivertex, not ASC',()=>{
  const result=azimuth(rome);
  assertTwelve(result,'AZIMUTH');
  assert.equal(result.cusp1Anchor,'ANTIVERTEX_EAST_DIRECTION');
  assert.equal(result.geometry,'HORIZON_AZIMUTH_VERTICAL_CIRCLE');
  assert.ok(diff(result.cuspsDeg[0],rome.ascendantDeg)>10);
  for(let i=0;i<12;i++)assert.ok(diff(result.cuspsDeg[i],expectedA[i])<1e-8);
  const first=eclipticVec(result.cuspsDeg[0],rome.trueObliquityDeg);
  const {east,north}=directions(rome);
  assert.ok(Math.abs(dot(first,north))<1e-10);
  assert.ok(dot(first,east)>0);
});

test('both are distinct from Campanus and Meridian',()=>{
  const k=krusinski(rome),a=azimuth(rome),c=calculateCampanusHouseCusps(rome);
  const {ascendantDeg:unused,...meridianInput}=rome;
  void unused;
  const m=calculateMeridianHouseCusps(meridianInput);
  assert.ok(k.cuspsDeg.some((v,i)=>diff(v,c.cuspsDeg[i])>0.1));
  assert.ok(k.cuspsDeg.some((v,i)=>diff(v,m.cuspsDeg[i])>0.1));
  assert.ok(a.cuspsDeg.some((v,i)=>diff(v,k.cuspsDeg[i])>10));
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

test('north and south hemispheres preserve eastward Azimuth cusp and forward house order',()=>{
  for(const latitudeDeg of [-60,-45,-25,25,45,60]){
    for(const armcDeg of [0.0000001,60,90,179.9999999,270,359.9999999]){
      const input=synthetic(armcDeg,latitudeDeg);
      assertTwelve(krusinski(input),'KRUSINSKI_PISA_GOELZER',input);
      const az=azimuth(input);
      assertTwelve(az,'AZIMUTH',input);
      const first=eclipticVec(az.cuspsDeg[0],input.trueObliquityDeg);
      const {east,north}=directions(input);
      assert.ok(dot(first,east)>0);
      assert.ok(Math.abs(dot(first,north))<1e-8);
    }
  }
});

test('undefined orientation at equatorial ecliptic-on-zenith cases fails explicitly',()=>{
  const input=synthetic(0,0);
  assertTwelve(krusinski(input),'KRUSINSKI_PISA_GOELZER',input);
  assert.throws(()=>azimuth(input),{code:'AZIMUTH_UNAVAILABLE'});
});

test('rejects invalid UTC, source, missing time and inconsistent angles',()=>{
  for(const fn of [krusinski,azimuth]){
    assert.throws(()=>fn({...rome,birthTimeKnown:false}),{code:'BIRTH_TIME_UNKNOWN'});
    assert.throws(()=>fn({...rome,birthTimeKnown:null}),{code:'INVALID_HORIZON_INPUT'});
    assert.throws(()=>fn({...rome,datetimeUtc:'2026-02-29T00:00:00Z'}),{code:'INVALID_UTC'});
    assert.throws(()=>fn({...rome,datetimeUtc:'2026-11-10T00:00:00+01:00'}),{code:'INVALID_UTC'});
    assert.throws(()=>fn({...rome,source:{...source,frame:'J2000'}}),{code:'INCOMPATIBLE_ANGLE_SOURCE'});
    assert.throws(()=>fn({...rome,source:{...source,kernelSetId:''}}),{code:'INCOMPATIBLE_ANGLE_SOURCE'});
    assert.throws(()=>fn({...rome,armcDeg:rome.armcDeg+1}),{code:'INCONSISTENT_ANGLES'});
    assert.throws(()=>fn({...rome,ascendantDeg:rome.ascendantDeg+2}),{code:'INCONSISTENT_ANGLES'});
    assert.throws(()=>fn({...rome,midheavenDeg:rome.midheavenDeg+2}),{code:'INCONSISTENT_ANGLES'});
    assert.throws(()=>fn({...rome,trueObliquityDeg:NaN}),{code:'INVALID_ANGLES'});
    assert.throws(()=>fn({...rome,trueObliquityDeg:0}),{code:'INVALID_ANGLES'});
    assert.throws(()=>fn({...rome,angleModel:' '}),{code:'INVALID_ANGLE_MODEL'});
    assert.throws(()=>fn({...rome,unknown:true}),{code:'INVALID_HORIZON_INPUT'});
    assert.throws(()=>fn({...rome,source:{...source,observer:{latitudeDeg:90,longitudeDegEast:12}}}),
      {code:'INCOMPATIBLE_ANGLE_SOURCE'});
  }
});

test('inverted polar geometry is never replaced by another house calculation',()=>{
  const input=synthetic(61.66688244516181,-78);
  for(const fn of [krusinski,azimuth])assert.throws(()=>fn(input),error=>
    ['DEGENERATE_QUADRANTS','HOUSE_GEOMETRY_UNAVAILABLE','AZIMUTH_UNAVAILABLE'].includes(error.code));
});

test('source snapshots stay frozen when the caller mutates its input',()=>{
  const mutable={...source,observer:{latitudeDeg:41.9028,longitudeDegEast:12}};
  const result=azimuth({...rome,source:mutable});
  mutable.engineVersion='ALTERED';mutable.observer.latitudeDeg=-10;
  assert.equal(result.source.engineVersion,'SYNTHETIC_TEST');
  assert.equal(result.source.observer.latitudeDeg,41.9028);
});
