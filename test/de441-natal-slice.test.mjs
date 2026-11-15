import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {calculateExperimentalNatalSlice as calculate} from 'astrological-functions/de441-natal-slice';

const names=['Sun','Moon','Mercury','Venus','MarsBarycenter','JupiterBarycenter','SaturnBarycenter','UranusBarycenter','NeptuneBarycenter','PlutoBarycenter'];
const points=['MeanNode','TrueNode','MeanApogee','OsculatingApogee'];
const input={datetimeUtc:'2026-11-10T00:00:00Z',ut1JulianDay:2461354.5,latitudeDeg:41.9028,longitudeDegEast:12.4964,birthTimeKnown:true,zodiac:'TROPICAL',requestedTargets:['Sun','MarsBarycenter'],engineVersion:'fixture',kernelSetId:'fixture',timeModel:'explicit-UT1'};
function mock(){
  return {calculate(){return {contract:'VIRGOSTARS_EXPERIMENTAL_DE441_TRUE_ECLIPTIC_1',frame:'IAU2006_2000B_TRUE_ECLIPTIC_OF_DATE',center:'EARTH',corrections:'LIGHT_TIME_ANNUAL_ABERRATION',timeModel:'BOUNDED_UTC_TRUNCATED_TDB',results:names.map((target,i)=>({target,ttJulianDay:2461354.5008,tdbJulianDay:2461354.5008,longitudeDeg:i*20+5,latitudeDeg:0,distanceAu:1,longitudeSpeedDegPerTdbDay:-0.1,latitudeSpeedDegPerTdbDay:0,distanceSpeedAuPerTdbDay:0}))};},
    calculateHouseAngles(args){return {...args,model:'IAU2006_2000B_APPROXIMATE_SIDEREAL_TIME',armcDeg:61.66688244516181,ascendantDeg:157.82641479007887,midheavenDeg:63.6782674613323,trueObliquityDeg:23.437859777570328};}};
}
test('composes labelled positions, five cusp systems and Placidus positions',()=>{
  const result=calculate(input,mock());
  assert.deepEqual(result.bodies.map(b=>b.state.target),['Sun','MarsBarycenter']);
  assert.deepEqual(Object.keys(result.houses),['vehlow','porphyry','placidus','regiomontanus','koch']);
  assert.equal(result.bodies[0].state.longitudeSpeedDegPerTdbDay,-0.1);
  assert.equal(result.source.corrections,'LIGHT_TIME_ANNUAL_ABERRATION');
  assert.ok(result.warnings.includes('NO_CHIRON'));
  assert.ok(Object.isFrozen(result.bodies[0].state) && Object.isFrozen(result.houses));
});
test('unsupported targets, inconsistent epochs and incompatible provider outputs fail explicitly',()=>{
  assert.throws(()=>calculate({...input,requestedTargets:['Chiron']},mock()),e=>e.code==='UNSUPPORTED_TARGET');
  assert.throws(()=>calculate({...input,requestedTargets:['Sun','Sun']},mock()),e=>e.code==='UNSUPPORTED_TARGET');
  assert.throws(()=>calculate({...input,requestedTargets:['MeanNode']},mock()),e=>e.code==='UNSUPPORTED_TARGET');
  assert.throws(()=>calculate({...input,ut1JulianDay:2461355.5},mock()),e=>e.code==='INCOHERENT_UT1');
  const bad=mock(),base=bad.calculate;
  bad.calculate=()=>{const r=base();r.results[1].ttJulianDay+=0.01;r.results[1].tdbJulianDay+=0.01;return r;};
  assert.throws(()=>calculate(input,bad),e=>e.code==='INCOHERENT_EPOCH');
  bad.calculate=()=>({...base(),corrections:'APPARENT'});
  assert.throws(()=>calculate(input,bad),e=>e.code==='INCOMPATIBLE_EPHEMERIS');
});
test('lunar points retain TT-day rates and separate model provenance',()=>{
  const provider=mock();
  provider.calculateLunarPoints=()=>({contract:'VIRGOSTARS_EXPERIMENTAL_LUNAR_POINTS_1',frame:'IAU2006_2000B_TRUE_ECLIPTIC_OF_DATE',center:'EARTH',timeModel:'BOUNDED_UTC_TRUNCATED_TDB',results:points.map((point,i)=>({point,ttJulianDay:2461354.5008,tdbJulianDay:2461354.5008,longitudeDeg:250+i,latitudeDeg:0,distanceAu:0.0026,longitudeSpeedDegPerTtDay:-0.05,latitudeSpeedDegPerTtDay:0,distanceSpeedAuPerTtDay:0}))});
  const out=calculate({...input,requestedTargets:['Sun','MeanNode']},provider);
  assert.equal(out.bodies[1].state.longitudeSpeedDegPerTtDay,-0.05);
  assert.equal(out.bodies[1].source.corrections,'EXPERIMENTAL_LUNAR_POINT_MODEL');
  assert.equal(out.bodies[1].placidusPosition.input.source.corrections,'EXPERIMENTAL_LUNAR_POINT_MODEL');
  assert.ok(out.warnings.includes('MEAN_DISTANCES_NOMINAL'));
  const good=provider.calculateLunarPoints;
  provider.calculateLunarPoints=()=>{const b=good();b.results[0].ttJulianDay+=0.1;return b;};
  assert.throws(()=>calculate({...input,requestedTargets:['MeanNode']},provider),e=>e.code==='INCOHERENT_EPOCH');
});
test('snapshots provider target and correction metadata once',()=>{
  const provider=mock(),base=provider.calculate;let targetReads=0,correctionReads=0;
  provider.calculate=()=>{const batch=base();
    Object.defineProperty(batch.results[0],'target',{get(){targetReads++;return targetReads===1?'Sun':'Moon';}});
    Object.defineProperty(batch,'corrections',{get(){correctionReads++;return correctionReads===1?'LIGHT_TIME_ANNUAL_ABERRATION':'APPARENT';}});
    return batch;};
  const result=calculate(input,provider);
  assert.equal(targetReads,1);assert.equal(correctionReads,1);
  assert.equal(result.bodies[0].state.target,'Sun');assert.equal(result.source.corrections,'LIGHT_TIME_ANNUAL_ABERRATION');
});

