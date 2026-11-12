import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSynastryAspectsOnly } from '../src/synastry-aspects-only.mjs';
import { analyzeSynastryUncertaintyWithProvider } from '../src/synastry-enclosure-provider.mjs';

const provenance=Object.freeze({engineVersion:'synthetic',kernelSetId:'kernel-test',timeModel:'UTC-test'});
const coordinates=Object.freeze({center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT'});
const capabilities=Object.freeze({
  contract:'LongitudeEnclosureProviderCapabilities',
  contractVersion:'0.1.0-experimental',
  continuousCoverage:'PROVIDER_ASSERTED_FULL_INTERVAL_INCLUDING_STATIONS',
  coordinates,
});
const natal=(datetimeUtc,bodies)=>({
  contract:'NatalChartResult',contractVersion:'0.1.0-experimental',
  datetimeUtc,ephemerisProvenance:provenance,bodies,
});
const aspects=calculateSynastryAspectsOnly({
  chartA:natal('2026-01-01T12:00:00Z',{Sun:{name:'Sun',longitudeDeg:359}}),
  chartB:natal('2026-02-01T12:00:00Z',{Mars:{name:'Mars',longitudeDeg:1}}),
  birthTimeKnownA:false, positionBasisA:'REPRESENTATIVE_INSTANT',
  birthTimeKnownB:true, positionBasisB:'KNOWN_BIRTH_INSTANT',
  selectedBodyNamesA:['Sun'],selectedBodyNamesB:['Mars'],
  aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:5}],
});
const arcFor=chart=>chart==='A'?{Sun:{startDeg:358,spanDeg:3}}:{Mars:{startDeg:1,spanDeg:0}};
const responseFor=request=>({
  contract:'LongitudeEnclosureResponse',contractVersion:'0.1.0-experimental',
  chart:request.chart, intervalStartUtc:request.intervalStartUtc,
  intervalEndUtc:request.intervalEndUtc,representativeUtc:request.representativeUtc,
  coverage:'PROVIDER_ASSERTED_FULL_INTERVAL_INCLUDING_STATIONS',
  coordinates,ephemerisProvenance:provenance,
  coverageEvidence:{
    algorithmId:'synthetic-not-scientific',
    method:'PROVIDER_DECLARED_CONTINUOUS_BOUNDS',
    stationHandling:'INCLUDED', errorIncludedInArcs:true,
    maxLongitudeErrorDeg:0,
  },
  bodies:arcFor(request.chart),
});
const providerFor=(mutate=(response)=>response,requests=[])=>({
  capabilities,
  async getContinuousLongitudeEnclosure(request) {
    requests.push(request);
    return mutate(responseFor(request),request);
  },
});
const inputFor=(provider=providerFor())=>({
  aspectsOnlyResult:aspects,provider,
  intervalA:{startUtc:'2026-01-01T00:00:00Z',endUtc:'2026-01-01T23:59:59Z'},
  intervalB:{startUtc:'2026-02-01T12:00:00Z',endUtc:'2026-02-01T12:00:00Z'},
});

