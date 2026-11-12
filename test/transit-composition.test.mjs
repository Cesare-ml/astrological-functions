import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTransitFactsWithProvider } from '../src/transit-composition.mjs';
import { calculateTransitFactsWithProvider as viaSubpath } from 'astrological-functions/transits/compose';

const ephemeris={center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT',engineVersion:'mock-rust-v1',kernelSetId:'mock-DE441',timeModel:'TT-v1'};
function fixture(){
  const calls=[];
  const provider={
    capabilities:{contract:'TransitPositionProviderCapabilities',contractVersion:'0.1.0-experimental',...ephemeris},
    async getGeocentricEcliptic(request){
      calls.push(request);
      return {datetimeUtc:request.datetimeUtc,bodyName:request.bodyName,
        longitudeDeg:request.bodyName==='Mars' ? -1 : 181,latitudeDeg:0,
        longitudeSpeedDegPerDay:-0.1,metadata:{...ephemeris}};
    }
  };
  const input={birthTimeKnown:true,natal:{datetimeUtc:'2000-01-01T12:00:00Z',zodiac:{type:'TROPICAL'},
    ephemeris:{...ephemeris},points:[{name:'Sun',longitudeDeg:1},{name:'Moon',longitudeDeg:181}]},
    datetimeUtc:'2026-11-12T19:00:00Z',zodiac:{type:'TROPICAL'},bodyNames:['Mars'],
    expectedEphemeris:{...ephemeris},provider,
    aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:2},{id:'opposition',angleDeg:180,maxOrbDeg:2}]};
  return {input,calls};
}
async function rejects(change,code,numberCalls){const {input,calls}=fixture();change(input,calls);
  await assert.rejects(calculateTransitFactsWithProvider(input),e=>e.code===code);
  if(numberCalls!==undefined)assert.equal(calls.length,numberCalls);
}

