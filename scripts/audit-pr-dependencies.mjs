/**
 * Offline audit of open GitHub pull-request base/head dependencies.
 * This tool NEVER merges PRs or accesses a network. It accepts saved
 * GitHub REST /pulls JSON (including gh --slurp page arrays).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';


function fail(message) { throw new TypeError(message); }
function branchInfo(value, label, number) {
  if (!value || typeof value !== 'object' || typeof value.ref !== 'string' || !value.ref ||
      typeof value.repo?.full_name !== 'string' || !value.repo.full_name)
    fail(`PR #${number}: ${label} must contain ref and repo.full_name`);
  return { ref: value.ref, repo: value.repo.full_name };
}
function key({ ref, repo }) { return JSON.stringify([repo, ref]); }
function sortPrs(a, b) { return a.number - b.number; }

/**
 * @param {object[] | object[][]} raw GitHub open PR data.
 * @param {{repository?:string, defaultBranch?:string}} options
 * @returns {object} Deterministic audit; waves are order hints, NOT merge approvals.
 */
export function auditPullRequests(raw, { repository, defaultBranch = 'main' } = {}) {
  if (!Array.isArray(raw)) fail('Input must be a JSON array of GitHub PRs (or paginated arrays)');
  if (typeof defaultBranch !== 'string' || !defaultBranch.trim()) fail('defaultBranch must be nonempty');
  if (repository !== undefined && (typeof repository !== 'string' || !repository.trim()))
    fail('repository must be nonempty if supplied');
  const items = raw.flatMap(page => Array.isArray(page) ? page : [page]);
  const numbers = new Set(), heads = new Map();
  const prs = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || !Number.isSafeInteger(item.number) || item.number < 1)
      fail('Each PR must have a positive integer number');
    // API callers may save all-state results. The audit concerns open PRs only.
    if (item.state !== 'open') continue;
    if (numbers.has(item.number)) fail(`Duplicate open PR number #${item.number}`);
    numbers.add(item.number);
    const head = branchInfo(item.head, 'head', item.number);
    const base = branchInfo(item.base, 'base', item.number);
    if (repository && base.repo !== repository)
      fail(`PR #${item.number}: base repo ${base.repo} differs from ${repository}`);
    const headKey = key(head);
    if (heads.has(headKey)) fail(`Two open PRs share head ${head.repo}:${head.ref}`);
    const pr = { number:item.number, title:typeof item.title==='string'?item.title:'',
      draft:item.draft===true, head, base };
    heads.set(headKey, pr);
    prs.push(pr);
  }
  prs.sort(sortPrs);
  const rootRepo = repository ?? (prs[0]?.base.repo ?? null);
  // Never present unrelated repositories as one integration plan.
  if (prs.some(p => p.base.repo !== rootRepo)) fail('Input mixes PRs from multiple base repositories');
  const states = new Map(), cycles = new Map();
  function assess(pr, stack = []) {
    if (states.has(pr.number)) return states.get(pr.number);
    const seen = stack.findIndex(p => p.number === pr.number);
    if (seen !== -1) {
      const path = stack.slice(seen).map(p=>p.number).concat(pr.number);
      const id = [...new Set(path.slice(0,-1))].sort((a,b)=>a-b).join(',');
      cycles.set(id, path);
      return { status:'BLOCKED', reason:'CYCLE', via: path };
    }
    let result;
    if (pr.base.repo===rootRepo && pr.base.ref === defaultBranch) {
      result={status:'ORDERED', depth:0, parent:null};
    } else {
      const parent=heads.get(key(pr.base));
      if (!parent) result={status:'BLOCKED',reason:'UNTRACKED_BASE', base:pr.base};
      else {
        const upstream=assess(parent,[...stack,pr]);
        result=upstream.status==='ORDERED'
          ? {status:'ORDERED',depth:upstream.depth+1,parent:parent.number}
          : {status:'BLOCKED',reason:upstream.reason==='CYCLE'?'CYCLE':'UPSTREAM_UNTRACKED', parent:parent.number};
      }
    }
    states.set(pr.number,result);
    return result;
  }
  const groups=new Map(), blocked=[];
  for(const pr of prs){
    const state=assess(pr);
    const detail={number:pr.number,title:pr.title,draft:pr.draft,
      head:pr.head.ref,base:pr.base.ref,...state};
    if(state.status==='ORDERED'){
      if(!groups.has(state.depth)) groups.set(state.depth,[]);
      groups.get(state.depth).push(detail);
    }else blocked.push(detail);
  }
  const waves=[...groups.entries()].sort((a,b)=>a[0]-b[0]).map(([depth,items])=>({depth,prs:items}));
  return {repository:rootRepo,defaultBranch,totalOpen:prs.length,
    ordered:prs.length-blocked.length, draftCount:prs.filter(p=>p.draft).length,
    waves,blocked,cycles:[...cycles.values()],
    note:'Order hints only. Draft status, checks, scientific validation and conflicts require separate review; no merge is authorized.'};
}

function printReport(audit) {
  console.log(`${audit.repository ?? 'Unknown repo'} · ${audit.totalOpen} open PRs · ${audit.ordered} mapped · ${audit.blocked.length} blocked · ${audit.draftCount} drafts`);
  for(const wave of audit.waves)
    console.log(`Wave ${wave.depth} (${wave.depth===0?'targets default branch':'stacked'}): ${wave.prs.map(p=>`#${p.number}${p.draft?' [draft]':''}`).join(', ')}`);
  for(const pr of audit.blocked)
    console.log(`Unresolved #${pr.number}: ${pr.reason} (base ${pr.base})`);
  for(const path of audit.cycles) console.log(`Cycle: ${path.map(n=>'#'+n).join(' -> ')}`);
  console.log(audit.note);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2);
    if (args.some(arg=>!['--json','--help'].includes(arg)))
      fail('Usage: node scripts/audit-pr-dependencies.mjs [--json] < pulls.json');
    if (args.includes('--help')) {
      console.log('Usage: node scripts/audit-pr-dependencies.mjs [--json] < pulls.json');
    } else {
      const audit=auditPullRequests(JSON.parse(readFileSync(0,'utf8')));
      if(args.includes('--json')) console.log(JSON.stringify(audit,null,2));
      else printReport(audit);
      if(audit.blocked.length) process.exitCode=2;
    }
  } catch (error) {
    console.error(`Audit failed: ${error.message}`);
    process.exitCode=1;
  }
}
