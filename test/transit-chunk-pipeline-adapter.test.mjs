import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTransitChunkPipelineRunner } from '../src/transit-chunk-pipeline-adapter.mjs';
import { collectTransitChunkCandidateReports } from '../src/transit-chunk-candidate-reports.mjs';

const windowInput = () => ({
  startUtc:'2026-11-14T00:00:00Z',endUtc:'2026-11-14T01:00:00Z',
  maxDurationMs:3600000,chunkDurationMs:1800000,maxChunks:2,
});
const identity = () => ({skyBodyName:'Mars',natalBodyName:'Sun',aspectId:'square',
  exactAngleDeg:90,orientation:'POSITIVE',
  ephemerisProvenance:{engineVersion:'test',kernelSetId:'synthetic',timeModel:'UTC-test'}});
const capabilities = () => ({contractVersion:'0.1.0-experimental',
  coverage:'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED',
  enclosureCoverage:'CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES',
  stationCoverage:'INCLUDED',numericErrorCoverage:'INCLUDED',
  center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT'});
const provider = () => ({capabilities:capabilities(),
  async getUnwrappedAspectResidual() {return null;},
  async getUnwrappedResidualEnclosure() {return null;},
});
const refinement = () => ({timeToleranceMs:100,residualToleranceDeg:0.0001,
  maxIterations:40,maxCandidateRefinements:32,maxRefinementCalls:300});
const code = name => err => err?.name==='AstrologyError' && err.code===name;
function syntheticResult(req, change={}) {
  return {contract:'TransitAspectEventCandidates',contractVersion:'0.1.0-experimental',
    direction:'SKY_TO_NATAL',startUtc:req.startUtc,endUtc:req.endUtc,
    skyBodyName:req.skyBodyName,natalBodyName:req.natalBodyName,
    aspectId:req.aspectId,exactAngleDeg:req.exactAngleDeg,
    orientation:req.orientation,ephemerisProvenance:req.ephemerisProvenance,
    refinedCandidates:[],sampledZeros:[],unresolvedIntervals:[],hasUnresolvedIntervals:false,
    scanProviderCalls:2,refinementProviderCalls:0,inspectedIntervals:1,excludedIntervals:1,
    completeness:'NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE',
    verification:'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',scientificallyValidated:false,
    ...change};
}
const options = (prepareCandidates, props={}) => ({windowInput:windowInput(),identity:identity(),
  scan:{targetIntervalMs:60000,maxDepth:10,maxProviderCalls:100},
  refinement:refinement(),provider:provider(),prepareCandidates,
  maxTotalProviderCalls:800,...props});

test('real-shaped F5 pipeline requests connect to conservative chunk summaries',async()=>{
  const seen=[];
  const config=options(async request=>{
    seen.push(request);
    assert.ok(Object.isFrozen(request) && Object.isFrozen(request.refinement));
    assert.equal(Object.hasOwn(request,'chunkIndex'),false);
    return syntheticResult(request);
  });
  const runChunk=makeTransitChunkPipelineRunner(config);
  const summary=await collectTransitChunkCandidateReports({windowInput:config.windowInput,
    identity:identity(),maxCandidateRecords:32,runChunk});
  assert.deepEqual(seen.map(x=>x.startUtc),['2026-11-14T00:00:00.000Z','2026-11-14T00:30:00.000Z']);
  assert.equal(summary.chunkCount,2);
  assert.equal(summary.totals.scanProviderCalls,4);
  assert.equal(summary.scientificallyValidated,false);
  assert.equal(Object.hasOwn(summary,'hits'),false);
});

test('rejects final short chunk that cannot meet declared F5 scan width before calls',async()=>{
  let calls=0;
  const config=options(async()=>{calls++;return {};},{windowInput:{...windowInput(),
    endUtc:'2026-11-14T00:35:00Z',maxDurationMs:2100000}});
  assert.throws(()=>makeTransitChunkPipelineRunner({...config,
    scan:{...config.scan,targetIntervalMs:600000}}),code('INCOMPATIBLE_PIPELINE_LIMITS'));
  assert.equal(calls,0);
});

test('rejects chunks over PR21 31-day limit before calling producer',()=>{
  const config=options(async()=>({}),{windowInput:{startUtc:'2026-01-01T00:00:00Z',
    endUtc:'2026-03-04T00:00:00Z',maxDurationMs:62*86400000,
    chunkDurationMs:32*86400000,maxChunks:2}});
  assert.throws(()=>makeTransitChunkPipelineRunner(config),code('INCOMPATIBLE_PIPELINE_LIMITS'));
});

test('validates the global provider-call cap without requiring theoretical worst-case allocation',()=>{
  let calls=0;
  const make=async()=>{calls++;return {};};
  for(const invalid of [0,-1,1.5,1_000_001,NaN,undefined])
    assert.throws(()=>makeTransitChunkPipelineRunner(options(make, {maxTotalProviderCalls:invalid})),
      code('GLOBAL_PIPELINE_BUDGET'));
  // A caller may now choose an actual budget smaller than worst-case reserved
  // scan/refinement caps: the enforced constraint is runtime calls, not a guess.
  assert.equal(typeof makeTransitChunkPipelineRunner(options(make, {maxTotalProviderCalls:1})), 'function');
  assert.equal(calls,0);
});

test('invalid scanner and refinement caps reject before any producer call',()=>{
  const make=async()=>({});
  const badScans=[{targetIntervalMs:0,maxDepth:10,maxProviderCalls:100},
    {targetIntervalMs:60000,maxDepth:25,maxProviderCalls:100},
    {targetIntervalMs:60000,maxDepth:10,maxProviderCalls:4097}];
  for(const scan of badScans)
    assert.throws(()=>makeTransitChunkPipelineRunner(options(make,{scan})),code('INCOMPATIBLE_PIPELINE_LIMITS'));
  for(const patch of [{maxIterations:129},{residualToleranceDeg:0},{maxRefinementCalls:16385},
    {maxCandidateRefinements:0},{timeToleranceMs:0}])
    assert.throws(()=>makeTransitChunkPipelineRunner(options(make,{refinement:{...refinement(),...patch}})),code('INCOMPATIBLE_PIPELINE_LIMITS'));
});

test('requires explicit provider with the two F5 callback methods and pipeline',()=>{
  assert.throws(()=>makeTransitChunkPipelineRunner(options(null)),code('MISSING_PIPELINE'));
  assert.throws(()=>makeTransitChunkPipelineRunner(options(async()=>{}, {provider:{}})),code('INVALID_ARGUMENT'));
  assert.throws(()=>makeTransitChunkPipelineRunner(options(async()=>{}, {provider:{capabilities:capabilities()}})),code('UNSUPPORTED_COVERAGE'));
  assert.throws(()=>makeTransitChunkPipelineRunner(options(async()=>{}, {
    provider:{...provider(),capabilities:{...capabilities(),frame:'J2000'}}})),code('UNSUPPORTED_COVERAGE'));
});

test('snapshots provider methods, capabilities and refinement configuration',async()=>{
  const config=options(async request=>{
    if(request.startUtc==='2026-11-14T00:00:00.000Z') {
      config.provider.capabilities.frame='J2000';
      config.provider.getUnwrappedResidualEnclosure=()=>{throw Error('poisoned');};
      config.refinement.maxIterations=0;
      config.scan.maxDepth=25;
    }
    assert.equal(request.provider.capabilities.frame,'ECLIPTIC_OF_DATE');
    assert.equal(request.refinement.maxIterations,40);
    assert.equal(request.maxDepth,10);
    return syntheticResult(request);
  });
  const summary=await collectTransitChunkCandidateReports({windowInput:config.windowInput,
    identity:identity(),maxCandidateRecords:32,runChunk:makeTransitChunkPipelineRunner(config)});
  assert.equal(summary.chunkCount,2);
});

test('out-of-order and duplicate calls reject before running pipeline',async()=>{
  let runs=0;
  const runner=makeTransitChunkPipelineRunner(options(async r=>{runs++;return syntheticResult(r);}));
  const i=identity();
  const first={...i,chunkIndex:0,startUtc:'2026-11-14T00:00:00.000Z',endUtc:'2026-11-14T00:30:00.000Z'};
  const second={...i,chunkIndex:1,startUtc:'2026-11-14T00:30:00.000Z',endUtc:'2026-11-14T01:00:00.000Z'};
  await assert.rejects(()=>runner(second),code('INCOMPATIBLE_CHUNK_REQUEST'));
  assert.equal(runs,0);
  await runner(first);
  await assert.rejects(()=>runner(first),code('INCOMPATIBLE_CHUNK_REQUEST'));
  await runner(second);
  await assert.rejects(()=>runner(second),code('PIPELINE_SEQUENCE_ERROR'));
  assert.equal(runs,2);
});

test('concurrent invocations reject and do not double-submit a chunk',async()=>{
  let complete;
  const barrier=new Promise(resolve=>{complete=resolve;});
  let runs=0;
  const runner=makeTransitChunkPipelineRunner(options(async request=>{runs++;await barrier;return syntheticResult(request);}));
  const i=identity();
  const req={...i,chunkIndex:0,startUtc:'2026-11-14T00:00:00.000Z',endUtc:'2026-11-14T00:30:00.000Z'};
  const pending=runner(req);
  await assert.rejects(()=>runner(req),code('PIPELINE_SEQUENCE_ERROR'));
  complete();
  await pending;
  assert.equal(runs,1);
});

test('propagates failures and never silently retries a partially failed scan',async()=>{
  let runs=0;
  const err=new Error('provider has failed');
  const runner=makeTransitChunkPipelineRunner(options(async()=>{runs++;throw err;}));
  const req={...identity(),chunkIndex:0,
    startUtc:'2026-11-14T00:00:00.000Z',endUtc:'2026-11-14T00:30:00.000Z'};
  await assert.rejects(()=>runner(req),e=>e===err);
  await assert.rejects(()=>runner(req),code('PIPELINE_SEQUENCE_ERROR'));
  assert.equal(runs,1);
});

test('direct runner pins aspect and provenance; forged subsequent chunks cannot reach pipeline',async()=>{
  const captured=[];
  const opts=options(async request=>{captured.push(request);return syntheticResult(request);});
  const runner=makeTransitChunkPipelineRunner(opts);
  const pinned=identity();
  const first={...pinned,chunkIndex:0,startUtc:'2026-11-14T00:00:00.000Z',endUtc:'2026-11-14T00:30:00.000Z'};
  const second={...pinned,chunkIndex:1,startUtc:'2026-11-14T00:30:00.000Z',endUtc:'2026-11-14T01:00:00.000Z'};
  await runner(first);
  for(const fake of [
    {...second,skyBodyName:'Venus'},
    {...second,aspectId:'conjunction'},
    {...second,exactAngleDeg:0},
    {...second,orientation:'NEGATIVE'},
    {...second,ephemerisProvenance:{...pinned.ephemerisProvenance,kernelSetId:'forged'}},
    {...second,ephemerisProvenance:{...pinned.ephemerisProvenance,timeModel:'forged'}},
  ]) await assert.rejects(()=>runner(fake),code('INCOMPATIBLE_CHUNK_REQUEST'));
  assert.equal(captured.length,1);
  await runner(second);
  assert.deepEqual(captured.map(r=>r.skyBodyName),['Mars','Mars']);
  assert.deepEqual(captured.map(r=>r.ephemerisProvenance.kernelSetId),['synthetic','synthetic']);
});

test('runner snapshots source identity before first await, even if caller later mutates it',async()=>{
  const config=options(async request=>{
    if(request.startUtc==='2026-11-14T00:00:00.000Z') {
      config.identity.skyBodyName='Jupiter';
      config.identity.ephemerisProvenance.kernelSetId='mutated';
    }
    return syntheticResult(request);
  });
  const pinned=identity();
  const runner=makeTransitChunkPipelineRunner(config);
  for(const [chunkIndex,startUtc,endUtc] of [
    [0,'2026-11-14T00:00:00.000Z','2026-11-14T00:30:00.000Z'],
    [1,'2026-11-14T00:30:00.000Z','2026-11-14T01:00:00.000Z'],
  ]) {
    const report=await runner({...pinned,chunkIndex,startUtc,endUtc});
    assert.equal(report.skyBodyName,'Mars');
    assert.equal(report.ephemerisProvenance.kernelSetId,'synthetic');
  }
});

test('direct runner rejects accessor request identities without invoking their getters',async()=>{
  let getterCalls=0, calls=0;
  const runner=makeTransitChunkPipelineRunner(options(async r=>{calls++;return syntheticResult(r);}));
  for(const key of ['chunkIndex','skyBodyName','ephemerisProvenance']) {
    const request={...identity(),chunkIndex:0,startUtc:'2026-11-14T00:00:00.000Z',endUtc:'2026-11-14T00:30:00.000Z'};
    Object.defineProperty(request,key,{enumerable:true,get(){getterCalls++;return key==='chunkIndex'?0:key==='skyBodyName'?'Mars':identity().ephemerisProvenance;}});
    await assert.rejects(()=>runner(request),code('INCOMPATIBLE_CHUNK_REQUEST'));
  }
  assert.equal(getterCalls,0);
  assert.equal(calls,0);
});

test('builder rejects missing or accessor-based pinned identity before any provider work',()=>{
  const fn=async()=>({});
  assert.throws(()=>makeTransitChunkPipelineRunner(options(fn,{identity:null})),code('INVALID_ARGUMENT'));
  assert.throws(()=>makeTransitChunkPipelineRunner(options(fn,{identity:{...identity(),orientation:'INVALID'}})),code('INVALID_TRANSIT_IDENTITY'));
  let getterCalls=0;
  const malformed=identity();
  Object.defineProperty(malformed,'skyBodyName',{get(){getterCalls++;return 'Mars';}});
  assert.throws(()=>makeTransitChunkPipelineRunner(options(fn,{identity:malformed})),code('INVALID_TRANSIT_IDENTITY'));
  assert.equal(getterCalls,0);
});


test('runtime global call cap counts both point and enclosure callbacks over multiple chunks',async()=>{
  const counts={point:0,enclosure:0};
  const p={...provider(),
    async getUnwrappedAspectResidual(){counts.point++;return 1;},
    async getUnwrappedResidualEnclosure(){counts.enclosure++;return {lowerDeg:-1,upperDeg:1};},
  };
  const prepare=async req=>{
    await req.provider.getUnwrappedResidualEnclosure({startUtc:req.startUtc,endUtc:req.endUtc});
    await req.provider.getUnwrappedAspectResidual({datetimeUtc:req.startUtc});
    return syntheticResult(req);
  };
  const config=options(prepare,{provider:p,maxTotalProviderCalls:4});
  const report=await collectTransitChunkCandidateReports({windowInput:config.windowInput,
    identity:identity(),maxCandidateRecords:12,
    runChunk:makeTransitChunkPipelineRunner(config)});
  assert.equal(report.chunkCount,2);
  assert.deepEqual(counts,{point:2,enclosure:2});
});

test('runtime global cap rejects the first excess point call before reaching underlying provider',async()=>{
  const calls=[];
  const p={...provider(),
    async getUnwrappedAspectResidual(req){calls.push('point:'+req.datetimeUtc);return 1;},
    async getUnwrappedResidualEnclosure(req){calls.push('range:'+req.startUtc);return {lowerDeg:-1,upperDeg:1};},
  };
  const prepare=async req=>{
    await req.provider.getUnwrappedResidualEnclosure({startUtc:req.startUtc,endUtc:req.endUtc});
    await req.provider.getUnwrappedAspectResidual({datetimeUtc:req.startUtc});
    return syntheticResult(req);
  };
  const config=options(prepare,{provider:p,maxTotalProviderCalls:3});
  const runner=makeTransitChunkPipelineRunner(config);
  await assert.rejects(()=>collectTransitChunkCandidateReports({windowInput:config.windowInput,
    identity:identity(),maxCandidateRecords:12,runChunk:runner}),code('GLOBAL_PIPELINE_BUDGET'));
  assert.deepEqual(calls,[
    'range:2026-11-14T00:00:00.000Z',
    'point:2026-11-14T00:00:00.000Z',
    'range:2026-11-14T00:30:00.000Z',
  ]);
  const next={...identity(),chunkIndex:1,startUtc:'2026-11-14T00:30:00.000Z',endUtc:'2026-11-14T01:00:00.000Z'};
  await assert.rejects(()=>runner(next),code('PIPELINE_SEQUENCE_ERROR'));
});

test('a pipeline that swallows exhaustion cannot return a successful report',async()=>{
  let underlyingCalls=0;
  const p={...provider(),
    async getUnwrappedAspectResidual(){underlyingCalls++;return 1;},
  };
  const prep=async req=>{
    await req.provider.getUnwrappedAspectResidual({datetimeUtc:req.startUtc});
    try {
      await req.provider.getUnwrappedAspectResidual({datetimeUtc:req.endUtc});
    }catch(err){assert.equal(err?.code,'GLOBAL_PIPELINE_BUDGET');}
    // Malicious or broken pipeline attempts to convert a partial search into success.
    return syntheticResult(req);
  };
  const config=options(prep,{provider:p,maxTotalProviderCalls:1});
  const runner=makeTransitChunkPipelineRunner(config);
  const first={...identity(),chunkIndex:0,startUtc:'2026-11-14T00:00:00.000Z',endUtc:'2026-11-14T00:30:00.000Z'};
  await assert.rejects(()=>runner(first),code('GLOBAL_PIPELINE_BUDGET'));
  assert.equal(underlyingCalls,1);
  await assert.rejects(()=>runner(first),code('PIPELINE_SEQUENCE_ERROR'));
});

test('saved provider references cannot be used after the chunk has completed',async()=>{
  let retained;
  let calls=0;
  const p={...provider(),async getUnwrappedAspectResidual(){calls++;return 0;}};
  const runner=makeTransitChunkPipelineRunner(options(async req=>{
    retained=req.provider;
    await retained.getUnwrappedAspectResidual({datetimeUtc:req.startUtc});
    return syntheticResult(req);
  },{provider:p,maxTotalProviderCalls:1}));
  const first={...identity(),chunkIndex:0,startUtc:'2026-11-14T00:00:00.000Z',endUtc:'2026-11-14T00:30:00.000Z'};
  await runner(first);
  await assert.rejects(()=>retained.getUnwrappedAspectResidual({datetimeUtc:first.endUtc}),code('PIPELINE_SEQUENCE_ERROR'));
  assert.equal(calls,1);
});

test('rejects invalid AbortSignal and per-chunk timeout at construction',()=>{
  let calls=0;
  const prepare=async()=>{calls++;return {};};
  for(const signal of [null,false,{},new AbortController()])
    assert.throws(()=>makeTransitChunkPipelineRunner(options(prepare,{signal})),code('INVALID_CANCELLATION'));
  for(const chunkTimeoutMs of [null,0,-1,1.5,86400001,Infinity,NaN])
    assert.throws(()=>makeTransitChunkPipelineRunner(options(prepare,{chunkTimeoutMs})),code('INVALID_TIMEOUT'));
  assert.equal(calls,0);
});

test('pre-aborted signal prevents the first PR21 callback and cannot be retried',async()=>{
  const controller=new AbortController(); controller.abort('requested');
  let calls=0;
  const runner=makeTransitChunkPipelineRunner(options(async req=>{calls++;return syntheticResult(req);},{signal:controller.signal}));
  const req={...identity(),chunkIndex:0,startUtc:'2026-11-14T00:00:00.000Z',endUtc:'2026-11-14T00:30:00.000Z'};
  await assert.rejects(()=>runner(req),code('SEARCH_CANCELLED'));
  await assert.rejects(()=>runner(req),code('PIPELINE_SEQUENCE_ERROR'));
  assert.equal(calls,0);
});

test('external cancellation interrupts unresolved provider and forwards cooperative signal',async()=>{
  const external=new AbortController();
  let providerSignal, started;
  const began=new Promise(resolve=>{started=resolve;});
  let calls=0;
  const p={...provider(),async getUnwrappedResidualEnclosure(req,signal){
    providerSignal=signal;calls++;started();return new Promise(()=>{});
  }};
  const runner=makeTransitChunkPipelineRunner(options(async req=>{
    await req.provider.getUnwrappedResidualEnclosure({startUtc:req.startUtc,endUtc:req.endUtc});
    return syntheticResult(req);
  },{provider:p,signal:external.signal}));
  const req={...identity(),chunkIndex:0,startUtc:'2026-11-14T00:00:00.000Z',endUtc:'2026-11-14T00:30:00.000Z'};
  const pending=runner(req);
  await began;
  assert.ok(providerSignal instanceof AbortSignal);
  assert.equal(providerSignal.aborted,false);
  external.abort('user request');
  await assert.rejects(()=>pending,code('SEARCH_CANCELLED'));
  assert.equal(providerSignal.aborted,true);
  assert.equal(calls,1);
  await assert.rejects(()=>runner(req),code('PIPELINE_SEQUENCE_ERROR'));
});

test('chunk timeout stops waiting on a never-settling pipeline and closes the runner',async()=>{
  let calls=0;
  const runner=makeTransitChunkPipelineRunner(options(async()=>{calls++;return new Promise(()=>{});},{chunkTimeoutMs:15}));
  const req={...identity(),chunkIndex:0,startUtc:'2026-11-14T00:00:00.000Z',endUtc:'2026-11-14T00:30:00.000Z'};
  await assert.rejects(()=>runner(req),code('CHUNK_TIMEOUT'));
  assert.equal(calls,1);
  await assert.rejects(()=>runner(req),code('PIPELINE_SEQUENCE_ERROR'));
});

test('chunk timeout signals a hung provider without claiming that its I/O was stopped',async()=>{
  let capturedSignal, called=0;
  const p={...provider(),async getUnwrappedAspectResidual(req,signal){
    capturedSignal=signal;called++;return new Promise(()=>{});
  }};
  const runner=makeTransitChunkPipelineRunner(options(async req=>{
    await req.provider.getUnwrappedAspectResidual({datetimeUtc:req.startUtc});
    return syntheticResult(req);
  },{provider:p,chunkTimeoutMs:15}));
  const req={...identity(),chunkIndex:0,startUtc:'2026-11-14T00:00:00.000Z',endUtc:'2026-11-14T00:30:00.000Z'};
  await assert.rejects(()=>runner(req),code('CHUNK_TIMEOUT'));
  assert.equal(called,1);
  assert.equal(capturedSignal?.aborted,true);
});

test('abort between completed chunks prevents later provider work',async()=>{
  const controller=new AbortController();let called=0;
  const runner=makeTransitChunkPipelineRunner(options(async req=>{called++;return syntheticResult(req);},{signal:controller.signal}));
  const i=identity();
  await runner({...i,chunkIndex:0,startUtc:'2026-11-14T00:00:00.000Z',endUtc:'2026-11-14T00:30:00.000Z'});
  controller.abort();
  await assert.rejects(()=>runner({...i,chunkIndex:1,startUtc:'2026-11-14T00:30:00.000Z',endUtc:'2026-11-14T01:00:00.000Z'}),code('SEARCH_CANCELLED'));
  assert.equal(called,1);
});

test('timeout still terminates if callback swallows global budget error then hangs',async()=>{
  let calls=0;
  const p={...provider(),async getUnwrappedAspectResidual(){calls++;return 1;}};
  const runner=makeTransitChunkPipelineRunner(options(async req=>{
    await req.provider.getUnwrappedAspectResidual({datetimeUtc:req.startUtc});
    try { await req.provider.getUnwrappedAspectResidual({datetimeUtc:req.endUtc}); }
    catch(err){assert.equal(err.code,'GLOBAL_PIPELINE_BUDGET');}
    return new Promise(()=>{});
  },{provider:p,maxTotalProviderCalls:1,chunkTimeoutMs:15}));
  const req={...identity(),chunkIndex:0,startUtc:'2026-11-14T00:00:00.000Z',endUtc:'2026-11-14T00:30:00.000Z'};
  await assert.rejects(()=>runner(req),code('CHUNK_TIMEOUT'));
  assert.equal(calls,1);
});
