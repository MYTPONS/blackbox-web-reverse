# Blackbox Web Reverse

[简体中文](README.zh-CN.md) · [Agent Skill](SKILL.md) · [Security & scope](SECURITY.md)

A generalized, evidence-driven workflow for reverse engineering web applications **you own or are authorized to assess**. It is packaged as a portable Agent Skill, with small Node.js helpers for asset inventory, source-map restoration, HAR redaction, and static bundle analysis.

The goal is not to copy a product. The goal is to turn an opaque running system into a maintainable specification:

- frontend routes, lazy chunks, and state boundaries;
- API contracts, payload shapes, error envelopes, and real-time channels;
- authentication and authorization models;
- data entities, identifiers, and business rules;
- a reconstruction blueprint with reproducible evidence.

> **Authorized use only.** Do not use this project to bypass authentication, paywalls, quotas, CAPTCHAs, or access controls; do not access data outside the agreed scope. See [SECURITY.md](SECURITY.md).

## Why this exists

Most black-box projects fail for the same reasons: teams start with brute force, confuse a `200` with success, miss lazy-loaded chunks, mistake error copy for data, or document conclusions without reproducible evidence.

This skill makes the cheap paths first:

1. official SDK, package, OpenAPI document, or source map;
2. runtime observation of an authorized session;
3. static analysis of shipped JavaScript;
4. minimal, rate-limited request replay;
5. manual reconstruction only where the cheaper evidence stops.

## Install as an Agent Skill

The repository root is the skill folder, so installation is a checkout or copy:

```bash
git clone https://github.com/MYTPONS/blackbox-web-reverse.git
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R blackbox-web-reverse "${CODEX_HOME:-$HOME/.codex}/skills/"
```

For DSH:

```bash
cp -R blackbox-web-reverse ~/.dsh/skills/
```

Start a new agent session after installation so the skill description is discovered.

## Quick start

```bash
# 1. Create a target card and record authorization.
cp templates/target-card.md ./TARGET_CARD.md

# 2. Inventory public HTML/JS/CSS assets.
node scripts/asset_crawl.mjs https://app.example.test ./out \
  --max-pages 20 --max-depth 2 --delay 1000

# 3. Extract routes, API-like paths, hosts, and protocol keywords.
node scripts/extract_endpoints.mjs ./out/js > ./out/ENDPOINTS.md

# 4. Restore a source map when the application exposes one.
node scripts/sourcemap_restore.mjs \
  https://app.example.test/assets/app.js.map ./src-restored

# 5. Capture an authorized browser session and redact it.
node scripts/cdp_capture.mjs https://app.example.test ./out/session.json
node scripts/redact_har.mjs ./out/session.json ./out/session.redacted.json

# 6. Summarize requests and replace volatile values with stable placeholders.
node scripts/summarize_har.mjs ./out/session.redacted.json > ./out/CONTRACTS.md

# 7. Run the local quality gate.
pnpm verify
```

`app.example.test` is a reserved placeholder. Never commit a real target host, cookie, token, personal data, or production payload.

## What is included

| Path | Purpose |
|---|---|
| `SKILL.md` | Entry point and operating rules loaded by an agent |
| `references/` | Focused field guides for observation, contracts, security, and reconstruction |
| `scripts/` | Small dependency-free Node.js helpers |
| `templates/` | Target card, API contract, evidence bundle, and adapter blueprint |
| `fixtures/` | Synthetic data used by tests; no production captures |
| `tests/` | Unit and CLI smoke tests |
| `docs/` | Maintenance and release notes |

## Supported helpers

| Helper | What it does |
|---|---|
| `asset_crawl.mjs` | Same-origin, rate-limited inventory of pages and static assets |
| `extract_endpoints.mjs` | Static extraction of route/API/host/protocol clues from text or bundles |
| `sourcemap_restore.mjs` | Restores `sourcesContent` into a local source tree |
| `cdp_capture.mjs` | Captures an authorized Chromium session over CDP |
| `redact_har.mjs` | Removes cookies, auth headers, secrets, and volatile values |
| `summarize_har.mjs` | Produces a readable contract inventory from redacted captures |
| `decode_ids.mjs` | Decodes base64, base64url, hex, and URL-encoded identifiers |
| `pua_ratio.mjs` | Measures private-use-area text, a common font-obfuscation signal |
| `privacy_scan.mjs` | Scans the repository for likely secrets and target-specific leakage |
| `selftest.sh` | Runs syntax, usage, fixture, and documentation checks |

## Design principles

- **Evidence over intuition.** Every material claim links to a request, response, file, or reproducible command.
- **Least access.** Use the smallest account, data set, and request volume that answers the question.
- **Stop at the boundary.** If a control blocks access, record it; do not bypass it.
- **Public evidence only.** Prefer shipped artifacts and documented interfaces over intrusive probing.
- **No target residue.** Use placeholders in examples and redact captures before commit.
- **Separate protection from business logic.** Signing, encryption, and transport concerns belong in one adapter layer.
- **Reconstruct behavior, not secrets.** Production credentials and personal data are out of scope.

## Repository hygiene

```bash
pnpm verify
git diff --check
```

`pnpm verify` runs syntax checks, all tests, a package smoke check, and the privacy scan.

## License

MIT. See [LICENSE](LICENSE).
