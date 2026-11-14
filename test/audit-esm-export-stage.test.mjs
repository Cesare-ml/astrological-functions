import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { planEsmExportUnion } from '../scripts/plan-esm-export-union.mjs';
import { auditEsmExportStage } from '../scripts/audit-esm-export-stage.mjs';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/esm-export-candidates-20261114.json', import.meta.url)));
const realManifests = [fixture.baseline.manifest, ...fixture.candidates.map(c => c.manifest)];
const base = () => ({name:'astrological-functions', private:true, type:'module',
  exports:{'.':'./src/index.mjs'}});
const sample = () => ({...base(), exports:{'.':'./src/index.mjs',
  './safe':{types:'./src/safe.d.mts',import:'./src/safe.mjs'}}});
const sources = () => [base(), sample()];
async function workspace(t) {
  const root = await mkdtemp(join(tmpdir(), 'astrology-export-stage-'));
  t.after(() => rm(root, { recursive:true, force:true }));
  await mkdir(join(root,'src'));
  return root;
}
async function add(root, path) {
  const destination = join(root,path.slice(2));
  await writeFile(destination, 'export const fixture = true;\n');
}
const code = (promise, expected) => assert.rejects(promise, error => error?.code === expected);

test('exact live PR manifest snapshots preserve 12 distinct subpaths and the root', () => {
  assert.deepEqual(fixture.candidates.map(v => v.pr), [25,41,54,60,65,68,80]);
  assert.ok(fixture.candidates.every(v => /^[a-f\d]{40}$/.test(v.packageBlobSha)));
  const plan = planEsmExportUnion(realManifests);
  assert.equal(plan.candidateCount, 7);
  assert.equal(plan.exportCount, 13);
  assert.equal(plan.exports['.'], './src/index.mjs');
  assert.deepEqual(plan.nonExportDrift, []);
  assert.deepEqual(Object.keys(plan.exports).slice(1), Object.keys(plan.exports).slice(1).sort());
  assert.deepEqual(plan.exports['./declination-provider'], {
    types: './src/declination-provider-gate.d.mts', import:'./src/declination-provider-gate.mjs',
  });
  assert.deepEqual(plan.exports['./dodecatemoria'], {
    types:'./src/dodecatemoria-methods.d.mts', import:'./src/dodecatemoria-methods.mjs',
  });
  assert.deepEqual(plan.exports['./ephemeris-provider'], {
    types:'./src/ephemeris-provider.d.ts', import:'./src/ephemeris-provider.js',
  });
});

test('full synthetic staging tree can pass all 25 literal target checks', async t => {
  const root = await workspace(t);
  const plan = planEsmExportUnion(realManifests);
  await add(root, plan.exports['.']);
  for(const [key,entry] of Object.entries(plan.exports)) {
    if(key === '.') continue;
    await add(root, entry.types);
    await add(root, entry.import);
  }
  const report = await auditEsmExportStage(root,realManifests);
  assert.equal(report.status,'READY');
  assert.equal(report.exportCount,13);
  assert.equal(report.totalTargetCount,25);
  assert.equal(report.presentTargetCount,25);
  assert.equal(report.missingTargetCount,0);
  assert.deepEqual(report.issues,[]);
});

test('mock PR80-only stage blocks 18 missing targets from other drafts', async t => {
  const root = await workspace(t);
  const plan = planEsmExportUnion(realManifests);
  await add(root,plan.exports['.']);
  for (const key of ['./declination-contacts','./sourced-declination-contacts','./declination-provider']) {
    await add(root,plan.exports[key].types);
    await add(root,plan.exports[key].import);
  }
  const report = await auditEsmExportStage(root,realManifests);
  assert.equal(report.status,'BLOCKED');
  assert.equal(report.presentTargetCount,7);
  assert.equal(report.totalTargetCount,25);
  assert.equal(report.missingTargetCount,18);
  assert.ok(report.issues.every(issue => issue.reason==='MISSING_TARGET'));
  assert.ok(report.issues.some(issue => issue.subpath === './dodecatemoria'));
  assert.ok(report.issues.some(issue => issue.subpath === './transit-events'));
  assert.ok(!report.issues.some(issue => issue.subpath === './declination-provider'));
});

test('missing declarations fail closed even if a runtime module exists', async t => {
  const root = await workspace(t);
  await add(root,'./src/index.mjs');await add(root,'./src/safe.mjs');
  const report = await auditEsmExportStage(root,sources());
  assert.equal(report.status,'BLOCKED');
  assert.deepEqual(report.issues,[{
    subpath:'./safe',condition:'types',target:'./src/safe.d.mts',reason:'MISSING_TARGET',
  }]);
});

test('a case-mismatched filename is blocked even on case-insensitive platforms', async t => {
  const root=await workspace(t);
  await add(root,'./src/index.mjs');await add(root,'./src/safe.d.mts');
  await add(root,'./src/Safe.mjs');
  const result=await auditEsmExportStage(root,sources());
  assert.deepEqual(result.issues,[{
    subpath:'./safe',condition:'import',target:'./src/safe.mjs',reason:'CASE_MISMATCH',
  }]);
});

