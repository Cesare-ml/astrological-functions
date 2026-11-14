import test from 'node:test';
import assert from 'node:assert/strict';
import { collectTransitChunkCandidateReports } from '../src/transit-chunk-candidate-reports.mjs';

const identity = () => ({skyBodyName:'Mars', natalBodyName:'Sun', aspectId:'square',
  exactAngleDeg:90, orientation:'POSITIVE',
  ephemerisProvenance:{engineVersion:'mock-1',kernelSetId:'test-kernel',timeModel:'UTC-test'}});
const windowInput = () => ({startUtc:'2026-11-14T00:00:00Z', endUtc:'2026-11-14T01:00:00Z',
  maxDurationMs:3600000, chunkDurationMs:1800000, maxChunks:2});
function report(request, change={}) {
  return {contract:'TransitAspectEventCandidates',contractVersion:'0.1.0-experimental',
    direction:'SKY_TO_NATAL',startUtc:request.startUtc,endUtc:request.endUtc,
    skyBodyName:request.skyBodyName,natalBodyName:request.natalBodyName,
    aspectId:request.aspectId,exactAngleDeg:request.exactAngleDeg,
    orientation:request.orientation,ephemerisProvenance:request.ephemerisProvenance,
    refinedCandidates:[],sampledZeros:[],unresolvedIntervals:[],hasUnresolvedIntervals:false,
    scannedUnused:true,scanProviderCalls:4,refinementProviderCalls:0,
    inspectedIntervals:4,excludedIntervals:2,
    completeness:'NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE',
    verification:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    scientificallyValidated:false,...change};
}
const options = (runChunk, rest={}) => ({windowInput:windowInput(),identity:identity(),
  maxCandidateRecords:12,runChunk,...rest});
const code = name => e => e?.name==='AstrologyError' && e.code===name;

test('collects per-chunk F5 reports without inventing exact event instants', async () => {
  const calls=[];
  const result=await collectTransitChunkCandidateReports(options(async request=>{
    calls.push(request);
    assert.ok(Object.isFrozen(request));
    assert.ok(Object.isFrozen(request.ephemerisProvenance));
    return report(request,request.chunkIndex===0 ? {
      refinedCandidates:[{refinement:{datetimeUtc:request.endUtc}}],
      sampledZeros:[{datetimeUtc:request.endUtc}],
      unresolvedIntervals:[{reason:'POSSIBLE_TANGENCY_OR_MULTIPLE_ROOTS'}],
      hasUnresolvedIntervals:true,refinementProviderCalls:3
    } : {sampledZeros:[{datetimeUtc:request.startUtc}]});
  }));
  assert.deepEqual(calls.map(x=>x.chunkIndex),[0,1]);
  assert.equal(result.chunkCount,2);
  assert.equal(result.totals.refinedCandidateCount,1);
  assert.equal(result.totals.sampledZeroCount,2);
  assert.equal(result.totals.unresolvedIntervalCount,1);
  assert.equal(result.totals.scanProviderCalls,8);
  assert.equal(result.totals.refinementProviderCalls,3);
  assert.equal(result.scientificallyValidated,false);
  assert.match(result.completeness,/NOT_CERTIFIED/);
  assert.equal(Object.hasOwn(result,'hits'),false);
  assert.equal(Object.hasOwn(result,'eventTimes'),false);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.reports) && Object.isFrozen(result.totals));
  assert.ok(result.reports.every(Object.isFrozen));
});

test('snapshots caller-owned window and identity before awaiting the next chunk', async()=>{
  const input=options(async request=>{
    if(request.chunkIndex===0){input.windowInput.chunkDurationMs=10;
      input.identity.skyBodyName='Venus';input.identity.ephemerisProvenance.engineVersion='changed';}
    return report(request);
  });
  const result=await collectTransitChunkCandidateReports(input);
  assert.equal(result.identity.skyBodyName,'Mars');
  assert.equal(result.identity.ephemerisProvenance.engineVersion,'mock-1');
  assert.equal(result.reports.length,2);
  assert.equal(result.window.durationMs,3600000);
});

