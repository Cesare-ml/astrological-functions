import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMeridianHouseCusps as meridian,
  calculateMorinusHouseCusps as morinus,
  calculateCarterPoliEquatorialHouseCusps as carter,
} from 'astrological-functions/axial-houses';
import {locateLongitudeInHouses, signedAngularDistance, normalize360} from '../src/index.mjs';

const RAD=Math.PI/180;
const DEG=180/Math.PI;
const source=Object.freeze({
  engineVersion:'SYNTHETIC_TEST',kernelSetId:'FIXTURE',timeModel:'MOCK_UTC',
  frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
  observer:{latitudeDeg:41.9028,longitudeDegEast:12.4964},
});
const common={
  datetimeUtc:'2026-11-10T00:00:00Z',birthTimeKnown:true,
  armcDeg:61.66688244516181,trueObliquityDeg:23.437859777570328,
  angleModel:'SYNTHETIC_EQUATORIAL_ANGLES_1',source,
};
const romeMc=63.6782674613323;
const romeAsc=157.82641479007887;
const angularError=(a,b)=>Math.abs(signedAngularDistance(a,b));
const raOfEcliptic=longitude=>normalize360(Math.atan2(
  Math.sin(longitude*RAD)*Math.cos(common.trueObliquityDeg*RAD),
  Math.cos(longitude*RAD),
)*DEG);

function assertValidTwelve(result,method) {
  assert.equal(result.houseSystem,method);
  assert.equal(result.contractVersion,'0.1.0-experimental');
  assert.equal(result.validation,'CALLER_ASSERTED_ASTRONOMY_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(result.cuspsDeg.length,12);
  assert.equal(result.rightAscensionsDeg.length,12);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.cuspsDeg));
  assert.ok(Object.isFrozen(result.rightAscensionsDeg));
  assert.ok(Object.isFrozen(result.source));
  assert.ok(Object.isFrozen(result.source.observer));
  for(let i=0;i<12;i++) {
    assert.ok(result.cuspsDeg[i]>=0&&result.cuspsDeg[i]<360);
    assert.ok(result.rightAscensionsDeg[i]>=0&&result.rightAscensionsDeg[i]<360);
    assert.equal(locateLongitudeInHouses(result.cuspsDeg[i],result.cuspsDeg).house,i+1);
    assert.ok(angularError(result.cuspsDeg[(i+6)%12],result.cuspsDeg[i]+180)<1e-9);
    assert.ok(angularError(result.rightAscensionsDeg[(i+1)%12],result.rightAscensionsDeg[i]+30)<1e-9);
  }
}

test('Meridian: equal right ascensions, MC fixed at cusp 10, independent of ASC',()=>{
  const result=meridian({...common,midheavenDeg:romeMc});
  assertValidTwelve(result,'MERIDIAN');
  assert.equal(result.referenceAscendantDeg,null);
  assert.equal(result.referenceMidheavenDeg,romeMc);
  assert.ok(angularError(result.cuspsDeg[9],romeMc)<1e-8);
  assert.ok(angularError(result.cuspsDeg[0],romeAsc)>1);
  for(let i=0;i<12;i++)
    assert.ok(angularError(raOfEcliptic(result.cuspsDeg[i]),result.rightAscensionsDeg[i])<1e-9);
});

test('Carter: ASC fixed at cusp 1; RA increments equal; no MC anchoring',()=>{
  const result=carter({...common,ascendantDeg:romeAsc});
  assertValidTwelve(result,'CARTER_POLI_EQUATORIAL');
  assert.equal(result.referenceAscendantDeg,romeAsc);
  assert.equal(result.referenceMidheavenDeg,null);
  assert.ok(angularError(result.cuspsDeg[0],romeAsc)<1e-9);
  assert.ok(angularError(result.cuspsDeg[9],romeMc)>1);
  for(let i=0;i<12;i++)
    assert.ok(angularError(raOfEcliptic(result.cuspsDeg[i]),result.rightAscensionsDeg[i])<1e-9);
});

test('Morinus: rotating equatorial points differs from equal-RA ecliptic intersections',()=>{
  const result=morinus(common);
  assertValidTwelve(result,'MORINUS');
  assert.equal(result.referenceAscendantDeg,null);
  assert.equal(result.referenceMidheavenDeg,null);
  assert.ok(angularError(result.cuspsDeg[9],romeMc)>0.1);
  assert.ok(angularError(result.cuspsDeg[0],romeAsc)>1);
  const meridianResult=meridian({...common,midheavenDeg:romeMc});
  assert.ok(angularError(result.cuspsDeg[2],meridianResult.cuspsDeg[2])>1);
  assert.equal(result.geometry,'EQUATORIAL_POINT_PROJECTED_TO_ECLIPTIC');
});

