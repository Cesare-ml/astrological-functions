# Provenance and third-party-material review (pending)

**This is an inventory framework, not a completed source audit.** Current `main` has `src/*.mjs`, `src/*.d.mts`, tests, docs and maintenance scripts. No rights classification has been independently completed for every file or historical revision.

| Area | Initial observation | Publication gate |
| --- | --- | --- |
| `src/*.mjs` | Astrological mathematics and experimental house methods; no bundled astronomy kernel in current root tree | Review authorship, clean-room derivations, upstream references and all reused source |
| `src/*.d.mts` | Type declarations for selected exported subpaths | Review authorship, declaration/runtime congruence and license headers after license selection |
| `test/**/*.mjs`, `test/types/*` | Synthetic fixtures plus recorded third-party comparison figures (including recorded Swiss house results) | Audit the origin, rights, privacy, reproducibility and documentation of each fixture |
| `docs/*`, `AGENTS.md` | Engineering documents referring to private VirgoStars components and previous PRs | Redact sensitive internal references; check historical docs/commits, not only current versions |
| `scripts/*` | Local test/PR audit scripts | Inspect for credentials, shell injection, network calls and internal paths |
| `package.json` | ESM exports, no dependencies listed; npm `private: true` | Validate package import behavior, API surface and publication policy |

## Required reviewer record

For **every source/file group**, record: path or glob; SHA/ref; authors/rights holder; source of any copied snippet, algorithm, text, tables or recorded outputs; license and attribution; redistribution decision; reviewer/date; verification evidence.

Not all numerical facts are copyrighted, but recorded fixtures can still have provenance, privacy or contractual constraints. Do not automatically treat copied benchmark results, code, downloaded astronomical catalogs or licensed library tables as freely redistributable.

## Git history is a separate publication boundary

A GitHub private-to-public switch generally exposes **existing commit history** and repository metadata. Review all reachable history and all refs, old file versions, commit author/email fields, issues and PRs; scan with a local secret scanner such as Gitleaks plus human review. Rotate leaked credentials and remove sensitive data from the entire public history if necessary. If history cannot be safely cleared, consider publishing a **new clean-history repository** from a reviewed export, rather than exposing the existing repository.

No audit of all historical commits, external GitHub metadata or third-party terms has been completed by this document.
