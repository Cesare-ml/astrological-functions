import test from 'node:test';
import assert from 'node:assert/strict';
import {AstrologyError,normalize360,signedAngularDistance,locateLongitudeInHouses} from '../src/index.mjs';
import {calculateAlbategniusHouseCusps} from '../src/albategnius-house-cusps.mjs';
import {calculateCampanusHouseCusps} from '../src/diurnal-house-cusps.mjs';

const R=Math.PI/180,D=180/Math.PI;
const EPS=23+26/60+21/3600; // Astrodienst published J2000 table obliquity
const failWith=code=>error=>error instanceof AstrologyError&&error.code===code;
const close=(a,b,tol=1e-7)=>assert.ok(Math.abs(signedAngularDistance(a,b))<tol,
  `${a} != ${b} (${tol} deg)`);
const inputFor=(latitudeDeg,armcDeg=0,epsilonDeg=EPS)=>{
  const theta=armcDeg*R,phi=latitudeDeg*R,eps=epsilonDeg*R;
  const asc=normalize360(Math.atan2(-Math.cos(theta),
    Math.sin(eps)*Math.tan(phi)+Math.cos(eps)*Math.sin(theta))*D+180);
  const mc=normalize360(Math.atan2(Math.sin(theta),
    Math.cos(theta)*Math.cos(eps))*D);
  return {datetimeUtc:'2000-01-01T12:00:00Z',birthTimeKnown:true,
    armcDeg,ascendantDeg:asc,midheavenDeg:mc,trueObliquityDeg:epsilonDeg,
    angleModel:'SYNTHETIC_J2000_TABLE_GEOMETRY',
    source:{engineVersion:'SYNTHETIC_TEST',kernelSetId:'J2000_TABLE_INPUT',
      timeModel:'MODEL_1',frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',
      observerType:'TOPOCENTRIC',observer:{latitudeDeg,longitudeDegEast:12.4964}}};
};

test('published Astrodienst Albategnius J2000 table: 0°, 20°, 40° latitude at ARMC 0°',()=>{
  // Independent external table https://www.astro.com/swisseph/htn_J_e.pdf
  // Printed whole arcminutes are truncated; zodiac signs resolved by column:
  // [11 (Taurus), 12 (Gemini), Asc (Cancer), 2 (Cancer/Leo), 3 (Leo)].
  const rows=[
    {lat:0,minutes:[50*60+37,72*60+1,90*60,107*60+58,129*60+22]},
    {lat:20,minutes:[53*60+15,78*60+16,98*60+14,116*60+25,136*60+1]},
    {lat:40,minutes:[50*60+9,82*60+47,108*60+27,128*60+27,146*60+20]},
  ];
  for(const row of rows){
    const c=calculateAlbategniusHouseCusps(inputFor(row.lat)).cuspsDeg;
    const computed=[c[10],c[11],c[0],c[1],c[2]];
    assert.deepEqual(computed.map(v=>Math.floor(v*60+1e-9)),row.minutes,
      `Astrodienst tabular reference at ${row.lat}°N`);
  }
});

test('all twelve sectors retain ASC/IC/DSC/MC while maintaining forward ordering',()=>{
  const input=inputFor(41.9028,61.66688244516181,23.437859777570328);
  const value=calculateAlbategniusHouseCusps(input);
  assert.equal(value.houseSystem,'ALBATEGNIUS');
  assert.equal(value.cuspsDeg.length,12);
  close(value.cuspsDeg[0],input.ascendantDeg);
  close(value.cuspsDeg[3],input.midheavenDeg+180);
  close(value.cuspsDeg[6],input.ascendantDeg+180);
  close(value.cuspsDeg[9],input.midheavenDeg);
  assert.equal(locateLongitudeInHouses(input.ascendantDeg,value.cuspsDeg).house,1);
  for(let i=0;i<12;i++)assert.ok(normalize360(value.cuspsDeg[(i+1)%12]-value.cuspsDeg[i])>0);
});

test('equatorial continuous limit is finite and differs from Campanus equal great-circle spacing',()=>{
  const input=inputFor(0);
  const alb=calculateAlbategniusHouseCusps(input);
  const camp=calculateCampanusHouseCusps(input);
  close(alb.primeVerticalDivisionAnglesDeg[0],Math.asin(1/3)*D);
  close(alb.primeVerticalDivisionAnglesDeg[1],Math.asin(2/3)*D);
  assert.ok(Math.abs(alb.cuspsDeg[10]-camp.cuspsDeg[10])>0.1);
  assert.ok(alb.cuspsDeg.every(Number.isFinite));
});

test('opposite cusps are exactly opposite by the great-circle construction',()=>{
  for(const latitude of [-55,-25,0,25,55]){
    for(const armc of [0,30,61.66688244516181,150,300]){
      const a=calculateAlbategniusHouseCusps(inputFor(latitude,armc));
      for(let i=0;i<6;i++)close(a.cuspsDeg[i+6],a.cuspsDeg[i]+180);
      for(let i=0;i<12;i++){
        const width=normalize360(a.cuspsDeg[(i+1)%12]-a.cuspsDeg[i]);
        assert.ok(width>1e-8&&width<180,`${latitude}° ARMC ${armc} cusp ${i+1}: ${width}`);
      }
    }
  }
});

test('the final longitude seam is stable and keeps canonical cusp placement',()=>{
  const a=calculateAlbategniusHouseCusps(inputFor(40,359.9999999999));
  const b=calculateAlbategniusHouseCusps(inputFor(40,-1e-10));
  for(let i=0;i<12;i++)close(a.cuspsDeg[i],b.cuspsDeg[i],1e-8);
});

test('unsupported polar or inverted geometry fails rather than using an alternate house system',()=>{
  const a=inputFor(80,270);
  assert.throws(()=>calculateAlbategniusHouseCusps(a),
    error=>error instanceof AstrologyError&&['DEGENERATE_QUADRANTS','ALBATEGNIUS_HOUSES_UNAVAILABLE'].includes(error.code));
});

test('unknown birth time, inconsistent angles and unsupported provenance are rejected',()=>{
  const input=inputFor(40);
  assert.throws(()=>calculateAlbategniusHouseCusps({...input,birthTimeKnown:false}),failWith('BIRTH_TIME_UNKNOWN'));
  assert.throws(()=>calculateAlbategniusHouseCusps({...input,armcDeg:40}),failWith('INCONSISTENT_ANGLES'));
  assert.throws(()=>calculateAlbategniusHouseCusps({...input,unknown:true}),failWith('INVALID_ALBATEGNIUS_INPUT'));
  assert.throws(()=>calculateAlbategniusHouseCusps({...input,trueObliquityDeg:0}),failWith('INVALID_ANGLES'));
  assert.throws(()=>calculateAlbategniusHouseCusps({...input,source:{...input.source,frame:'J2000'}}),
    failWith('INCOMPATIBLE_ANGLE_SOURCE'));
});

test('metadata and cusp arrays are immutable detached facts',()=>{
  const input=inputFor(40);
  const output=calculateAlbategniusHouseCusps(input);
  input.source.observer.latitudeDeg=12;
  assert.equal(output.source.observer.latitudeDeg,40);
  assert.ok(Object.isFrozen(output)&&Object.isFrozen(output.cuspsDeg)&&
    Object.isFrozen(output.source)&&Object.isFrozen(output.primeVerticalDivisionAnglesDeg));
});