test('fails before provider calls for invalid limits, identity and missing pipeline',async()=>{
  let calls=0;
  const runChunk=async request=>{calls++;return report(request);};
  for(const rest of [
    {maxCandidateRecords:0},{maxCandidateRecords:16385},
    {identity:{...identity(),orientation:'UNKNOWN'}},
    {identity:{...identity(),ephemerisProvenance:{...identity().ephemerisProvenance,kernelSetId:''}}},
    {windowInput:{...windowInput(),maxChunks:1}},
  ]) await assert.rejects(()=>collectTransitChunkCandidateReports(options(runChunk,rest)));
  await assert.rejects(()=>collectTransitChunkCandidateReports(options(null)),code('MISSING_PIPELINE'));
  assert.equal(calls,0);
});

test('rejects swapped chunks and mismatched source/provenance before continuing',async()=>{
  for(const change of [{startUtc:'2026-11-14T00:00:00Z'},
    {skyBodyName:'Venus'},{exactAngleDeg:89},{direction:'A_TO_B'},
    {ephemerisProvenance:{...identity().ephemerisProvenance,timeModel:'forged'}}]){
    let calls=0;
    await assert.rejects(()=>collectTransitChunkCandidateReports(options(async request=>{
      calls++;return report(request,{...change,...(Object.hasOwn(change,'startUtc')?{startUtc:'2026-11-14T00:00:01Z'}:{})});
    })),code('INCOMPATIBLE_PIPELINE_REPORT'));
    assert.equal(calls,1);
  }
});

test('rejects false scientific certainty and contradictory unresolved status',async()=>{
  for(const change of [{scientificallyValidated:true},{verification:'VALIDATED'},
    {completeness:'COMPLETE'},{hasUnresolvedIntervals:true},
    {unresolvedIntervals:[{}],hasUnresolvedIntervals:false}]){
    let calls=0;
    await assert.rejects(()=>collectTransitChunkCandidateReports(options(async request=>{
      calls++;return report(request,change);
    })),code('INCOMPATIBLE_PIPELINE_REPORT'));
    assert.equal(calls,1);
  }
});

test('rejects over-budget reports before calling later chunks',async()=>{
  let calls=0;
  await assert.rejects(()=>collectTransitChunkCandidateReports(options(async request=>{
    calls++;return report(request,{sampledZeros:[{},{}],refinedCandidates:[{}]});
  },{maxCandidateRecords:5})),code('REPORT_BUDGET_EXCEEDED'));
  assert.equal(calls,2);
});

test('rejects malformed arrays and corrupted integer counters',async()=>{
  for(const change of [{refinedCandidates:null},{sampledZeros:'no'},
    {scanProviderCalls:-1},{refinementProviderCalls:1.2},
    {excludedIntervals:7},{inspectedIntervals:NaN}]){
    await assert.rejects(()=>collectTransitChunkCandidateReports(options(async request=>report(request,change))),
      code('INVALID_PIPELINE_REPORT'));
  }
});

test('accessor fields are rejected before executing attacker-controlled getters',async()=>{
  let getters=0;
  await assert.rejects(()=>collectTransitChunkCandidateReports(options(async request=>{
    const value=report(request);
    Object.defineProperty(value,'scientificallyValidated',{get(){getters++;return false;}});
    return value;
  })),code('INVALID_PIPELINE_REPORT'));
  assert.equal(getters,0);
});

test('underlying pipeline failure is propagated, not converted to empty reports',async()=>{
  const reason=new Error('synthetic pipeline failure');let calls=0;
  await assert.rejects(()=>collectTransitChunkCandidateReports(options(async()=>{calls++;throw reason;})),
    err=>err===reason);
  assert.equal(calls,1);
});

test('cumulative provider call counts must remain safe integers', async()=>{
  await assert.rejects(()=>collectTransitChunkCandidateReports(options(async request=>report(request,{scanProviderCalls:Number.MAX_SAFE_INTEGER}))),code('REPORT_COUNTER_OVERFLOW'));
});
