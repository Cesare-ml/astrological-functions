import test from 'node:test';
import assert from 'node:assert/strict';
import { refineBracketedTransitAspectHit } from '../src/transit-exact-hit.mjs';

const startUtc = '2026-11-12T00:00:00Z';
const startMs = Date.parse(startUtc);
const metadata = { contractVersion:'0.1.0-experimental', center:'EARTH', frame:'ECLIPTIC_OF_DATE', corrections:'APPARENT',
  coverage:'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED', engineVersion:'synthetic-rust', kernelSetId:'synthetic', timeModel:'synthetic-TDB' };
function provider(residual, mutate) {
  return { capabilities: { contractVersion:'0.1.0-experimental', ...metadata },
    async getUnwrappedAspectResidual(request) {
      if (mutate) mutate(request);
      return { datetimeUtc:request.datetimeUtc, residualDeg:residual(Date.parse(request.datetimeUtc)), metadata:{...metadata} };
    }
  };
}
function base(residual = ms => (ms - (startMs + 123456)) / 3600000) {
  return { startUtc, endUtc:'2026-11-12T01:00:00Z', skyBodyName:'Mars', natalBodyName:'Sun', aspectId:'square',
    exactAngleDeg:90, orientation:'POSITIVE', timeToleranceMs:100, residualToleranceDeg:0.0001,
    maxIterations:40, ephemerisProvenance:{engineVersion:'synthetic-rust',kernelSetId:'synthetic',timeModel:'synthetic-TDB'},
    provider:provider(residual) };
}
const reject = async (patch, code) => assert.rejects(() => refineBracketedTransitAspectHit({...base(),...patch}), e => e.code === code);

test('bisection returns tolerance-bound bracket for one non-midpoint exact transit', async()=>{
  const result = await refineBracketedTransitAspectHit(base());
  assert.equal(result.contract, 'BracketedTransitAspectHit');
  assert.equal(result.direction, 'SKY_TO_NATAL');
  assert.equal(result.status,'BRACKETED_APPROXIMATION');
  assert.ok(Math.abs(Date.parse(result.datetimeUtc) - startMs - 123456) <= 360);
  assert.ok(Math.abs(result.residualDeg) <= 0.0001);
  assert.ok(Date.parse(result.bracketEndUtc) - Date.parse(result.bracketStartUtc) <= 100);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.ephemerisProvenance));
});
test('exact sampled zero at midpoint, including 0/360 crossing', async()=>{
  const b=base(ms => (359 + 2*(ms-startMs)/3600000) - 360);
  const r=await refineBracketedTransitAspectHit(b);
  assert.equal(r.status,'SAMPLED_ZERO');
  assert.equal(r.datetimeUtc,'2026-11-12T00:30:00.000Z');
});
test('a retrograde-like loop can yield separate roots, never a claim of exhaustive discovery', async()=>{
  const poly=(ms)=>{const h=(ms-startMs)/3600000;return ((h-1)*(h-3)*(h-5))/10;};
  const solutions=[];
  for (const [start,end] of [[0,2],[2,4],[4,6]]) {
    const opts={...base(poly),startUtc:new Date(startMs+start*3600000).toISOString(),
      endUtc:new Date(startMs+end*3600000).toISOString()};
    solutions.push((await refineBracketedTransitAspectHit(opts)).datetimeUtc);
  }
  assert.deepEqual(solutions,['2026-11-12T01:00:00.000Z','2026-11-12T03:00:00.000Z','2026-11-12T05:00:00.000Z']);
});
test('signless tangent touch is not wrongly reported as absent or found', async()=>{
  await reject({provider:provider(ms=>((ms-startMs)/3600000-.5)**2)},'ROOT_NOT_BRACKETED');
});
test('exact-zero first endpoint reports SAMPLED_ZERO with one evaluation', async()=>{
  const result=await refineBracketedTransitAspectHit({
    ...base(),provider:provider(ms=>(ms-startMs)/3600000)
  });
  assert.equal(result.status,'SAMPLED_ZERO');
  assert.equal(result.residualDeg,0);
  assert.equal(result.datetimeUtc,'2026-11-12T00:00:00.000Z');
  assert.equal(result.iterations,0);
  assert.equal(result.evaluations,1);
});

