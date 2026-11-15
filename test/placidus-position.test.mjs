import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {calculatePlacidusHousePosition as position} from 'astrological-functions/placidus-position';

const base={armcDeg:0,latitudeDeg:0,trueObliquityDeg:23.43786,eclipticLongitudeDeg:0,eclipticLatitudeDeg:0,frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',birthTimeKnown:true};
test('equatorial cardinal hour angles give the four house axes',()=>{
  for(const [armcDeg,house] of [[0,10],[90,7],[180,4],[270,1]]){
    const result=position({...base,armcDeg});
    assert.ok(Math.abs(result.housePosition-house)<1e-12);
    assert.equal(result.house,house);
    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.input));
  }
});
test('independent recorded Swiss samples cover latitude and both hemispheres',()=>{
  const fixtures=[
    [{armcDeg:61.66688244516181,latitudeDeg:41.9028,trueObliquityDeg:23.437859777570328,eclipticLongitudeDeg:227.5,eclipticLatitudeDeg:-2},3.5213852131119285],
    [{armcDeg:61.66688244516181,latitudeDeg:41.9028,trueObliquityDeg:23.437859777570328,eclipticLongitudeDeg:227.5,eclipticLatitudeDeg:0},3.5292198031938757],
    [{armcDeg:95.45707243802599,latitudeDeg:-45,trueObliquityDeg:23.43767671605485,eclipticLongitudeDeg:350,eclipticLatitudeDeg:5},6.42914401533605],
    [{armcDeg:359.9,latitudeDeg:0,eclipticLongitudeDeg:359.9,eclipticLatitudeDeg:-5},10.06671302674473],
  ];
  for(const [input,expected] of fixtures){const result=position({...base,...input});assert.ok(Math.abs(result.housePosition-expected)<2e-8);}
  assert.notEqual(position({...base,...fixtures[0][0]}).housePosition,position({...base,...fixtures[1][0]}).housePosition);
});
test('known Placidus ecliptic cusps give integer positions',()=>{
  const cusps=[157.8264147901,181.4426149268,210.2425544546,243.6782674613,278.4472921396,310.2873937920,337.8264147901,1.4426149268,30.2425544546,63.6782674613,98.4472921396,130.2873937920];
  for(let i=0;i<12;i++){
    const p=position({...base,armcDeg:61.66688244516181,latitudeDeg:41.9028,trueObliquityDeg:23.437859777570328,eclipticLongitudeDeg:cusps[i]}).housePosition;
    const difference=Math.abs(((p-(i+1)+18)%12)-6);
    assert.ok(difference<1e-9,`cusp ${i+1}: ${p}`);
  }
});
test('rejects incompatible inputs, singular directions and circumpolar semi-arcs',()=>{
  assert.throws(()=>position({...base,birthTimeKnown:false}),e=>e.code==='BIRTH_TIME_REQUIRED');
  assert.throws(()=>position({...base,frame:'J2000'}),e=>e.code==='INCOMPATIBLE_FRAME');
  assert.throws(()=>position({...base,eclipticLongitudeDeg:360}),e=>e.code==='INVALID_ANGLES');
  assert.throws(()=>position({...base,latitudeDeg:90}),e=>e.code==='INVALID_ANGLES');
  assert.throws(()=>position({...base,eclipticLongitudeDeg:90,eclipticLatitudeDeg:90-base.trueObliquityDeg}),e=>e.code==='SINGULAR_DIRECTION');
  assert.throws(()=>position({...base,latitudeDeg:70,eclipticLongitudeDeg:90,eclipticLatitudeDeg:80}),e=>e.code==='CIRCUMPOLAR_POSITION_UNAVAILABLE');
});

const envNames=['VIRGOSTARS_EPHEMERIS_ADAPTER','VIRGOSTARS_EPHEMERIS_CLI','DE441_PATH'];
test('external DE441 positions and angles compose into planetary house positions', {skip:!envNames.some(name=>process.env[name])},async()=>{
  for(const name of envNames) assert.ok(process.env[name],`${name} must be supplied explicitly`);
  const {createExperimentalRustCli}=await import(pathToFileURL(process.env.VIRGOSTARS_EPHEMERIS_ADAPTER));
  const provider=createExperimentalRustCli({executablePath:process.env.VIRGOSTARS_EPHEMERIS_CLI,kernelPath:process.env.DE441_PATH});
  const batch=provider.calculate('2026-11-10T00:00:00Z');
  const angles=provider.calculateHouseAngles({ut1JulianDay:2461354.5,ttJulianDay:batch.results[0].ttJulianDay,latitudeDeg:41.9028,longitudeDegEast:12.4964});
  // Recorded Swiss 2.09.03 results for the same provider directions and angles.
  const references=[3.53218990789468,3.744122823352177,3.1943772873896155,2.769839233780762,12.421175982440941,12.517367843991357,8.265659974829134,10.019587476607267,8.010981859561594,5.722604044768764];
  assert.equal(batch.results.length,references.length);
  for(let i=0;i<references.length;i++){
    const body=batch.results[i];
    const result=position({armcDeg:angles.armcDeg,latitudeDeg:41.9028,trueObliquityDeg:angles.trueObliquityDeg,eclipticLongitudeDeg:body.longitudeDeg,eclipticLatitudeDeg:body.latitudeDeg,frame:'ECLIPTIC_OF_DATE',zodiac:'TROPICAL',birthTimeKnown:true});
    assert.ok(Math.abs(result.housePosition-references[i])<2e-8,body.target);
  }
});
