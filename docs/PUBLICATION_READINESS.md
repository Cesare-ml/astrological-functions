# Public open-source readiness gate

**Snapshot: 2026-11-15. Preparation only — not authorization to make this repository public or publish npm artifacts.**

## Verified repository facts at preparation time

- GitHub repository: `Cesare-ml/astrological-functions`, **private**, default branch `main`.
- `package.json`: `0.1.0-dev`, Node `>=20`, `"private": true`, no listed npm dependencies; ESM exports include root plus selected house/zodiac subpaths.
- Root contains `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `src/`, `test/`, `docs/`, `scripts/` and `.gitignore`; no `LICENSE` or `NOTICE` at the inspected `main` root.
- Local JavaScript tests are present. Optional external DE441/Rust integration tests require explicitly supplied adapters/kernel. **No test execution or full Git-history scan is claimed in this PR.**
- Development uses manual checks. **No GitHub Actions is requested or introduced.**

## Blocking gates before changing visibility

- [ ] **Owner legal approval**: decide redistribution-only vs visible UI attribution; approve LICENSE, NOTICE/Exhibit B, copyright and SPDX policy after compatibility review. See [licensing options](LICENSING_OPTIONS.md) and issue #2.
- [ ] **Rights/provenance**: sign off every public source, fixture, copied benchmark, third-party input and contribution against [provenance review](PROVENANCE_REVIEW.md).
- [ ] **Security/history**: scan HEAD and complete reachable Git history/branches/tags and review issue/PR discussion, author emails, URLs, assets and releases; fix exposure properly and rotate leaked credentials. Deletion in the latest commit is insufficient.
- [ ] **Privacy**: confirm no personal birth charts, identifiable customers, tokens, private repositories' source, infrastructure configuration or contractual materials are exposed.
- [ ] **Scientific honesty**: validate all advertised calculations and versions, document method choices and unsupported cases. No silent Swiss fallback. Real DE441 composition is not equivalent to independent planetary/house scientific parity.
- [ ] **Build/test evidence**: from the intended public-release SHA, manually execute `npm test`; exercise `node --input-type=module` package self-imports and TypeScript consumer fixtures in NodeNext/Bundler configurations, with recorded tool versions/results. Run opt-in Rust/DE441 integration only with pinned external inputs and document skips.
- [ ] **Public docs review**: verify README, SECURITY, CONTRIBUTING, package exports, internal/private links, example commands and release notes reflect actual implementation rather than planned APIs.
- [ ] **Maintainer governance**: choose vulnerability-reporting contact, issue/PR triage policy, contributor license/inbound rights process, maintenance expectations and release owner.
- [ ] **Publication decision**: separately approve changing the GitHub repository visibility. If old history cannot safely be exposed, use a reviewed clean-history export instead.
- [ ] **npm decision (independent)**: only if requested, assess versioning, export declarations, README/legal files and `npm pack --dry-run` contents before removing `private: true` and publishing.

## Suggested manual commands for a reviewer with an authenticated local clone

```sh
node --version
npm test
node --input-type=module -e "import {normalize360} from 'astrological-functions'; console.log(normalize360(-20))"
git branch -a
git tag -l
git log --all --oneline --decorate
git log --all --format='%h %an <%ae>'
git rev-list --objects --all
git grep -n -I -E 'BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY|AKIA[0-9A-Z]{16}|github_pat_' $(git rev-list --all)
```

The `git grep` pattern is **not a comprehensive secret scan**; use a dedicated history-aware scanner and manual assessment. Review the outputs privately because they can contain sensitive metadata. Avoid pasting potential credentials into public issues.

## Out of scope of this preparation PR

No root LICENSE or SPDX assignment without approval; no removal of npm `private: true`; no switch to public; no npm release; no production changes; no GitHub Actions; no claim that security or scientific release gates have passed.