test('exact-zero final endpoint reports SAMPLED_ZERO with two evaluations', async()=>{
  const endMs=startMs+3600000;
  const result=await refineBracketedTransitAspectHit({
    ...base(),provider:provider(ms=>(ms-endMs)/3600000)
  });
  assert.equal(result.status,'SAMPLED_ZERO');
  assert.equal(result.residualDeg,0);
  assert.equal(result.datetimeUtc,'2026-11-12T01:00:00.000Z');
  assert.equal(result.iterations,0);
  assert.equal(result.evaluations,2);
});

test('negative signed-zero endpoint also reports SAMPLED_ZERO', async()=>{
  const result=await refineBracketedTransitAspectHit({
    ...base(),provider:provider(ms=>ms===startMs ? -0 : (ms-startMs)/3600000)
  });
  assert.equal(result.status,'SAMPLED_ZERO');
  assert.ok(Object.is(result.residualDeg,-0));
  assert.equal(result.evaluations,1);
});

test('near-zero final endpoint stays a tolerance sample, not an exact zero', async()=>{
  const endMs=startMs+3600000;
  const result=await refineBracketedTransitAspectHit({
    ...base(),provider:provider(ms=>.00005+(ms-endMs)/3600000)
  });
  assert.equal(result.status,'SAMPLED_WITHIN_RESIDUAL_TOLERANCE');
  assert.equal(result.datetimeUtc,'2026-11-12T01:00:00.000Z');
  assert.equal(result.evaluations,2);
});

test('a near-zero endpoint is labeled as a tolerance sample, not an exact root', async()=>{
  const r=await refineBracketedTransitAspectHit({...base(),provider:provider(ms=>.00005+(ms-startMs)/1000000)});
  assert.equal(r.status,'SAMPLED_WITHIN_RESIDUAL_TOLERANCE');
  assert.equal(r.iterations,0);
});
test('non convergence is explicit for insufficient iteration budget', async()=>{
  await reject({maxIterations:1},'NON_CONVERGENCE');
});
test('rejects inverted, very long and impossible UTC intervals', async()=>{
  await reject({startUtc:'2026-02-30T00:00:00Z'},'INVALID_UTC');
  await reject({startUtc:'2026-11-12T02:00:00Z'},'INVALID_INTERVAL');
  await reject({endUtc:'2027-01-01T00:00:00Z'},'INVALID_INTERVAL');
});
test('rejects missing and invalid iteration/time/residual limits', async()=>{
  for(const x of [{timeToleranceMs:0},{timeToleranceMs:3.2},{residualToleranceDeg:0},
    {residualToleranceDeg:Infinity},{maxIterations:129},{maxIterations:undefined}])
    await reject(x,'INVALID_LIMIT');
});
test('requires a declared continuous unwrapped provider, not sample-only claims', async()=>{
  await reject({provider:{...provider(()=>0),capabilities:{contractVersion:'0.1.0-experimental',...metadata,coverage:'SAMPLED_ONLY'}}},'UNSUPPORTED_COVERAGE');
  await reject({provider:{}},'UNSUPPORTED_COVERAGE');
});
test('metadata, timestamp echo and finite residual fail closed', async()=>{
  const wrong = provider(()=>0);
  wrong.getUnwrappedAspectResidual=async request=>({datetimeUtc:request.datetimeUtc,residualDeg:1,
    metadata:{...metadata,frame:'J2000'}});
  await reject({provider:wrong},'INCOMPATIBLE_EPHEMERIS');
  const badTimestamp=provider(()=>0);
  badTimestamp.getUnwrappedAspectResidual=async()=>({datetimeUtc:'2026-11-13T00:00:00Z',residualDeg:1,metadata});
  await reject({provider:badTimestamp},'INVALID_RESIDUAL');
  await reject({provider:provider(()=>NaN)},'INVALID_RESIDUAL');
});
test('snapshots inputs and freezes every evaluator request before asynchronous work', async()=>{
  const opts=base();
  const requests=[];
  opts.provider=provider(ms=>(ms-startMs-123456)/3600000,req=>{
    requests.push(req);
    if(requests.length===1) {opts.skyBodyName='Jupiter'; opts.maxIterations=1; opts.timeToleranceMs=1000000;
      opts.residualToleranceDeg=1; opts.ephemerisProvenance.engineVersion='spoof';}
  });
  const r=await refineBracketedTransitAspectHit(opts);
  assert.equal(r.skyBodyName,'Mars');
  assert.equal(r.ephemerisProvenance.engineVersion,'synthetic-rust');
  assert.equal(r.timeToleranceMs,100);
  assert.equal(r.residualToleranceDeg,0.0001);
  assert.ok(r.iterations>1);
  assert.ok(requests.every(req=>Object.isFrozen(req) && Object.isFrozen(req.ephemerisProvenance)));
});
test('explicit angle and orientation are mandatory', async()=>{
  await reject({orientation:'AUTO'},'INVALID_ASPECT');
  await reject({exactAngleDeg:181},'INVALID_ASPECT');
  await reject({skyBodyName:''},'INVALID_ARGUMENT');
});

