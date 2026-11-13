import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareTransitAspectEventCandidates } from '../src/transit-event-pipeline.mjs';

const t0 = Date.parse('2026-11-12T00:00:00Z');
const metadata = Object.freeze({ contractVersion:'0.1.0-experimental',
  coverage:'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED',
  enclosureCoverage:'CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES',
  stationCoverage:'INCLUDED', numericErrorCoverage:'INCLUDED',
  center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT',
  engineVersion:'synthetic',kernelSetId:'test-kernel',timeModel:'test-TDB' });
const line = ms => (ms-t0)/3600000 - .37;
function makeProvider(fn=line,bound=(a,b)=>[fn(a),fn(b)]) {
  return { capabilities:{...metadata},
    async getUnwrappedAspectResidual(request) {
      return {datetimeUtc:request.datetimeUtc, residualDeg:fn(Date.parse(request.datetimeUtc)),metadata:{...metadata}};
    },
    async getUnwrappedResidualEnclosure(request) {
      const [lowerDeg,upperDeg] = bound(Date.parse(request.startUtc), Date.parse(request.endUtc));
      return { startUtc:request.startUtc,endUtc:request.endUtc,lowerDeg,upperDeg,metadata:{...metadata} };
    }
  };
}
function options(provider=makeProvider()) { return {
  startUtc:'2026-11-12T00:00:00Z',endUtc:'2026-11-12T01:00:00Z',
  skyBodyName:'Mars',natalBodyName:'Sun',aspectId:'square',exactAngleDeg:90,
  orientation:'POSITIVE',targetIntervalMs:60000,maxDepth:10,maxProviderCalls:400,
  ephemerisProvenance:{engineVersion:'synthetic',kernelSetId:'test-kernel',timeModel:'test-TDB'},
  provider, refinement:{timeToleranceMs:150,residualToleranceDeg:0.0001,
    maxIterations:40,maxCandidateRefinements:64,maxRefinementCalls:300}
}; }
async function rejects(patch,code) {
  await assert.rejects(()=>prepareTransitAspectEventCandidates({...options(),...patch}),e=>e.code===code);
}
test('scan + refinement deliver one conditional SKY_TO_NATAL candidate with immutable facts',async()=>{
  const r=await prepareTransitAspectEventCandidates(options());
  assert.equal(r.contract,'TransitAspectEventCandidates');
  assert.equal(r.direction,'SKY_TO_NATAL');
  assert.equal(r.refinedCandidates.length,1);
  const hit=r.refinedCandidates[0].refinement;
  assert.ok(Math.abs(Date.parse(hit.datetimeUtc)-t0-.37*3600000)<=360);
  assert.equal(hit.skyBodyName,'Mars');
  assert.equal(hit.natalBodyName,'Sun');
  assert.equal(r.scientificallyValidated,false);
  assert.equal(r.verification,'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(r.refinedCandidates[0].uniqueness,'MULTIPLE_ROOTS_NOT_EXCLUDED');
  assert.ok(r.scanProviderCalls>0 && r.refinementProviderCalls>0);
  assert.ok(Object.isFrozen(r));assert.ok(Object.isFrozen(r.refinedCandidates));
  assert.ok(Object.isFrozen(r.refinedCandidates[0]));
});
test('strict enclosures can conditionally exclude the complete interval with no refinement',async()=>{
  const p=makeProvider(()=>1,()=>[.9,1.1]);
  p.getUnwrappedAspectResidual=()=>{throw Error('must not sample excluded interval');};
  const r=await prepareTransitAspectEventCandidates(options(p));
  assert.equal(r.excludedIntervals,1);
  assert.equal(r.refinementProviderCalls,0);
  assert.equal(r.refinedCandidates.length,0);
  assert.equal(r.unresolvedIntervals.length,0);
  assert.equal(r.completeness,'NOT_CERTIFIED_MULTIPLE_ROOTS_AND_TANGENCIES_POSSIBLE');
});
test('retrograde-shaped three crossings preserve several candidate roots and an exact sampled zero',async()=>{
  const f=ms=>{const h=(ms-t0)/3600000; return (h-1)*(h-3)*(h-5)/10;};
  const x=options(makeProvider(f,()=>[-100,100]));
  x.endUtc='2026-11-12T06:00:00Z';x.maxDepth=4;x.targetIntervalMs=1350000;
  x.maxProviderCalls=100;x.refinement.maxRefinementCalls=200;
  const r=await prepareTransitAspectEventCandidates(x);
  assert.ok(r.refinedCandidates.length>=2);
  assert.ok(r.sampledZeros.some(v=>v.datetimeUtc==='2026-11-12T03:00:00.000Z'));
  assert.ok(r.unresolvedIntervals.length>0);
  assert.equal(r.hasUnresolvedIntervals,true);
  assert.ok(r.refinedCandidates.every(v=>v.refinement.direction==='SKY_TO_NATAL'));
});
test('tangent-only contact remains unresolved, never declared absent',async()=>{
  const f=ms=>((ms-t0)/3600000-.371)**2;
  const r=await prepareTransitAspectEventCandidates({...options(makeProvider(f,()=>[0,2])),maxDepth:4});
  assert.equal(r.refinedCandidates.length,0);
  assert.ok(r.unresolvedIntervals.length>0);
  assert.equal(r.hasUnresolvedIntervals,true);
});
test('shared sampled zero is deduplicated and is not converted to fictitious refinement',async()=>{
  const f=ms=>(ms-t0)/3600000-.5;
  const r=await prepareTransitAspectEventCandidates({...options(makeProvider(f,(a,b)=>[f(a),f(b)])),maxDepth:1});
  assert.equal(r.sampledZeros.length,1);
  assert.equal(r.sampledZeros[0].datetimeUtc,'2026-11-12T00:30:00.000Z');
  assert.equal(r.refinedCandidates.length,0);
});
test('candidate count cap fails atomically before any refinement',async()=>{
  const f=ms=>{const h=(ms-t0)/3600000; return (h-1)*(h-3)*(h-5)/10;};
  const p=makeProvider(f,()=>[-100,100]);let pointCalls=0;
  const old=p.getUnwrappedAspectResidual.bind(p);
  p.getUnwrappedAspectResidual=async request=>{pointCalls++;return old(request);};
  const x=options(p);x.endUtc='2026-11-12T06:00:00Z';x.maxDepth=4;
  x.targetIntervalMs=1350000;x.maxProviderCalls=100;x.refinement.maxCandidateRefinements=1;
  await assert.rejects(()=>prepareTransitAspectEventCandidates(x),e=>e.code==='REFINEMENT_BUDGET_EXCEEDED');
  assert.ok(pointCalls>0); // scan performed, but result is not returned
});
test('refinement call cap fails closed even though scan succeeded',async()=>{
  const x=options();x.refinement.maxRefinementCalls=1;
  await assert.rejects(()=>prepareTransitAspectEventCandidates(x),e=>e.code==='REFINEMENT_BUDGET_EXCEEDED');
});
test('incompatible provider capabilities and metadata fail closed',async()=>{
  const p=makeProvider();p.capabilities.enclosureCoverage='SAMPLED_ONLY';
  await rejects({provider:p},'UNSUPPORTED_COVERAGE');
  const q=makeProvider();q.getUnwrappedResidualEnclosure=async req=>({
    startUtc:req.startUtc,endUtc:req.endUtc,lowerDeg:-1,upperDeg:1,
    metadata:{...metadata,frame:'J2000'} });
  await rejects({provider:q},'INCOMPATIBLE_EPHEMERIS');
});
test('initial invalid inputs reject before calling the provider',async()=>{
  const invalids=[
    [{refinement:null},'INVALID_ARGUMENT'],
    [{refinement:{...options().refinement,maxIterations:129}},'INVALID_LIMIT'],
    [{refinement:{...options().refinement,residualToleranceDeg:0}},'INVALID_LIMIT'],
    [{refinement:{...options().refinement,maxCandidateRefinements:0}},'INVALID_LIMIT'],
    [{refinement:{...options().refinement,maxRefinementCalls:0}},'INVALID_LIMIT'],
    [{endUtc:'2026-02-30T01:00:00Z'},'INVALID_UTC']
  ];
  for(const [patch,code] of invalids) await rejects(patch,code);
});
test('provider error during a later refinement propagates with no partial result',async()=>{
  const p=makeProvider();const orig=p.getUnwrappedAspectResidual.bind(p);let calls=0;
  p.getUnwrappedAspectResidual=async req=>{if(++calls>2)throw Error('ephemeris shutdown');return orig(req);};
  await assert.rejects(()=>prepareTransitAspectEventCandidates(options(p)),/ephemeris shutdown/);
});
test('snapshots input, refinement limits, provenance and provider methods across await',async()=>{
  const p=makeProvider();const x=options(p);
  const old=p.getUnwrappedResidualEnclosure.bind(p);
  let calls=0;
  p.getUnwrappedResidualEnclosure=async req=>{
    if(++calls===1){
      x.skyBodyName='Jupiter';x.refinement.maxCandidateRefinements=0;
      x.refinement.timeToleranceMs=999999;x.refinement.maxRefinementCalls=0;
      x.ephemerisProvenance.engineVersion='spoof';
      p.capabilities.frame='J2000';
      p.getUnwrappedAspectResidual=()=>{throw Error('unexpected changed method');};
    }
    return old(req);
  };
  const r=await prepareTransitAspectEventCandidates(x);
  assert.equal(r.skyBodyName,'Mars');
  assert.equal(r.ephemerisProvenance.engineVersion,'synthetic');
  assert.equal(r.refinedCandidates[0].refinement.timeToleranceMs,150);
  assert.ok(r.refinementProviderCalls>0);
});
test('refinement time tolerance tightens for a narrower scanner leaf interval',async()=>{
  const x=options();x.refinement.timeToleranceMs=600000;
  const r=await prepareTransitAspectEventCandidates(x);
  assert.ok(r.refinedCandidates.length>0);
  for(const v of r.refinedCandidates){
    const span=Date.parse(v.candidate.endUtc)-Date.parse(v.candidate.startUtc);
    assert.equal(v.refinement.timeToleranceMs,span);
  }
});

test('rejects a changing residual when refinement resamples a scan endpoint',async()=>{
  const p=makeProvider();
  const seen=new Map();
  const original=p.getUnwrappedAspectResidual.bind(p);
  p.getUnwrappedAspectResidual=async req=>{
    const result=await original(req);
    const count=seen.get(req.datetimeUtc) ?? 0;
    seen.set(req.datetimeUtc,count+1);
    return count===0 ? result : {...result,residualDeg:result.residualDeg+0.00001};
  };
  // All declared provenance remains pinned. Numeric changes must still fail closed.
  await assert.rejects(
    ()=>prepareTransitAspectEventCandidates(options(p)),
    e=>e.code==='INCONSISTENT_RESIDUAL'
  );
  assert.ok([...seen.values()].some(count=>count>1));
});

test('accepts deterministic zero endpoints regardless of signed-zero representation',async()=>{
  const f=ms=>(ms-t0)/3600000-.5;
  const p=makeProvider(f,(a,b)=>[f(a),f(b)]);
  const original=p.getUnwrappedAspectResidual.bind(p);
  p.getUnwrappedAspectResidual=async req=>{
    const r=await original(req);
    if (r.residualDeg===0) return {...r,residualDeg:-0};
    return r;
  };
  const result=await prepareTransitAspectEventCandidates({...options(p),maxDepth:1});
  assert.equal(result.sampledZeros.length,1);
  assert.equal(result.sampledZeros[0].datetimeUtc,'2026-11-12T00:30:00.000Z');
});

test('rejects version change after scan when exact-hit refinement repeats an endpoint',async()=>{
  const p=makeProvider();
  const original=p.getUnwrappedAspectResidual.bind(p);
  const visited=new Set();
  let repeated=0;
  p.getUnwrappedAspectResidual=async request=>{
    const response=await original(request);
    if (visited.has(request.datetimeUtc)) {
      repeated++;
      return {...response,metadata:{...response.metadata,contractVersion:'0.2.0-incompatible'}};
    }
    visited.add(request.datetimeUtc);
    return response;
  };
  await assert.rejects(()=>prepareTransitAspectEventCandidates(options(p)),
    error=>error.code==='INCOMPATIBLE_EPHEMERIS');
  assert.ok(repeated>0);
});

test('rejects false-negative sibling enclosures before producing transit facts',async()=>{
  // Both children report overlapping positive ranges, but the sampled shared
  // midpoint is +0.13; their asserted [0.5,1] enclosure is inconsistent.
  // Without midpoint validation the real 00:22:12 crossing disappears.
  const p=makeProvider(line,(a,b)=>
    a===t0 && b===t0+3600000 ? [-1,1] : [.5,1]);
  await assert.rejects(
    ()=>prepareTransitAspectEventCandidates({...options(p),
      targetIntervalMs:60000,maxDepth:1,maxProviderCalls:20}),
    e=>e.code==='INVALID_ENCLOSURE'
  );
});
