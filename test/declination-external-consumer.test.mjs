import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// A separate consumer directory exercises package resolution from node_modules,
// not the self-referencing imports used by same-repository smoke tests.
const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const scratch = mkdtempSync(join(tmpdir(), 'virgostars-declination-consumer-'));
const installed = join(scratch, 'node_modules', 'astrological-functions');
mkdirSync(join(installed, 'src'), { recursive: true });
copyFileSync(join(repositoryRoot, 'package.json'), join(installed, 'package.json'));
for (const name of [
  'index.mjs',
  'declination-contacts.mjs', 'declination-contacts.d.mts',
  'sourced-declination-contacts.mjs', 'sourced-declination-contacts.d.mts',
  'declination-provider-gate.mjs', 'declination-provider-gate.d.mts',
]) {
  assert.ok(existsSync(join(repositoryRoot, 'src', name)), `Expected source module: ${name}`);
  copyFileSync(join(repositoryRoot, 'src', name), join(installed, 'src', name));
}
after(() => rmSync(scratch, { recursive: true, force: true }));
let sequence = 0;
function runExternal(source, extension = 'mjs', command = process.execPath, flags = []) {
  const file = join(scratch, `consumer-${++sequence}.${extension}`);
  writeFileSync(file, source);
  const result = spawnSync(command, [...flags, file], {
    cwd: scratch,
    encoding: 'utf8',
    timeout: 15_000,
    windowsHide: true,
  });
  return { ...result, file };
}
function expectSuccess(result) {
  assert.equal(result.error, undefined, `Failed to spawn: ${result.error?.message}`);
  assert.equal(result.status, 0, `Exit ${result.status}: ${result.stdout}\n${result.stderr}`);
}

test('external Node ESM app resolves root and all three typed declination subpaths', () => {
  expectSuccess(runExternal(`
import assert from 'node:assert/strict';
import { AstrologyError } from 'astrological-functions';
import { calculateDeclinationContacts } from 'astrological-functions/declination-contacts';
import { calculateSourcedDeclinationContacts } from 'astrological-functions/sourced-declination-contacts';
import { calculateDeclinationContactsWithProvider } from 'astrological-functions/declination-provider';
assert.equal(typeof AstrologyError, 'function');
assert.equal(typeof calculateDeclinationContacts, 'function');
assert.equal(typeof calculateSourcedDeclinationContacts, 'function');
assert.equal(typeof calculateDeclinationContactsWithProvider, 'function');
const facts = calculateDeclinationContacts({direction:'A_TO_B',
  sourcePoints:[{name:'Sun',declinationDeg:18}],
  targetPoints:[{name:'Moon',declinationDeg:-18}],
  contactDefinitions:[{id:'CONTRA_PARALLEL',maxOrbDeg:0}]});
assert.equal(facts.contacts.length,1);
assert.ok(Object.isFrozen(facts.contacts));
`));
});

test('external consumer composes a pinned synthetic provider with distinct natal/sky snapshots', () => {
  expectSuccess(runExternal(`
import assert from 'node:assert/strict';
import { calculateDeclinationContactsWithProvider } from 'astrological-functions/declination-provider';
const calls=[];
const result=await calculateDeclinationContactsWithProvider({
  direction:'SKY_TO_NATAL',
  source:{snapshotId:'sky',datetimeUtc:'2026-11-14T12:00:00Z',bodyIds:['Sun']},
  target:{snapshotId:'natal',datetimeUtc:'2000-01-01T12:00:00Z',bodyIds:['Moon']},
  coordinates:{origin:'EARTH_GEOCENTER',kind:'EQUATORIAL_DECLINATION',frame:'ICRS',corrections:'GEOMETRIC'},
  expectedProvenance:{providerId:'VIRGOSTARS_EPHEMERIS',engineVersion:'synthetic',kernelSetId:'synthetic',timeModelId:'synthetic'},
  contactDefinitions:[{id:'CONTRA_PARALLEL',maxOrbDeg:0.5}],
  provider:{async getGeocentricEquatorialDeclination(r){
    calls.push(r.bodyId);
    return {snapshotId:r.snapshotId,datetimeUtc:r.datetimeUtc,bodyId:r.bodyId,
      declinationDeg:r.bodyId==='Sun'?18:-18.2,
      coordinates:r.coordinates,provenance:r.expectedProvenance};
  }},
});
assert.deepEqual(calls,['Sun','Moon']);
assert.equal(result.facts.contacts.length,1);
assert.equal(result.facts.contacts[0].direction,'SKY_TO_NATAL');
assert.ok(Object.isFrozen(result.sourceContext));
`));
});

