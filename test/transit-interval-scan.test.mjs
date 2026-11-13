import test from 'node:test';
import assert from 'node:assert/strict';
import { scanTransitAspectCandidateIntervals } from '../src/transit-interval-scan.mjs';

const startMs = Date.parse('2026-11-12T00:00:00Z');
const meta = Object.freeze({contractVersion:'0.1.0-experimental', coverage:'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED',
  enclosureCoverage:'CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES', stationCoverage:'INCLUDED',
  numericErrorCoverage:'INCLUDED', center:'EARTH', frame:'ECLIPTIC_OF_DATE', corrections:'APPARENT',
  engineVersion:'synthetic', kernelSetId:'kernel-mock', timeModel:'mock-TDB'});
function makeProvider(f, bounds) {
  return {capabilities:{...meta},
    async getUnwrappedAspectResidual(req) {return {datetimeUtc:req.datetimeUtc,
      residualDeg:f(Date.parse(req.datetimeUtc)), metadata:{...meta}};},
    async getUnwrappedResidualEnclosure(req) {const [lowerDeg,upperDeg]=bounds(
      Date.parse(req.startUtc),Date.parse(req.endUtc));
      return {startUtc:req.startUtc,endUtc:req.endUtc,lowerDeg,upperDeg,metadata:{...meta}};}
  };
}
const linear = ms => (ms-startMs)/3600000-.37;
const lineBounds = (a,b) => [linear(a),linear(b)];
function base(provider=makeProvider(linear,lineBounds)) {return {
  startUtc:'2026-11-12T00:00:00Z',endUtc:'2026-11-12T01:00:00Z',
  skyBodyName:'Mars',natalBodyName:'Sun',aspectId:'square',exactAngleDeg:90,
  orientation:'POSITIVE',targetIntervalMs:60000,maxDepth:10,maxProviderCalls:300,
  ephemerisProvenance:{engineVersion:'synthetic',kernelSetId:'kernel-mock',timeModel:'mock-TDB'},provider
};}
async function throws(patch,code) {await assert.rejects(()=>scanTransitAspectCandidateIntervals({...base(),...patch}),e=>e.code===code);}

