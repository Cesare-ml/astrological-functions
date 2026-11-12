import test from 'node:test';
import assert from 'node:assert/strict';
import { getTransitSkySnapshotWithProvider } from '../src/transit-provider.mjs';

const provenance = Object.freeze({ center:'EARTH', frame:'ECLIPTIC_OF_DATE', corrections:'APPARENT',
  engineVersion:'fixture-rust-0', kernelSetId:'fixture-de441', timeModel:'TT-fixture' });
function fixture() {
  const calls=[];
  const provider={
    capabilities:{ contract:'TransitPositionProviderCapabilities', contractVersion:'0.1.0-experimental', ...provenance },
    async getGeocentricEcliptic(request) {
      calls.push(request);
      return { datetimeUtc:request.datetimeUtc, bodyName:request.bodyName, longitudeDeg: request.bodyName==='Mars' ? -1 : 181,
        latitudeDeg:0, longitudeSpeedDegPerDay:-0.1, metadata:{...provenance} };
    }
  };
  const input={ datetimeUtc:'2026-11-12T19:00:00Z', zodiac:{type:'TROPICAL'}, bodyNames:['Mars','Moon'],
    expectedEphemeris:{...provenance}, provider };
  return {input,calls};
}
async function rejects(change,code,expectedCalls) {
  const {input,calls}=fixture(); change(input,calls);
  await assert.rejects(()=>getTransitSkySnapshotWithProvider(input), e=>e.code===code);
  if (expectedCalls !== undefined) assert.equal(calls.length,expectedCalls);
}
test('reconstructs frozen sky snapshot with apparent provenance, wrap and precise status',async()=>{
  const {input,calls}=fixture(); const out=await getTransitSkySnapshotWithProvider(input);
  assert.equal(out.sky.datetimeUtc,input.datetimeUtc);
  assert.equal(out.contract,'TransitSkyProviderResult');
  assert.equal(out.status,'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(out.sky.points[0].longitudeDeg,359);
  assert.equal(out.sky.points[1].longitudeDeg,181);
  assert.equal(out.sky.points[0].longitudeSpeedDegPerDay,-0.1);
  assert.equal(out.sky.ephemeris.engineVersion,'fixture-rust-0');
  assert.equal(out.warnings[0].code,'EPHEMERIS_ACCURACY_NOT_VERIFIED');
  assert.equal(calls.length,2);
  assert.ok(Object.isFrozen(out.sky));
  assert.ok(Object.isFrozen(out.sky.points));
  assert.ok(Object.isFrozen(out.sky.points[0]));
  assert.ok(Object.isFrozen(calls[0]));
  assert.equal(calls[0].center,'EARTH');
  assert.equal(calls[0].frame,'ECLIPTIC_OF_DATE');
  assert.equal(calls[0].corrections,'APPARENT');
});
test('rejects invalid UTC/calendar and timezone before any provider I/O',async()=>{
  for (const date of ['2026-02-30T12:00:00Z','2026-11-12T19:00:00+01:00','2026-11-12','nonsense'])
    await rejects(i=>{i.datetimeUtc=date},'INVALID_UTC',0);
});
test('requires explicitly versioned matching zodiac, no silent ayanamsa',async()=>{
  await rejects(i=>{i.zodiac={type:'SIDEREAL'}},'INVALID_ZODIAC',0);
  await rejects(i=>{i.zodiac={type:'TROPICAL',ayanamsaId:'anything'}},'INVALID_ZODIAC',0);
  const {input}=fixture(); input.zodiac={type:'SIDEREAL',ayanamsaId:'LAHIRI-v1'};
  assert.equal((await getTransitSkySnapshotWithProvider(input)).sky.zodiac.ayanamsaId,'LAHIRI-v1');
});
test('fails closed for sparse/duplicate/invalid identifier lists before provider calls',async()=>{
  await rejects(i=>{i.bodyNames=[]},'INVALID_BODIES',0);
  await rejects(i=>{i.bodyNames=['Mars','Mars']},'INVALID_BODIES',0);
  await rejects(i=>{i.bodyNames=Array(2)},'INVALID_BODIES',0);
  await rejects(i=>{i.bodyNames=[' Mars']},'INVALID_BODIES',0);
  await rejects(i=>{i.bodyNames=Array(33).fill('Mars')},'INVALID_BODIES',0);
});
test('requires pinned engine, kernel and time model, true apparent-of-date capability',async()=>{
  await rejects(i=>{i.expectedEphemeris.kernelSetId='other'},'INCONSISTENT_EPHEMERIS',0);
  await rejects(i=>{i.expectedEphemeris.frame='J2000'},'INCOMPATIBLE_EPHEMERIS',0);
  await rejects(i=>{delete i.expectedEphemeris.engineVersion},'INCOMPATIBLE_EPHEMERIS',0);
  await rejects(i=>{i.provider.capabilities.corrections='GEOMETRIC'},'UNSUPPORTED_PROVIDER',0);
  await rejects(i=>{i.provider.capabilities.contractVersion='1.0'},'UNSUPPORTED_PROVIDER',0);
  await rejects(i=>{i.provider.capabilities.contract='DifferentProvider'},'UNSUPPORTED_PROVIDER',0);
});
test('missing/incomplete provider never implicitly falls back to Swiss or another engine',async()=>{
  await rejects(i=>{i.provider=null},'MISSING_PROVIDER',0);
  await rejects(i=>{i.provider={capabilities:i.provider.capabilities}},'MISSING_PROVIDER',0);
});
test('requires exact echo of requested UTC time and body to prevent swapped responses',async()=>{
  await rejects(i=>{const old=i.provider.getGeocentricEcliptic;i.provider.getGeocentricEcliptic=async r=>({...await old(r),bodyName:'Sun'})},'INVALID_EPHEMERIS_RESULT',1);
  await rejects(i=>{const old=i.provider.getGeocentricEcliptic;i.provider.getGeocentricEcliptic=async r=>({...await old(r),datetimeUtc:'2026-11-13T19:00:00Z'})},'INVALID_EPHEMERIS_RESULT',1);
});
test('rejects mixed engine/kernel/time provenance on any body',async()=>{
  for (const field of ['engineVersion','kernelSetId','timeModel']) {
    await rejects(i=>{const old=i.provider.getGeocentricEcliptic;
      i.provider.getGeocentricEcliptic=async r=>{const resp=await old(r);if(r.bodyName==='Moon')resp.metadata[field]='other';return resp}},
      'INCONSISTENT_EPHEMERIS',2);
  }
  await rejects(i=>{const old=i.provider.getGeocentricEcliptic;
    i.provider.getGeocentricEcliptic=async r=>{const resp=await old(r);resp.metadata.corrections='GEOMETRIC';return resp}},
    'INCOMPATIBLE_EPHEMERIS',1);
});
test('rejects invalid longitude latitude and speeds without returning partial positions',async()=>{
  for(const [key,value] of [['longitudeDeg',NaN],['latitudeDeg',Infinity],['latitudeDeg',91],['longitudeSpeedDegPerDay','retrograde']])
    await rejects(i=>{const old=i.provider.getGeocentricEcliptic;
      i.provider.getGeocentricEcliptic=async r=>({...await old(r),[key]:value})},'INVALID_EPHEMERIS_RESULT',1);
});
test('provider rejects atomically without exposing error details',async()=>{
  await rejects(i=>{i.provider.getGeocentricEcliptic=async()=>{throw Error('private provider secret')}},'PROVIDER_FAILURE',0);
});
test('inputs and requests are snapshotted before first await; no reentrant mutation leakage',async()=>{
  const {input,calls}=fixture();
  const old=input.provider.getGeocentricEcliptic;
  input.provider.getGeocentricEcliptic=async request=>{
    if(request.bodyName==='Mars') {
      input.bodyNames[1]='Changed';input.datetimeUtc='2020-01-01T00:00:00Z';
      input.expectedEphemeris.kernelSetId='untrusted';input.zodiac.type='SIDEREAL';
    }
    return old(request);
  };
  const result=await getTransitSkySnapshotWithProvider(input);
  assert.deepEqual(calls.map(x=>x.bodyName),['Mars','Moon']);
  assert.equal(result.sky.datetimeUtc,'2026-11-12T19:00:00Z');
  assert.deepEqual(result.sky.points.map(x=>x.name),['Mars','Moon']);
  assert.equal(result.sky.zodiac.type,'TROPICAL');
  assert.equal(result.sky.ephemeris.kernelSetId,'fixture-de441');
});
test('provider may omit longitude speed, which remains explicitly null',async()=>{
  const {input}=fixture();const old=input.provider.getGeocentricEcliptic;
  input.provider.getGeocentricEcliptic=async request=>{const v=await old(request);delete v.longitudeSpeedDegPerDay;return v};
  const result=await getTransitSkySnapshotWithProvider(input);
  assert.equal(result.sky.points[0].longitudeSpeedDegPerDay,null);
});