test('exported subpath is the real orchestration entrypoint',()=>{
  assert.equal(viaSubpath,calculateTransitFactsWithProvider);
});
test('combines provider assertion and exact SKY_TO_NATAL facts without removing warning',async()=>{
  const {input,calls}=fixture();const output=await calculateTransitFactsWithProvider(input);
  assert.equal(calls.length,1);
  assert.equal(output.contract,'TransitFactsWithProviderResult');
  assert.equal(output.contractVersion,'0.1.0-experimental');
  assert.equal(output.status,'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(output.warnings[0].code,'EPHEMERIS_ACCURACY_NOT_VERIFIED');
  assert.equal(output.facts.direction,'SKY_TO_NATAL');
  assert.equal(output.facts.sky.points[0].longitudeDeg,359);
  assert.deepEqual(output.facts.aspects.map(x=>x.aspectId),['conjunction','opposition']);
  assert.equal(output.facts.aspects[0].source.name,'Mars');
  assert.equal(output.facts.aspects[0].target.name,'Sun');
  assert.equal(output.facts.angles,null);
  assert.equal(output.facts.houseMode,'UNAVAILABLE');
  assert.equal(output.facts.interpretation,'FACTS_ONLY');
  assert.ok(Object.isFrozen(output));
  assert.ok(Object.isFrozen(output.facts));
  assert.ok(Object.isFrozen(output.warnings));
  assert.ok(Object.isFrozen(output.warnings[0]));
});
test('explicit empty aspect rule set returns zero facts without a default conjunction',async()=>{
  const {input}=fixture();input.aspectDefinitions=[];
  const r=await calculateTransitFactsWithProvider(input);
  assert.equal(r.facts.aspects.length,0);
  assert.equal(r.warnings[0].code,'EPHEMERIS_ACCURACY_NOT_VERIFIED');
});
test('unknown birth time aborts without provider I/O',async()=>{
  await rejects(x=>x.birthTimeKnown=false,'BIRTH_TIME_REQUIRED',0);
  await rejects(x=>delete x.birthTimeKnown,'BIRTH_TIME_REQUIRED',0);
});
test('invalid composition argument and natal snapshot abort without provider I/O',async()=>{
  await assert.rejects(calculateTransitFactsWithProvider(null),e=>e.code==='INVALID_ARGUMENT');
  await rejects(x=>delete x.natal,'INVALID_NATAL',0);
  await rejects(x=>x.natal.points=[null],'INVALID_NATAL',0);
  await rejects(x=>x.natal.zodiac=null,'INVALID_NATAL',0);
});
test('invalid aspect rule list is rejected before provider I/O',async()=>{
  await rejects(x=>delete x.aspectDefinitions,'INVALID_ASPECT',0);
  await rejects(x=>x.aspectDefinitions=[null],'INVALID_ASPECT',0);
});
test('provider failure prevents partial result and never runs aspect calculation',async()=>{
  await rejects(x=>x.provider.getGeocentricEcliptic=async()=>{throw Error('failure')},'PROVIDER_FAILURE');
});
test('incompatible natal kernel fails instead of silently accepting a mixed chart',async()=>{
  await rejects(x=>x.natal.ephemeris.kernelSetId='other-kernel','INCONSISTENT_EPHEMERIS',0);
});
test('incompatible zodiac fails rather than applying hidden tropical/sidereal conversion',async()=>{
  await rejects(x=>x.natal.zodiac={type:'SIDEREAL',ayanamsaId:'LAHIRI-v1'},'INCOMPATIBLE_ZODIAC',0);
});
test('provider responses must preserve exact requested UTC instant',async()=>{
  await rejects(x=>{const old=x.provider.getGeocentricEcliptic;
    x.provider.getGeocentricEcliptic=async req=>({...await old(req),datetimeUtc:'2026-11-13T19:00:00Z'})},'INVALID_EPHEMERIS_RESULT',1);
});
test('reentrant caller mutation cannot alter natal or aspect rules after first await',async()=>{
  const {input,calls}=fixture(); const original=input.provider.getGeocentricEcliptic;
  input.provider.getGeocentricEcliptic=async req=>{
    input.natal.datetimeUtc='2010-01-01T00:00:00Z';
    input.natal.points[0].longitudeDeg=120;
    input.natal.ephemeris.engineVersion='changed-engine';
    input.natal.zodiac.type='SIDEREAL';
    input.aspectDefinitions[0].maxOrbDeg=0;
    input.aspectDefinitions[0].id='changed';
    return original(req);
  };
  const output=await calculateTransitFactsWithProvider(input);
  assert.equal(calls.length,1);
  assert.equal(output.facts.natal.datetimeUtc,'2000-01-01T12:00:00Z');
  assert.equal(output.facts.natal.points[0].longitudeDeg,1);
  assert.equal(output.facts.natal.ephemeris.engineVersion,'mock-rust-v1');
  assert.equal(output.facts.natal.zodiac.type,'TROPICAL');
  assert.equal(output.facts.aspectDefinitions[0].maxOrbDeg,2);
  assert.equal(output.facts.aspectDefinitions[0].id,'conjunction');
});
test('snapshots natal arrays with holes and leaves final validity to fact validator',async()=>{
  await rejects(x=>x.natal.points=Array(2),'INVALID_NATAL',0);
});
test('cannot misrepresent geometric J2000 as apparent of-date',async()=>{
  await rejects(x=>x.expectedEphemeris.frame='J2000','INCOMPATIBLE_EPHEMERIS',0);
});

test('bad natal UTC, longitude, speed and duplicate IDs fail before provider I/O',async()=>{
  await rejects(x=>x.natal.datetimeUtc='2000-02-30T12:00:00Z','INVALID_UTC',0);
  await rejects(x=>x.natal.datetimeUtc='2000-01-01T12:00:00+01:00','INVALID_UTC',0);
  await rejects(x=>x.natal.points[0].longitudeDeg=Infinity,'INVALID_POINTS',0);
  await rejects(x=>x.natal.points[0].longitudeSpeedDegPerDay='retrograde','INVALID_POINTS',0);
  await rejects(x=>x.natal.points[0].type='angle','INVALID_POINTS',0);
  await rejects(x=>x.natal.points[0].name=' ','INVALID_POINTS',0);
  await rejects(x=>x.natal.points.push({...x.natal.points[0]}),'INVALID_POINTS',0);
  await rejects(x=>x.natal.points=[],'INVALID_POINTS',0);
});
test('bad natal zodiac and ephemeris metadata fail before provider I/O',async()=>{
  await rejects(x=>x.natal.zodiac={type:'SIDEREAL'},'INVALID_ZODIAC',0);
  await rejects(x=>x.natal.zodiac={type:'TROPICAL',ayanamsaId:'x'},'INVALID_ZODIAC',0);
  await rejects(x=>x.natal.ephemeris.frame='J2000','INCOMPATIBLE_EPHEMERIS',0);
  await rejects(x=>delete x.natal.ephemeris.timeModel,'INCOMPATIBLE_EPHEMERIS',0);
});
test('invalid aspect definitions and repeated IDs fail before provider I/O',async()=>{
  await rejects(x=>x.aspectDefinitions[0].angleDeg=Infinity,'INVALID_ASPECT',0);
  await rejects(x=>x.aspectDefinitions[0].maxOrbDeg=-1,'INVALID_ASPECT',0);
  await rejects(x=>x.aspectDefinitions[0].maxOrbDeg=181,'INVALID_ASPECT',0);
  await rejects(x=>x.aspectDefinitions[0].id='','INVALID_ASPECT',0);
  await rejects(x=>x.aspectDefinitions.push({...x.aspectDefinitions[0]}),'INVALID_ASPECT',0);
  await rejects(x=>x.aspectDefinitions=Array(2),'INVALID_ASPECT',0);
});
test('invalid sky zodiac and expected ephemeris abort before provider I/O',async()=>{
  await rejects(x=>x.zodiac={type:'SIDEREAL'},'INVALID_ZODIAC',0);
  await rejects(x=>x.expectedEphemeris.kernelSetId='','INCOMPATIBLE_EPHEMERIS',0);
});

test('optional natal selection includes only explicitly chosen targets',async()=>{
  const {input,calls}=fixture(); input.natalBodyNames=['Moon'];
  const result=await calculateTransitFactsWithProvider(input);
  assert.equal(calls.length,1);
  assert.deepEqual(result.facts.natal.points.map(p=>p.name),['Moon']);
  assert.deepEqual(result.facts.aspects.map(a=>a.target.name),['Moon']);
  assert.deepEqual(result.facts.aspects.map(a=>a.aspectId),['opposition']);
  assert.equal(result.status,'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED');
});
test('natal body selection rejects unknown, repeated, sparse and blank IDs before provider I/O',async()=>{
  await rejects(x=>x.natalBodyNames=['Jupiter'],'INVALID_BODIES',0);
  await rejects(x=>x.natalBodyNames=['Sun','Sun'],'INVALID_BODIES',0);
  await rejects(x=>x.natalBodyNames=Array(2),'INVALID_BODIES',0);
  await rejects(x=>x.natalBodyNames=[''],'INVALID_BODIES',0);
  await rejects(x=>x.natalBodyNames=[],'INVALID_BODIES',0);
  await rejects(x=>x.natalBodyNames=['__proto__'],'INVALID_BODIES',0);
});
test('selected natal body order is stable and input arrays remain unchanged',async()=>{
  const {input}=fixture();input.natalBodyNames=['Moon','Sun']; const selected=input.natalBodyNames;
  const result=await calculateTransitFactsWithProvider(input);
  assert.deepEqual(result.facts.natal.points.map(x=>x.name),['Moon','Sun']);
  assert.deepEqual(selected,['Moon','Sun']);
  assert.ok(Object.isFrozen(result.facts.natal.points));
});
test('asynchronous provider mutations cannot rewrite an explicit natal selection',async()=>{
  const {input}=fixture(); input.natalBodyNames=['Sun'];
  const original=input.provider.getGeocentricEcliptic;
  input.provider.getGeocentricEcliptic=async request=>{
    input.natalBodyNames[0]='Moon';
    return original(request);
  };
  const output=await calculateTransitFactsWithProvider(input);
  assert.deepEqual(output.facts.natal.points.map(p=>p.name),['Sun']);
  assert.deepEqual(output.facts.aspects.map(a=>a.target.name),['Sun']);
});