test('symlinked export targets are not trusted or followed', async t => {
  const root=await workspace(t);
  await add(root,'./src/index.mjs');await add(root,'./src/safe.d.mts');
  await symlink(join(root,'src','safe.d.mts'), join(root,'src','safe.mjs'));
  const result=await auditEsmExportStage(root,sources());
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.issues[0].reason,'SYMLINK_TARGET');
});

test('an export path ending at a directory is rejected as not a regular file', async t => {
  const root=await workspace(t);
  await add(root,'./src/index.mjs');await add(root,'./src/safe.d.mts');
  await mkdir(join(root,'src','safe.mjs'));
  const result=await auditEsmExportStage(root,sources());
  assert.equal(result.issues[0].reason,'NOT_REGULAR_FILE');
});

test('non-directory path intermediates are rejected, not interpreted as targets', async t => {
  const root=await workspace(t);
  await add(root,'./src/index.mjs');
  const candidate={...base(),exports:{'.':'./src/index.mjs','./bad':{
    types:'./src/index.mjs/type.d.mts',import:'./src/index.mjs/target.mjs',
  }}};
  const report=await auditEsmExportStage(root,[base(),candidate]);
  assert.equal(report.status,'BLOCKED');
  assert.deepEqual(report.issues.map(e=>e.reason),['NOT_DIRECTORY','NOT_DIRECTORY']);
});

test('a symlinked stage root itself is refused', async t => {
  const root=await workspace(t);
  const alias=join(root,'alias');
  await symlink(join(root,'src'),alias,'dir');
  await code(auditEsmExportStage(alias,sources()),'INVALID_STAGE_ROOT');
});

test('missing and non-directory stage roots fail with a typed error', async t => {
  const root=await workspace(t);
  await code(auditEsmExportStage('',sources()),'INVALID_STAGE_ROOT');
  await code(auditEsmExportStage(join(root,'missing'),sources()),'INVALID_STAGE_ROOT');
  await writeFile(join(root,'file'),'test');
  await code(auditEsmExportStage(join(root,'file'),sources()),'INVALID_STAGE_ROOT');
});

test('invalid candidate root and unsupported conditions are rejected before disk scan', async t => {
  const root=await workspace(t);
  await code(auditEsmExportStage(root,[base(),{...base(),exports:{'.':'./other.mjs'}}]),'CONFLICTING_ROOT');
  await code(auditEsmExportStage(root,[base(),{...base(),exports:{'.':'./src/index.mjs',
    './bad':{types:'./src/bad.d.mts',import:'./src/bad.mjs',require:'./src/bad.cjs'}}}]),
    'UNSUPPORTED_EXPORT_CONDITION');
});

test('malformed baseline export maps return structured planner errors', () => {
  assert.throws(() => planEsmExportUnion([{...base(),exports:{}},sample()]),
    e => e?.code==='INVALID_EXPORT_MAP');
  assert.throws(() => planEsmExportUnion([{},sample()]),
    e => e?.code==='INCOMPATIBLE_PACKAGE');
});

test('CLI exit 2 reports blocked stage without writing source manifests', async t => {
  const root=await workspace(t);
  const a=join(root,'base.json'),b=join(root,'candidate.json');
  await writeFile(a,JSON.stringify(base()));await writeFile(b,JSON.stringify(sample()));
  await add(root,'./src/index.mjs');
  const before=await readFile(b,'utf8');
  const script=fileURLToPath(new URL('../scripts/audit-esm-export-stage.mjs',import.meta.url));
  const run=spawnSync(process.execPath,[script,root,a,b],{encoding:'utf8'});
  assert.equal(run.status,2,run.stderr);
  assert.equal(run.stderr,'');
  const report=JSON.parse(run.stdout);
  assert.equal(report.missingTargetCount,2);
  assert.equal(await readFile(b,'utf8'),before);
  await add(root,'./src/safe.d.mts');await add(root,'./src/safe.mjs');
  const ready=spawnSync(process.execPath,[script,root,a,b],{encoding:'utf8'});
  assert.equal(ready.status,0,ready.stderr);
  assert.equal(JSON.parse(ready.stdout).status,'READY');
  assert.equal(await readFile(b,'utf8'),before);
});

test('CLI exits 1 with stable code on malformed JSON or missing arguments', async t => {
  const root=await workspace(t);
  const script=fileURLToPath(new URL('../scripts/audit-esm-export-stage.mjs',import.meta.url));
  const missing=spawnSync(process.execPath,[script,root],{encoding:'utf8'});
  assert.equal(missing.status,1);
  assert.match(missing.stderr,/MISSING_STAGE_INPUT/);
  assert.equal(missing.stdout,'');
  const a=join(root,'a.json'),b=join(root,'bad.json');
  await writeFile(a,JSON.stringify(base()));await writeFile(b,'{broken');
  const invalid=spawnSync(process.execPath,[script,root,a,b],{encoding:'utf8'});
  assert.equal(invalid.status,1);
  assert.match(invalid.stderr,/UNREADABLE_MANIFEST/);
  assert.equal(invalid.stdout,'');
});