test('linear continuous crossing returns a sign-change candidate, not a certified exact hit',async()=>{
  const r=await scanTransitAspectCandidateIntervals(base());
  assert.equal(r.signChangeCandidates.length,1);
  assert.equal(r.unresolvedIntervals.length,0);
  assert.ok(Date.parse(r.signChangeCandidates[0].startUtc)<startMs+.37*3600000);
  assert.ok(Date.parse(r.signChangeCandidates[0].endUtc)>startMs+.37*3600000);
  assert.equal(r.completeness,'CONDITIONAL_ON_CALLER_ENCLOSURES_NOT_SCIENTIFICALLY_VALIDATED');
  assert.ok(Object.isFrozen(r.signChangeCandidates[0]));
});
test('strict positive interval bounds exclude an interval without sampling points',async()=>{
  const p=makeProvider(()=>1,()=>[.5,1.5]);
  p.getUnwrappedAspectResidual=()=>{throw Error('Must not sample excluded intervals');};
  const r=await scanTransitAspectCandidateIntervals(base(p));
  assert.equal(r.excludedIntervals,1);
  assert.equal(r.providerCalls,1);
  assert.deepEqual(r.signChangeCandidates,[]);
  assert.deepEqual(r.unresolvedIntervals,[]);
});
test('multiple roots in retrograde-like loop can yield distinct brackets and sampled zero',async()=>{
  const f=ms=>{const h=(ms-startMs)/3600000;return (h-1)*(h-3)*(h-5)/10;};
  const opts={...base(makeProvider(f,()=>[-100,100])),endUtc:'2026-11-12T06:00:00Z',
    targetIntervalMs:22.5*60000,maxDepth:4,maxProviderCalls:90};
  const r=await scanTransitAspectCandidateIntervals(opts);
  assert.ok(r.signChangeCandidates.length>=2);
  assert.ok(r.sampledZeros.some(x=>x.datetimeUtc==='2026-11-12T03:00:00.000Z'));
  assert.ok(r.unresolvedIntervals.length>0);
});
test('touching without sign change is UNRESOLVED, not silently excluded',async()=>{
  const f=ms=>((ms-startMs)/3600000-.371)**2;
  const r=await scanTransitAspectCandidateIntervals({...base(makeProvider(f,()=>[0,2])),maxDepth:4,targetIntervalMs:60000});
  assert.equal(r.signChangeCandidates.length,0);
  assert.ok(r.unresolvedIntervals.length>0);
});
test('exact sampled boundary points are deduplicated',async()=>{
  const f=ms=>(ms-startMs)/3600000-.5;
  const r=await scanTransitAspectCandidateIntervals({...base(makeProvider(f,(a,b)=>[f(a),f(b)])),maxDepth:1,targetIntervalMs:60000});
  assert.equal(r.sampledZeros.length,1);
  assert.equal(r.sampledZeros[0].datetimeUtc,'2026-11-12T00:30:00.000Z');
});
test('fail closed on budget exhaustion without returning partial search',async()=>{
  await throws({maxProviderCalls:2},'SEARCH_BUDGET_EXHAUSTED');
});
test('reject invalid UTC and reversed/overlong intervals',async()=>{
  await throws({startUtc:'2026-02-30T00:00:00Z'},'INVALID_UTC');
  await throws({startUtc:'2026-11-12T02:00:00Z'},'INVALID_INTERVAL');
  await throws({endUtc:'2027-01-01T00:00:00Z'},'INVALID_INTERVAL');
});
test('reject unsafe limits and implicit aspect/orientation',async()=>{
  for(const patch of [{maxDepth:25},{maxProviderCalls:4097},{targetIntervalMs:0},{targetIntervalMs:NaN}])
    await throws(patch,'INVALID_LIMIT');
  await throws({orientation:'AUTO'},'INVALID_ASPECT');
  await throws({exactAngleDeg:181},'INVALID_ASPECT');
});
test('reject sample-only provider and missing station coverage',async()=>{
  const p=makeProvider(linear,lineBounds);p.capabilities.enclosureCoverage='SAMPLES';
  await throws({provider:p},'UNSUPPORTED_COVERAGE');
  const q=makeProvider(linear,lineBounds);q.capabilities.stationCoverage='NOT_INCLUDED';
  await throws({provider:q},'UNSUPPORTED_COVERAGE');
});
test('reject false range response metadata, wrong UTC echo and inverted bounds',async()=>{
  const p=makeProvider(linear,lineBounds);
  p.getUnwrappedResidualEnclosure=async req=>({startUtc:req.startUtc,endUtc:req.endUtc,
    lowerDeg:-1,upperDeg:1,metadata:{...meta,frame:'J2000'}});
  await throws({provider:p},'INCOMPATIBLE_EPHEMERIS');
  const q=makeProvider(linear,lineBounds);
  q.getUnwrappedResidualEnclosure=async req=>({startUtc:req.startUtc,endUtc:'wrong',
    lowerDeg:-1,upperDeg:1,metadata:meta});
  await throws({provider:q},'INVALID_ENCLOSURE');
  await throws({provider:makeProvider(linear,()=>[2,1])},'INVALID_ENCLOSURE');
});
test('reject point samples outside the provider interval enclosure',async()=>{
  const p=makeProvider(()=>3,()=>[-1,1]);
  await throws({provider:p,targetIntervalMs:3600000},'INVALID_ENCLOSURE');
});
test('freeze requests, snapshot mutable input, and validate point provenance',async()=>{
  const p=makeProvider(linear,lineBounds);const opts=base(p);let count=0;
  p.getUnwrappedResidualEnclosure=async req=>{
    assert.ok(Object.isFrozen(req));assert.ok(Object.isFrozen(req.ephemerisProvenance));
    if(++count===1){opts.maxDepth=0;opts.skyBodyName='Jupiter';opts.ephemerisProvenance.kernelSetId='SPOOF';}
    return {startUtc:req.startUtc,endUtc:req.endUtc,
      lowerDeg:linear(Date.parse(req.startUtc)),upperDeg:linear(Date.parse(req.endUtc)),metadata:meta};
  };
  const r=await scanTransitAspectCandidateIntervals(opts);
  assert.equal(r.skyBodyName,'Mars');assert.equal(r.ephemerisProvenance.kernelSetId,'kernel-mock');
  assert.equal(r.maxDepth,10);assert.equal(r.signChangeCandidates.length,1);
  const bad=makeProvider(linear,lineBounds);
  bad.getUnwrappedAspectResidual=async req=>({datetimeUtc:req.datetimeUtc,residualDeg:0,metadata:{...meta,engineVersion:'wrong'}});
  await throws({provider:bad},'INCOMPATIBLE_EPHEMERIS');
});