const envNames=['VIRGOSTARS_EPHEMERIS_ADAPTER','VIRGOSTARS_EPHEMERIS_CLI','DE441_PATH'];
test('real DE441 batch composes positions, cusps and recorded Placidus placements', {skip:!envNames.some(name=>process.env[name])},async()=>{
  for(const name of envNames) assert.ok(process.env[name],`${name} must be supplied explicitly`);
  const {createExperimentalRustCli}=await import(pathToFileURL(process.env.VIRGOSTARS_EPHEMERIS_ADAPTER));
  const provider=createExperimentalRustCli({executablePath:process.env.VIRGOSTARS_EPHEMERIS_CLI,kernelPath:process.env.DE441_PATH});
  const targets=[...names,...points];
  const out=calculate({...input,requestedTargets:targets,engineVersion:'experimental-cli',kernelSetId:'external-DE441'},provider);
  const refs=[3.53218990789468,3.744122823352177,3.1943772873896155,2.769839233780762,12.421175982440941,12.517367843991357,8.265659974829134,10.019587476607267,8.010981859561594,5.722604044768764,6.536456087850549,6.552318801085391,4.9038065270720566,4.967565339834401];
  for(let i=0;i<targets.length;i++)assert.ok(Math.abs(out.bodies[i].placidusPosition.housePosition-refs[i])<2e-8,targets[i]);
  assert.ok(Math.abs(out.houses.placidus.cuspsDeg[0]-157.8264147901)<1e-5);
});