test('external consumer can cancel stale work before provider invocation', () => {
  expectSuccess(runExternal(`
import assert from 'node:assert/strict';
import { calculateDeclinationContactsWithProvider } from 'astrological-functions/declination-provider';
const controller=new AbortController();controller.abort('stale');
let calls=0;
await assert.rejects(calculateDeclinationContactsWithProvider({
  direction:'A_TO_B',
  source:{snapshotId:'A',datetimeUtc:'2026-11-14T12:00:00Z',bodyIds:['Sun']},
  target:{snapshotId:'B',datetimeUtc:'2026-11-14T12:00:00Z',bodyIds:['Moon']},
  coordinates:{origin:'EARTH_GEOCENTER',kind:'EQUATORIAL_DECLINATION',frame:'ICRS',corrections:'GEOMETRIC'},
  expectedProvenance:{providerId:'VIRGOSTARS_EPHEMERIS',engineVersion:'synthetic',kernelSetId:'synthetic',timeModelId:'synthetic'},
  contactDefinitions:[{id:'PARALLEL',maxOrbDeg:0}],signal:controller.signal,
  provider:{async getGeocentricEquatorialDeclination(){calls++;throw Error('unreachable')}},
}),err=>err?.code==='DECLINATION_PROVIDER_ABORTED');
assert.equal(calls,0);
`));
});

test('external CJS require and unlisted source paths remain blocked', () => {
  expectSuccess(runExternal(`
const assert=require('node:assert/strict');
for(const path of [
  'astrological-functions/declination-contacts',
  'astrological-functions/sourced-declination-contacts',
  'astrological-functions/declination-provider',
  'astrological-functions/src/index.mjs',
])assert.throws(()=>require(path),e=>e?.code==='ERR_PACKAGE_PATH_NOT_EXPORTED');
`, 'cjs'));
  expectSuccess(runExternal(`
import assert from 'node:assert/strict';
for(const name of [
  'astrological-functions/src/declination-provider-gate.mjs',
  'astrological-functions/typo-declination-provider',
])await assert.rejects(import(name),e=>e?.code==='ERR_PACKAGE_PATH_NOT_EXPORTED');
`));
});

test('external strict NodeNext consumer resolves declaration files and enforces input types', { skip: process.env.ASTRO_SKIP_EXTERNAL_TSC === '1' }, t => {
  const probe = spawnSync('tsc', ['--version'], { encoding: 'utf8', timeout: 5000, windowsHide: true });
  if (probe.error?.code === 'ENOENT') return t.skip('TypeScript compiler is not installed');
  assert.equal(probe.status, 0, `Cannot run compiler: ${probe.stderr || probe.error?.message}`);
  const result = runExternal(`
import { calculateDeclinationContacts, type DeclinationContactOptions } from 'astrological-functions/declination-contacts';
import { type DeclinationSnapshot } from 'astrological-functions/sourced-declination-contacts';
import { calculateDeclinationContactsWithProvider, type DeclinationWithProviderOptions } from 'astrological-functions/declination-provider';
const options = {direction:'A_TO_B',sourcePoints:[{name:'Sun',declinationDeg:18}],
  targetPoints:[{name:'Moon',declinationDeg:-18}],
  contactDefinitions:[{id:'CONTRA_PARALLEL',maxOrbDeg:0.5}]} as const satisfies DeclinationContactOptions;
const result=calculateDeclinationContacts(options);
const orb: number|undefined=result.contacts[0]?.absoluteOrbDeg;void orb;
const p={providerId:'VIRGOSTARS_EPHEMERIS',engineVersion:'synthetic',kernelSetId:'synthetic',timeModelId:'synthetic'} as const;
const coords={origin:'EARTH_GEOCENTER',kind:'EQUATORIAL_DECLINATION',frame:'ICRS',corrections:'GEOMETRIC'} as const;
const snapshot:DeclinationSnapshot={snapshotId:'A',datetimeUtc:'2000-01-01T12:00:00Z',
 coordinates:{...coords,frameEpochUtc:null},provenance:p,points:options.sourcePoints};void snapshot;
const request = {direction:'A_TO_B',source:{snapshotId:'A',datetimeUtc:'2000-01-01T12:00:00Z',bodyIds:['Sun']},
 target:{snapshotId:'B',datetimeUtc:'2000-01-01T12:00:00Z',bodyIds:['Moon']},
 coordinates:coords,expectedProvenance:p,contactDefinitions:options.contactDefinitions,
 signal:new AbortController().signal,
 provider:{async getGeocentricEquatorialDeclination(r){return {
   snapshotId:r.snapshotId,bodyId:r.bodyId,datetimeUtc:r.datetimeUtc,
   declinationDeg:18,coordinates:r.coordinates,provenance:r.expectedProvenance};}}} as const satisfies DeclinationWithProviderOptions;
const promise=calculateDeclinationContactsWithProvider(request);void promise;
// @ts-expect-error a geometric longitude is not an equatorial declination frame
calculateDeclinationContactsWithProvider({...request,coordinates:{...coords,kind:'ECLIPTIC_LONGITUDE'}});
// @ts-expect-error an arbitrary object is not a supported cancellation signal
calculateDeclinationContactsWithProvider({...request,signal:{aborted:true}});
// @ts-expect-error private source paths must not resolve through the ESM package boundary
import { calculateDeclinationContacts as privateAPI } from 'astrological-functions/src/declination-contacts.mjs';void privateAPI;
`, 'mts', 'tsc', [
    '--noEmit', '--strict', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022',
  ]);
  expectSuccess(result);
});
