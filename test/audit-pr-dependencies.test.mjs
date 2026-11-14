import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditPullRequests } from '../scripts/audit-pr-dependencies.mjs';

const repo='Cesare-ml/astrological-functions';
const ref=(name, repository=repo)=>({ref:name,repo:{full_name:repository}});
const pr=(number,head,base='main',options={})=>({number,title:`PR ${number}`,state:'open',draft:!!options.draft,
  head:ref(head,options.headRepo),base:ref(base,options.baseRepo)});

test('direct-main roots, nested chains and siblings have deterministic waves',()=>{
  const out=auditPullRequests([[pr(4,'child-of-2','feature-2'),pr(2,'feature-2','feature-1',{draft:true})],
    [pr(3,'independent'),pr(1,'feature-1'),pr(5,'sibling','feature-1')]],{repository:repo});
  assert.deepEqual(out.waves.map(w=>w.prs.map(p=>p.number)),[[1,3],[2,5],[4]]);
  assert.equal(out.draftCount,1);
  assert.equal(out.waves[1].prs[0].parent,1);
  assert.equal(out.blocked.length,0);
});

test('untracked base and its descendants are blocked instead of declared merge-ready',()=>{
  const out=auditPullRequests([pr(7,'head','already-merged-branch'),pr(8,'child','head')]);
  assert.deepEqual(out.blocked.map(p=>[p.number,p.reason]),[[7,'UNTRACKED_BASE'],[8,'UPSTREAM_UNTRACKED']]);
  assert.equal(out.ordered,0);
});

test('cycle and dependent are reported as blocked, never scheduled',()=>{
  const out=auditPullRequests([pr(1,'one','three'),pr(2,'two','one'),pr(3,'three','two'),pr(4,'four','one')]);
  assert.equal(out.ordered,0);
  assert.deepEqual(out.blocked.map(p=>p.number),[1,2,3,4]);
  assert.equal(out.cycles.length,1);
  assert.equal(out.cycles[0][0],out.cycles[0].at(-1));
});

test('do not confuse identically named head branches from another repository',()=>{
  const out=auditPullRequests([pr(1,'feature','main',{headRepo:'another/repo'}),pr(2,'child','feature')]);
  assert.deepEqual(out.waves.map(w=>w.prs.map(p=>p.number)),[[1]]);
  assert.equal(out.blocked[0].reason,'UNTRACKED_BASE');
});

test('fail closed on duplicate heads, numbers and mixed bases',()=>{
  assert.throws(()=>auditPullRequests([pr(1,'same'),pr(2,'same')]),/share head/);
  assert.throws(()=>auditPullRequests([pr(1,'one'),pr(1,'two')]),/Duplicate open PR/);
  assert.throws(()=>auditPullRequests([pr(1,'one'),pr(2,'two','main',{baseRepo:'else/repo'})]),/multiple base/);
});

test('closed PRs ignored and malformed active refs rejected',()=>{
  const closed={...pr(9,'old'),state:'closed'};
  assert.equal(auditPullRequests([closed,pr(1,'new')]).totalOpen,1);
  assert.throws(()=>auditPullRequests([{...pr(1,'bad'),head:{ref:'bad',repo:null}}]),/head must contain/);
});

test('CLI accepts a paginated JSON snapshot and prints honest exit status',()=>{
  const cli=fileURLToPath(new URL('../scripts/audit-pr-dependencies.mjs',import.meta.url));
  const ok=spawnSync(process.execPath,[cli,'--json'],{encoding:'utf8',input:JSON.stringify([[pr(1,'root')],[pr(2,'sub','root')]])});
  assert.equal(ok.status,0,ok.stderr);
  assert.deepEqual(JSON.parse(ok.stdout).waves.map(w=>w.prs.length),[1,1]);
  const blocked=spawnSync(process.execPath,[cli],{encoding:'utf8',input:JSON.stringify([pr(2,'missing-base','unknown')])});
  assert.equal(blocked.status,2);
  assert.match(blocked.stdout,/UNTRACKED_BASE/);
  const broken=spawnSync(process.execPath,[cli],{encoding:'utf8',input:'{no json'});
  assert.equal(broken.status,1);
  assert.match(broken.stderr,/Audit failed:/);
});