test('rejects missing, mismatched, and mid-search version changes in residual metadata', async()=>{
  const missing=provider(()=>0);
  missing.getUnwrappedAspectResidual=async request=>({
    datetimeUtc:request.datetimeUtc, residualDeg:0,
    metadata:{...metadata,contractVersion:undefined}
  });
  await reject({provider:missing},'INCOMPATIBLE_EPHEMERIS');

  const wrong=provider(()=>0);
  wrong.getUnwrappedAspectResidual=async request=>({
    datetimeUtc:request.datetimeUtc,residualDeg:0,
    metadata:{...metadata,contractVersion:'0.2.0-incompatible'}
  });
  await reject({provider:wrong},'INCOMPATIBLE_EPHEMERIS');

  const midsearch=provider(ms=>(ms-startMs-123456)/3600000);
  const original=midsearch.getUnwrappedAspectResidual.bind(midsearch);
  let reads=0;
  midsearch.getUnwrappedAspectResidual=async request=>{
    const response=await original(request);
    reads++;
    return reads>1
      ? {...response,metadata:{...response.metadata,contractVersion:'0.2.0-incompatible'}}
      : response;
  };
  await reject({provider:midsearch},'INCOMPATIBLE_EPHEMERIS');
  assert.ok(reads>1);
});

test('rejects untrimmed identifiers before reaching the residual provider', async()=>{
  const p=provider(ms=>(ms-startMs-123456)/3600000);
  let calls=0;
  const original=p.getUnwrappedAspectResidual.bind(p);
  p.getUnwrappedAspectResidual=async req=>{calls++;return original(req);};
  for (const patch of [
    {skyBodyName:' Mars'},
    {natalBodyName:'Sun '},
    {aspectId:' square '},
    {skyBodyName:'\tMars'},
    {ephemerisProvenance:{engineVersion:' synthetic-rust',kernelSetId:'synthetic',timeModel:'synthetic-TDB'}},
    {ephemerisProvenance:{engineVersion:'synthetic-rust',kernelSetId:'synthetic ',timeModel:'synthetic-TDB'}},
    {ephemerisProvenance:{engineVersion:'synthetic-rust',kernelSetId:'synthetic',timeModel:' synthetic-TDB'}}
  ]) {
    await reject({...patch,provider:p},'INVALID_ARGUMENT');
  }
  assert.equal(calls,0);
});
