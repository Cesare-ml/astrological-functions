import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { prepareTransitAspectEventCandidates } from 'astrological-functions/transit-events';

const metadata = Object.freeze({
  contractVersion:'0.1.0-experimental',
  coverage:'CALLER_ASSERTED_CONTINUOUS_UNWRAPPED',
  enclosureCoverage:'CALLER_ASSERTED_INTERVAL_BOUNDS_ALL_TIMES',
  stationCoverage:'INCLUDED', numericErrorCoverage:'INCLUDED',
  center:'EARTH',frame:'ECLIPTIC_OF_DATE',corrections:'APPARENT',
  engineVersion:'mock-v1',kernelSetId:'mock-kernel',timeModel:'mock-time'
});
const t0=Date.parse('2026-11-12T00:00:00Z');
const residual=ms=>(ms-t0)/3600000-.37;
const provider={
  capabilities:{...metadata},
  async getUnwrappedAspectResidual(request) {
    return {datetimeUtc:request.datetimeUtc,residualDeg:residual(Date.parse(request.datetimeUtc)),
      metadata:{...metadata}};
  },
  async getUnwrappedResidualEnclosure(request) {
    return {startUtc:request.startUtc,endUtc:request.endUtc,
      lowerDeg:residual(Date.parse(request.startUtc)),
      upperDeg:residual(Date.parse(request.endUtc)),metadata:{...metadata}};
  }
};

test('transit-events package self-reference resolves and produces directional facts',async()=>{
  assert.equal(typeof prepareTransitAspectEventCandidates,'function');
  const result=await prepareTransitAspectEventCandidates({
    startUtc:'2026-11-12T00:00:00Z',endUtc:'2026-11-12T01:00:00Z',
    skyBodyName:'Mars',natalBodyName:'Sun',aspectId:'square',
    exactAngleDeg:90,orientation:'POSITIVE',
    targetIntervalMs:60000,maxDepth:10,maxProviderCalls:400,
    ephemerisProvenance:{engineVersion:'mock-v1',kernelSetId:'mock-kernel',timeModel:'mock-time'},
    provider,
    refinement:{timeToleranceMs:150,residualToleranceDeg:0.0001,
      maxIterations:40,maxCandidateRefinements:64,maxRefinementCalls:300}
  });
  assert.equal(result.direction,'SKY_TO_NATAL');
  assert.equal(result.refinedCandidates.length,1);
  assert.equal(result.refinedCandidates[0].refinement.skyBodyName,'Mars');
  assert.equal(result.refinedCandidates[0].refinement.natalBodyName,'Sun');
  assert.equal(result.scientificallyValidated,false);
  assert.equal(result.verification,'PROVIDER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED');
  assert.ok(Math.abs(Date.parse(result.refinedCandidates[0].refinement.datetimeUtc)-t0-.37*3600000)<=360);
});

test('no require() dual-format entry point is advertised for transit-events',()=>{
  const pkg=createRequire(import.meta.url)('../package.json');
  assert.deepEqual(Object.keys(pkg.exports['./transit-events']).sort(),['import','types']);
  assert.equal(pkg.private,true);
});
