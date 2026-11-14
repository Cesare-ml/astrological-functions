/**
 * Read-only on-disk target audit for an ESM union proposed by the companion
 * plan-esm-export-union tool. It never installs or imports a candidate module.
 * A READY report means all literal target files exist, NOT that their source,
 * scientific outputs, typings or transitive dependencies are validated.
 */
import { lstat, readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planEsmExportUnion } from './plan-esm-export-union.mjs';

export class ExportStageError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ExportStageError';
    this.code = code;
  }
}

/** Require exact-case, ordinary paths without following symlinks on any segment. */
async function auditTarget(root, target) {
  const parts = target.slice(2).split('/'); // validated by planEsmExportUnion
  let folder = root;
  for (let i = 0; i < parts.length; i++) {
    let entries;
    try {
      entries = await readdir(folder, { withFileTypes: true });
    } catch (error) {
      throw new ExportStageError('UNREADABLE_STAGE', `Cannot inspect staged target directory: ${error.code ?? 'ERROR'}`);
    }
    const segment = parts[i];
    const entry = entries.find(e => e.name === segment);
    if (!entry) {
      return entries.some(e => e.name.toLowerCase() === segment.toLowerCase())
        ? 'CASE_MISMATCH' : 'MISSING_TARGET';
    }
    if (entry.isSymbolicLink()) return 'SYMLINK_TARGET';
    const last = i === parts.length - 1;
    if (last && !entry.isFile()) return 'NOT_REGULAR_FILE';
    if (!last && !entry.isDirectory()) return 'NOT_DIRECTORY';
    folder = join(folder, segment);
  }
  return null;
}

/**
 * Determine which literal ESM union targets are actually present on a staged
 * checkout. The first manifest remains the trusted baseline for the planner.
 * No file in stagedRoot or in the candidate manifests is modified.
 */
export async function auditEsmExportStage(stagedRoot, manifests) {
  if (typeof stagedRoot !== 'string' || !stagedRoot.trim())
    throw new ExportStageError('INVALID_STAGE_ROOT', 'A staged package directory is required');
  // Validate every candidate manifest before examining on-disk targets.
  const plan = planEsmExportUnion(manifests);
  const root = resolve(stagedRoot);
  let info;
  try { info = await lstat(root); }
  catch (error) {
    throw new ExportStageError('INVALID_STAGE_ROOT', `Staged directory unavailable: ${error.code ?? 'ERROR'}`);
  }
  if (!info.isDirectory() || info.isSymbolicLink())
    throw new ExportStageError('INVALID_STAGE_ROOT', 'Staged root must be a real directory');
  const issues = [];
  let presentTargetCount = 0;
  for (const [subpath, entry] of Object.entries(plan.exports)) {
    const paths = subpath === '.' ? [['import', entry]]
      : [['types', entry.types], ['import', entry.import]];
    for (const [condition, target] of paths) {
      const reason = await auditTarget(root, target);
      if (reason) issues.push({ subpath, condition, target, reason });
      else presentTargetCount++;
    }
  }
  const totalTargetCount = presentTargetCount + issues.length;
  return {
    status: issues.length ? 'BLOCKED' : 'READY',
    packageName: plan.packageName,
    candidateCount: plan.candidateCount,
    exportCount: plan.exportCount,
    totalTargetCount, presentTargetCount,
    missingTargetCount: issues.length,
    issues,
    nonExportDrift: plan.nonExportDrift,
  };
}

async function main(args) {
  if (args.length < 3)
    throw new ExportStageError('MISSING_STAGE_INPUT',
      'Usage: node scripts/audit-esm-export-stage.mjs STAGED_ROOT BASELINE_MANIFEST CANDIDATE_MANIFEST [...]');
  const [stageRoot, ...manifestsPaths] = args;
  const manifests = [];
  for (const path of manifestsPaths) {
    try { manifests.push(JSON.parse(await readFile(path, 'utf8'))); }
    catch (error) {
      throw new ExportStageError('UNREADABLE_MANIFEST',
        `Cannot parse manifest: ${error.code ?? error.name ?? 'ERROR'}`);
    }
  }
  const report = await auditEsmExportStage(stageRoot, manifests);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status !== 'READY') process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    process.stderr.write(`${error.code ?? 'ERROR'}: ${error.message}\n`);
    process.exitCode = 1;
  });
}