test('fails closed when child enclosures contradict an otherwise plausible parent',async()=>{
  const p=makeProvider(linear,(a,b)=>{
    if(a===startMs && b===startMs+3600000) return [-1,1];
    return [2,3]; // A child cannot exceed the claimed parent upper bound.
  });
  await throws({provider:p,maxDepth:1,targetIntervalMs:60000},'INVALID_ENCLOSURE');
});
test('refuses to exclude an adjacent interval that contradicts a cached shared endpoint',async()=>{
  const p=makeProvider(linear,(a,b)=>{
    if(a===startMs && b===startMs+3600000) return [-10,10];
    if(a===startMs) return [-1,1]; // Valid first leaf; caches its right endpoint.
    return [.5,1]; // Nested inside the parent but excludes the cached mid residual.
  });
  await throws({provider:p,maxDepth:1,targetIntervalMs:60000},'INVALID_ENCLOSURE');
});

test('rejects mismatched point and enclosure response contract versions',async()=>{
  const rangeWrong=makeProvider(linear,lineBounds);
  const originalRange=rangeWrong.getUnwrappedResidualEnclosure.bind(rangeWrong);
  rangeWrong.getUnwrappedResidualEnclosure=async req=>{
    const result=await originalRange(req);
    return {...result,metadata:{...result.metadata,contractVersion:'0.2.0-incompatible'}};
  };
  await throws({provider:rangeWrong},'INCOMPATIBLE_EPHEMERIS');

  const pointMissing=makeProvider(linear,lineBounds);
  const originalPoint=pointMissing.getUnwrappedAspectResidual.bind(pointMissing);
  pointMissing.getUnwrappedAspectResidual=async req=>{
    const result=await originalPoint(req);
    return {...result,metadata:{...result.metadata,contractVersion:undefined}};
  };
  await throws({provider:pointMissing,targetIntervalMs:3600000},'INCOMPATIBLE_EPHEMERIS');
});

test('accepts valid loose child enclosures and intersects them with parent bounds',async()=>{
  const p=makeProvider(linear,(a,b)=>
    a===startMs && b===startMs+3600000 ? [-1,1] : [-2,2]);
  const r=await scanTransitAspectCandidateIntervals({
    ...base(p),maxDepth:1,targetIntervalMs:60000
  });
  assert.equal(r.signChangeCandidates.length,1);
  assert.equal(r.signChangeCandidates[0].lowerDeg,-1);
  assert.equal(r.signChangeCandidates[0].upperDeg,1);
  assert.ok(r.unresolvedIntervals.length>0);
});

test('rejects disjoint sibling enclosures before silent exclusion of both branches',async()=>{
  // Both children are contained in their broad parent, but their claimed
  // residual ranges are disjoint at the exact same shared midpoint.
  const p=makeProvider(linear,(a,b)=>{
    if (a===startMs && b===startMs+3600000) return [-2,2];
    return a===startMs ? [-2,-.1] : [.1,2];
  });
  await throws({provider:p,maxDepth:1,targetIntervalMs:60000},'INVALID_ENCLOSURE');
});

test('accepts sibling enclosures touching at their shared sampled boundary',async()=>{
  const p=makeProvider(linear,(a,b)=>{
    if (a===startMs && b===startMs+3600000) return [-1,1];
    return a===startMs ? [linear(a),linear(b)] : [linear(a),linear(b)];
  });
  const r=await scanTransitAspectCandidateIntervals({
    ...base(p),maxDepth:1,targetIntervalMs:60000
  });
  assert.equal(r.signChangeCandidates.length,1);
  assert.equal(r.unresolvedIntervals.length,0);
});

test('rejects untrimmed scan identifiers before requesting any enclosure',async()=>{
  const p=makeProvider(linear,lineBounds);
  let calls=0;
  const original=p.getUnwrappedResidualEnclosure.bind(p);
  p.getUnwrappedResidualEnclosure=async req=>{calls++;return original(req);};
  for (const patch of [
    {skyBodyName:' Mars'},
    {natalBodyName:'Sun '},
    {aspectId:' square'},
    {aspectId:'square\t'},
    {ephemerisProvenance:{engineVersion:' synthetic',kernelSetId:'kernel-mock',timeModel:'mock-TDB'}},
    {ephemerisProvenance:{engineVersion:'synthetic',kernelSetId:'kernel-mock ',timeModel:'mock-TDB'}},
    {ephemerisProvenance:{engineVersion:'synthetic',kernelSetId:'kernel-mock',timeModel:'mock-TDB '}}
  ]) {
    await throws({...patch,provider:p},'INVALID_ARGUMENT');
  }
  assert.equal(calls,0);
});