test('0° / 360° seams and both latitude hemispheres remain ordered',()=>{
  for(const armcDeg of [0,90,179.999999,269.999999,359.999999]) {
    const midheavenDeg=normalize360(Math.atan2(Math.sin(armcDeg*RAD),
      Math.cos(armcDeg*RAD)*Math.cos(common.trueObliquityDeg*RAD))*DEG);
    for(const latitudeDeg of [-67.5,0,67.5]) {
      const input={...common,armcDeg,source:{...source,observer:{latitudeDeg,longitudeDegEast:12.4964}}};
      assertValidTwelve(meridian({...input,midheavenDeg}),'MERIDIAN');
      assertValidTwelve(morinus(input),'MORINUS');
      assertValidTwelve(carter({...input,ascendantDeg:359.999999}),'CARTER_POLI_EQUATORIAL');
    }
  }
});

test('both exact geographic poles accepted for ARMC methods; Carter explicitly unavailable',()=>{
  for(const latitudeDeg of [-90,90]) {
    const input={...common,source:{...source,observer:{latitudeDeg,longitudeDegEast:0}}};
    assertValidTwelve(meridian({...input,midheavenDeg:romeMc}),'MERIDIAN');
    assertValidTwelve(morinus(input),'MORINUS');
    assert.throws(()=>carter({...input,ascendantDeg:romeAsc}),{code:'POLAR_ASCENDANT_UNAVAILABLE'});
  }
});

test('all three reject unknown time, absent provenance and invalid civil UTC',()=>{
  for(const calculate of [meridian,morinus,carter]) {
    const input=calculate===meridian?{...common,midheavenDeg:romeMc}
      :calculate===carter?{...common,ascendantDeg:romeAsc}:common;
    assert.throws(()=>calculate({...input,birthTimeKnown:false}),{code:'BIRTH_TIME_UNKNOWN'});
    assert.throws(()=>calculate({...input,birthTimeKnown:undefined}),{code:'INVALID_AXIAL_INPUT'});
    assert.throws(()=>calculate({...input,datetimeUtc:'2026-02-29T12:00:00Z'}),{code:'INVALID_UTC'});
    assert.throws(()=>calculate({...input,datetimeUtc:'2026-11-10T00:00:60Z'}),{code:'INVALID_UTC'});
    assert.throws(()=>calculate({...input,datetimeUtc:'2026-11-10T00:00:00+01:00'}),{code:'INVALID_UTC'});
    assert.throws(()=>calculate({...input,datetimeUtc:'2026-11-10T00:00:00.1234Z'}),{code:'INVALID_UTC'});
    assert.throws(()=>calculate({...input,source:{...source,frame:'J2000'}}),{code:'INCOMPATIBLE_ANGLE_SOURCE'});
    assert.throws(()=>calculate({...input,source:{...source,kernelSetId:''}}),{code:'INCOMPATIBLE_ANGLE_SOURCE'});
    assert.throws(()=>calculate({...input,source:{...source,observer:{latitudeDeg:91,longitudeDegEast:0}}}),{code:'INCOMPATIBLE_ANGLE_SOURCE'});
    assert.throws(()=>calculate({...input,source:{...source,observer:{latitudeDeg:0,longitudeDegEast:181}}}),{code:'INCOMPATIBLE_ANGLE_SOURCE'});
    assert.throws(()=>calculate({...input,armcDeg:NaN}),{code:'INVALID_ANGLES'});
    assert.throws(()=>calculate({...input,trueObliquityDeg:0}),{code:'INVALID_ANGLES'});
    assert.throws(()=>calculate({...input,angleModel:''}),{code:'INVALID_ANGLE_MODEL'});
    assert.throws(()=>calculate({...input,unrecognized:true}),{code:'INVALID_AXIAL_INPUT'});
  }
});

test('method-specific ASC/MC anchor constraints prevent silent geometry substitution',()=>{
  assert.throws(()=>meridian({...common,midheavenDeg:romeMc+1}),{code:'INCONSISTENT_ANGLES'});
  assert.throws(()=>meridian({...common,midheavenDeg:romeMc,ascendantDeg:romeAsc}),{code:'INVALID_AXIAL_INPUT'});
  assert.throws(()=>meridian(common),{code:'INVALID_ANGLES'});
  assert.throws(()=>morinus({...common,midheavenDeg:romeMc}),{code:'INVALID_AXIAL_INPUT'});
  assert.throws(()=>morinus({...common,ascendantDeg:romeAsc}),{code:'INVALID_AXIAL_INPUT'});
  assert.throws(()=>carter({...common,ascendantDeg:romeAsc,midheavenDeg:romeMc}),{code:'INVALID_AXIAL_INPUT'});
  assert.throws(()=>carter(common),{code:'INVALID_ANGLES'});
});

test('defensive immutable copies do not alias user-provided mutable provenance',()=>{
  const mutable={...source,observer:{latitudeDeg:41,longitudeDegEast:12}};
  const result=morinus({...common,source:mutable});
  mutable.observer.latitudeDeg=11;
  mutable.engineVersion='ALTERED';
  assert.equal(result.source.observer.latitudeDeg,41);
  assert.equal(result.source.engineVersion,'SYNTHETIC_TEST');
});
