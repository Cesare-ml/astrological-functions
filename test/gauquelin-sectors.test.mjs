import test from 'node:test';
import assert from 'node:assert/strict';
import {AstrologyError,normalize360,signedAngularDistance} from '../src/index.mjs';
import {calculateGauquelinSectors,locateGauquelinEclipticSector,
  locateGauquelinBodySector} from '../src/gauquelin-sectors.mjs';
import {calculatePlacidusHouseCusps} from '../src/placidus-houses.mjs';

const base=Object.freeze({
  datetimeUtc:'2026-11-10T00:00:00Z',birthTimeKnown:true,
  ascendantDeg:157.82641479007887,midheavenDeg:63.6782674613323,
  armcDeg:61.66688244516181,trueObliquityDeg:23.437859777570328,
  angleModel:'SYNTHETIC_IAU_ANGLES',
  source:{engineVersion:'SYNTHETIC_TEST',kernelSetId:'FIXTURE',timeModel:'MODEL_1',
    frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',observerType:'TOPOCENTRIC',
    observer:{latitudeDeg:41.9028,longitudeDegEast:12.4964}},
});
const body=({rightAscensionDeg=base.armcDeg,declinationDeg=0,...changes}={})=>({
  datetimeUtc:base.datetimeUtc,rightAscensionDeg,declinationDeg,bodyId:'MARS',
  modelId:'APPARENT_EQUATORIAL_V1',frame:'EQUATORIAL_OF_DATE',center:'EARTH',
  corrections:'APPARENT',observerType:'GEOCENTRIC',
  source:{engineVersion:'SYNTHETIC_TEST',kernelSetId:'FIXTURE',timeModel:'MODEL_1'},...changes,
});
const errorCode=(code)=>(error)=>error instanceof AstrologyError&&error.code===code;
const close=(a,b,limit=1e-6)=>assert.ok(Math.abs(signedAngularDistance(a,b))<limit,
  `${a} differs from ${b} beyond ${limit}°`);
const R=Math.PI/180,D=180/Math.PI;
const withSite=(latitudeDeg,armcDeg=61.66688244516181)=>{
  const phi=latitudeDeg*R,theta=armcDeg*R,eps=base.trueObliquityDeg*R;
  const asc=normalize360(Math.atan2(-Math.cos(theta),
    Math.sin(eps)*Math.tan(phi)+Math.cos(eps)*Math.sin(theta))*D+180);
  const mc=normalize360(Math.atan2(Math.sin(theta),
    Math.cos(theta)*Math.cos(eps))*D);
  return {...base,ascendantDeg:asc,midheavenDeg:mc,armcDeg,
    source:{...base.source,observer:{latitudeDeg,longitudeDegEast:12.4964}}};
};

test('36 clockwise semi-arc boundaries anchor rise, upper, set and lower transit',()=>{
  const result=calculateGauquelinSectors(base);
  assert.equal(result.contract,'GauquelinSectorBoundaries');
  assert.equal(result.sectorCount,36);
  assert.equal(result.houseSystem,'GAUQUELIN_36');
  assert.equal(result.clockwise,true);
  assert.equal(result.sectorBoundariesDeg.length,36);
  close(result.sectorBoundariesDeg[0],base.ascendantDeg);
  close(result.sectorBoundariesDeg[9],base.midheavenDeg);
  close(result.sectorBoundariesDeg[18],base.ascendantDeg+180);
  close(result.sectorBoundariesDeg[27],base.midheavenDeg+180);
  assert.deepEqual(result.plusSectors,[1,2,3,9,10,11,12,19,20,21,28,29,30,36]);
  for(let i=0;i<36;i++){
    const clockwise=normalize360(result.sectorBoundariesDeg[i]-result.sectorBoundariesDeg[(i+1)%36]);
    assert.ok(clockwise>0&&clockwise<20,`inverted/oversize sector ${i+1}: ${clockwise}`);
  }
  assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.sectorBoundariesDeg));
});

test('synthetic Rome nine-way arc inversion is a deterministic regression',()=>{
  const {sectorBoundariesDeg:c}=calculateGauquelinSectors(base);
  for(const [index,value] of [[1,149.12483629621144],[4,120.14175126971404],
    [8,75.36071311777287],[10,52.1608627742208]])close(c[index],value,1e-8);
  const repeat=calculateGauquelinSectors(base);
  assert.deepEqual(repeat.sectorBoundariesDeg,c);
});

test('each third Gauquelin boundary matches the reversed Placidus 12-cusp construction',()=>{
  const gauquelin=calculateGauquelinSectors(base).sectorBoundariesDeg;
  const placidus=calculatePlacidusHouseCusps(base).cuspsDeg;
  for(let i=0;i<12;i++)close(gauquelin[i*3],placidus[(12-i)%12],1e-8);
});

