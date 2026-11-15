# Security policy

## Status and supported versions

This is a pre-release, experimental library; **no versions are designated production-supported or security-maintained**. Public-source readiness does not imply a support SLA or a guarantee of correctness.

## Vulnerability reporting

Please **do not disclose** tokens, private data, exploits or sensitive repository details in a public issue or pull request.

If GitHub's private vulnerability reporting feature is enabled for this repository, use its **Security → Report a vulnerability** flow. Otherwise, contact the repository owner through an appropriate private channel first and request a secure reporting path before sharing technical exploit details. The availability of a private reporting channel has not yet been confirmed.

Helpful reports include the affected commit or version, reproduction using synthetic data, impact, and suggested mitigation. Do not include real customer charts or birth records.

## Maintainer precautions before public visibility

Review both current files **and all reachable Git history, branches, tags, issue/PR metadata and release artifacts**. Scan for secrets, credentials, private URLs, personal information, proprietary fixtures, license-restricted code and links to private infrastructure. Rotate any exposed credential; simply deleting it in a new commit is insufficient because old commits remain visible. See [publication readiness](docs/PUBLICATION_READINESS.md).