test('a future versioned provider can supply both chart enclosures for conditional analysis',async()=>{
  const requests=[];
  const result=await analyzeSynastryUncertaintyWithProvider(inputFor(providerFor(r=>r,requests)));
  assert.equal(result.contract,'SynastryProviderUncertaintyResult');
  assert.equal(result.status,'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(result.analysis.warning.code,'ENCLOSURE_COVERAGE_NOT_VERIFIED');
  assert.equal(result.analysis.aToB.facts[0].status,'ALWAYS_WITHIN_BOUNDS');
  assert.equal(result.analysis.bToA.facts[0].status,'ALWAYS_WITHIN_BOUNDS');
  assert.deepEqual(requests.map(r=>r.chart),['A','B']);
  assert.equal(requests[0].coverageRequirement,'FULL_INTERVAL_INCLUDING_STATIONS');
  assert.equal(requests[0].representativeUtc,aspects.timeBasis.A.datetimeUtc);
  assert.deepEqual(requests[0].bodyNames,['Sun']);
  for(const item of [requests[0],requests[0].bodyNames,requests[0].coordinates,
    requests[0].ephemerisProvenance,result,result.evidence,result.evidence.A,
    result.analysis,result.analysis.aToB.facts]) {
    assert.equal(Object.isFrozen(item),true);
  }
});

test('absent provider, unavailable method and inadequate capabilities fail closed',async()=>{
  for(const provider of [undefined,{},{
    capabilities:{...capabilities,continuousCoverage:'SAMPLES_ONLY'},
    getContinuousLongitudeEnclosure:async()=>null,
  },{capabilities:{...capabilities,coordinates:{...coordinates,frame:'J2000'}},
    getContinuousLongitudeEnclosure:async()=>null}]) {
    await assert.rejects(analyzeSynastryUncertaintyWithProvider({...inputFor(),provider}),
      e=>['MISSING_ENCLOSURE_PROVIDER','INCOMPATIBLE_ENCLOSURE_PROVIDER'].includes(e.code));
  }
});

test('response mismatched chart/time/frame and sample-only coverage are rejected',async()=>{
  const changes=[
    (r)=>({...r,chart:'B'}),
    (r)=>({...r,intervalEndUtc:'2026-01-02T12:00:00Z'}),
    (r)=>({...r,coordinates:{...coordinates,corrections:'GEOMETRIC'}}),
    (r)=>({...r,coverage:'SAMPLES_ONLY'}),
  ];
  for(const change of changes){
    await assert.rejects(analyzeSynastryUncertaintyWithProvider(inputFor(providerFor(
      (r,req)=>req.chart==='A'?change(r):r))),
      e=>e.code==='INCOMPATIBLE_ENCLOSURE_RESPONSE');
  }
});

test('provenance mismatch rejects a provider that switched kernels silently',async()=>{
  await assert.rejects(analyzeSynastryUncertaintyWithProvider(inputFor(providerFor(
    r=>({...r,ephemerisProvenance:{...provenance,kernelSetId:'different'}})))),
    e=>e.code==='INCOMPATIBLE_ENCLOSURE_PROVENANCE');
});

test('missing station/error coverage declaration is not silently upgraded',async()=>{
  for(const evidence of [
    {algorithmId:'mock',method:'DISCRETE_SAMPLES',stationHandling:'INCLUDED',
      errorIncludedInArcs:true,maxLongitudeErrorDeg:0},
    {algorithmId:'mock',method:'PROVIDER_DECLARED_CONTINUOUS_BOUNDS',
      stationHandling:'OMITTED',errorIncludedInArcs:true,maxLongitudeErrorDeg:0},
    {algorithmId:'mock',method:'PROVIDER_DECLARED_CONTINUOUS_BOUNDS',
      stationHandling:'INCLUDED',errorIncludedInArcs:false,maxLongitudeErrorDeg:0},
    {algorithmId:'mock',method:'PROVIDER_DECLARED_CONTINUOUS_BOUNDS',
      stationHandling:'INCLUDED',errorIncludedInArcs:true,maxLongitudeErrorDeg:Infinity},
  ]){
    await assert.rejects(analyzeSynastryUncertaintyWithProvider(inputFor(providerFor(
      r=>({...r,coverageEvidence:evidence})))),
      e=>e.code==='INVALID_ENCLOSURE_EVIDENCE');
  }
});

test('one missing body or forged extra body rejects an enclosure response',async()=>{
  for(const bodies of [{},{Sun:{startDeg:358,spanDeg:3},Moon:{startDeg:10,spanDeg:1}}]) {
    await assert.rejects(analyzeSynastryUncertaintyWithProvider(inputFor(providerFor(
      (r,req)=>req.chart==='A'?{...r,bodies}:r))),
      e=>e.code==='INVALID_ENCLOSURE_RESPONSE');
  }
});

test('known-time chart never accepts a nonzero interval or moving longitude arc',async()=>{
  await assert.rejects(analyzeSynastryUncertaintyWithProvider({
    ...inputFor(),intervalB:{startUtc:'2026-02-01T00:00:00Z',endUtc:'2026-02-01T23:59:59Z'},
  }),e=>e.code==='INCOMPATIBLE_INTERVAL');
  await assert.rejects(analyzeSynastryUncertaintyWithProvider(inputFor(providerFor(
    (r,req)=>req.chart==='B'?{...r,bodies:{Mars:{startDeg:1,spanDeg:0.5}}}:r))),
    e=>e.code==='INVALID_ENCLOSURE_RESPONSE');
});

test('unknown-time chart must have an interval covering its representative timestamp',async()=>{
  for(const intervalA of [
    {startUtc:'2026-01-01T13:00:00Z',endUtc:'2026-01-01T23:59:59Z'},
    {startUtc:'2026-01-01T12:00:00Z',endUtc:'2026-01-01T12:00:00Z'},
  ]) {
    await assert.rejects(analyzeSynastryUncertaintyWithProvider({
      ...inputFor(),intervalA,
    }),e=>e.code==='INCOMPATIBLE_INTERVAL');
  }
  await assert.rejects(analyzeSynastryUncertaintyWithProvider({
    ...inputFor(),intervalA:{startUtc:'2026-02-30T12:00:00Z',endUtc:'2026-03-01T00:00:00Z'},
  }),e=>e.code==='INVALID_INTERVAL');
});

test('second provider rejection never returns a partial analysis',async()=>{
  const requests=[];
  await assert.rejects(analyzeSynastryUncertaintyWithProvider(inputFor(providerFor(
    (r,req)=>req.chart==='B'?Promise.reject(new Error('synthetic Rust failure')):r,requests
  ))),/synthetic Rust failure/);
  assert.deepEqual(requests.map(r=>r.chart),['A','B']);
});

test('snapshot protects input rules against mutation during asynchronous provider calls',async()=>{
  const mutable={
    ...aspects,
    selectedBodyNames:{A:['Sun'],B:['Mars']},
    aspectDefinitions:[{id:'conjunction',angleDeg:0,maxOrbDeg:5}],
    timeBasis:{A:{...aspects.timeBasis.A},B:{...aspects.timeBasis.B}},
    provenance:{A:{...provenance},B:{...provenance}},
  };
  const provider=providerFor((r,req)=>{
    if(req.chart==='A'){
      mutable.aspectDefinitions[0].maxOrbDeg=0;
      mutable.selectedBodyNames.A[0]='Moon';
      mutable.provenance.A.kernelSetId='MUTATED';
      mutable.timeBasis.A.datetimeUtc='2026-01-01T14:00:00Z';
    }
    return r;
  });
  const out=await analyzeSynastryUncertaintyWithProvider({
    ...inputFor(provider),aspectsOnlyResult:mutable,
  });
  assert.equal(out.analysis.aspectDefinitions[0].maxOrbDeg,5);
  assert.equal(out.analysis.enclosures.A.points[0].name,'Sun');
  assert.equal(out.analysis.enclosures.A.ephemerisProvenance.kernelSetId,'kernel-test');
  assert.equal(out.analysis.enclosures.A.representativeUtc,'2026-01-01T12:00:00Z');
});

test('malformed rule list is rejected before calling the external provider',async()=>{
  const requests=[];
  const broken={...aspects,aspectDefinitions:[
    {id:'same',angleDeg:0,maxOrbDeg:3},{id:'same',angleDeg:180,maxOrbDeg:2},
  ]};
  await assert.rejects(analyzeSynastryUncertaintyWithProvider({
    ...inputFor(providerFor(r=>r,requests)),aspectsOnlyResult:broken,
  }),e=>e.code==='INVALID_ASPECT');
  assert.equal(requests.length,0);
});

test('does not mutate caller input and keeps astronomical claims conditional',async()=>{
  const input=inputFor();
  const result=await analyzeSynastryUncertaintyWithProvider(input);
  assert.equal(result.analysis.interpretation,'CONDITIONAL_ON_CALLER_ENCLOSURES');
  assert.equal(result.analysis.houseMode,'UNAVAILABLE');
  assert.equal(result.analysis.angles,null);
  assert.equal(input.aspectsOnlyResult,aspects);
  assert.equal(input.intervalA.startUtc,'2026-01-01T00:00:00Z');
});