test('fractional ecliptic-sector placement owns exact boundaries clockwise',()=>{
  const c=calculateGauquelinSectors(base).sectorBoundariesDeg;
  for(let i=0;i<36;i++){
    const at=locateGauquelinEclipticSector({...base,longitudeDeg:c[i]});
    // Iterative inversion may land a few ULP below the boundary. Preserve
    // sub-boundary ownership instead of rounding genuine near-cusp positions.
    assert.ok(at.sector===i+1||at.sector===(i+35)%36+1,
      `sector ${i+1} boundary was classified as ${at.sector}`);
    assert.ok(Math.abs(at.position-(i+1))<1e-7,`fractional ${i+1}: ${at.position}`);
    assert.equal(at.zone,[1,2,3,9,10,11,12,19,20,21,28,29,30,36].includes(at.sector)?'PLUS':'MINUS');
  }
  const samples=[base.ascendantDeg,base.midheavenDeg,
    base.ascendantDeg+180,base.midheavenDeg+180];
  assert.deepEqual(samples.map(longitudeDeg=>locateGauquelinEclipticSector({...base,longitudeDeg}).sector),
    [1,10,19,28]);
});

test('true-body equatorial placement differs from zero-latitude ecliptic projection',()=>{
  const ra=normalize360(base.armcDeg+65);
  const a=locateGauquelinBodySector({...base,body:body({rightAscensionDeg:ra,declinationDeg:-15})});
  const b=locateGauquelinBodySector({...base,body:body({rightAscensionDeg:ra,declinationDeg:15})});
  assert.equal(a.method,'TRUE_BODY');
  assert.equal(a.body.bodyId,'MARS');
  assert.ok(Math.abs(a.position-b.position)>.2);
  const ecliptic=locateGauquelinEclipticSector({...base,longitudeDeg:base.midheavenDeg});
  assert.equal(ecliptic.method,'ECLIPTIC_POINT');
  assert.equal(ecliptic.body,null);
  assert.equal(ecliptic.sector,10);
});

test('ecliptic-sector frame keeps correct clockwise cycle around 0/360',()=>{
  for(const lon of [-1e-10,0,1e-10,359.9999999999,360,720]){
    const p=locateGauquelinEclipticSector({...base,longitudeDeg:lon});
    assert.ok(p.position>=1&&p.position<37);
    assert.ok(p.sector>=1&&p.sector<=36);
  }
  const near=locateGauquelinEclipticSector({...base,longitudeDeg:0});
  const wrapped=locateGauquelinEclipticSector({...base,longitudeDeg:360});
  assert.equal(near.position,wrapped.position);
});

test('northern, equatorial and southern locations keep coherent 36 clockwise sectors',()=>{
  for(const latitude of [-60,-35,0,35,60]){
    for(const armc of [1,61.66688244516181,181,300]){
      const request=withSite(latitude,armc);
      const {sectorBoundariesDeg:c}=calculateGauquelinSectors(request);
      assert.equal(c.length,36);
      for(let i=0;i<36;i++){
        const width=normalize360(c[i]-c[(i+1)%36]);
        assert.ok(width>0&&width<180,`${latitude}/${armc}/${i}: ${width}`);
      }
    }
  }
});

test('polar limits fail typed instead of inventing equal-sector cusps',()=>{
  assert.throws(()=>calculateGauquelinSectors(withSite(75,62)),errorCode('GAUQUELIN_CUSPS_UNAVAILABLE'));
  assert.throws(()=>locateGauquelinBodySector({...base,body:body({declinationDeg:80})}),
    errorCode('GAUQUELIN_BODY_UNAVAILABLE'));
});

test('unknown birth time, inconsistent axes and unpinned source are rejected',()=>{
  assert.throws(()=>calculateGauquelinSectors({...base,birthTimeKnown:false}),errorCode('BIRTH_TIME_UNKNOWN'));
  assert.throws(()=>calculateGauquelinSectors({...base,armcDeg:100}),errorCode('INCONSISTENT_ANGLES'));
  assert.throws(()=>calculateGauquelinSectors({...base,source:{...base.source,frame:'J2000'}}),
    errorCode('INCOMPATIBLE_ANGLE_SOURCE'));
  assert.throws(()=>locateGauquelinEclipticSector({...base,longitudeDeg:NaN}),errorCode('INVALID_LONGITUDE'));
  assert.throws(()=>calculateGauquelinSectors({...base,unrecognized:true}),errorCode('INVALID_GAUQUELIN_INPUT'));
  assert.throws(()=>locateGauquelinBodySector({...base,body:body({center:'BARYCENTER'})}),
    errorCode('INCOMPATIBLE_BODY_SOURCE'));
  assert.throws(()=>locateGauquelinBodySector({...base,body:body({datetimeUtc:'2026-11-11T00:00:00Z'})}),
    errorCode('INCOMPATIBLE_BODY_SOURCE'));
  assert.throws(()=>locateGauquelinBodySector({...base,body:body({source:{engineVersion:'WRONG',kernelSetId:'FIXTURE',timeModel:'MODEL_1'}})}),
    errorCode('INCOMPATIBLE_BODY_SOURCE'));
});

test('detached immutable external metadata cannot be changed after calculation',()=>{
  const requestedBody=body();
  const result=locateGauquelinBodySector({...base,body:requestedBody});
  requestedBody.source.engineVersion='MUTATED';
  requestedBody.rightAscensionDeg=99;
  assert.equal(result.body.source.engineVersion,'SYNTHETIC_TEST');
  assert.equal(result.body.rightAscensionDeg,base.armcDeg);
  assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.body)&&Object.isFrozen(result.body.source));
});
