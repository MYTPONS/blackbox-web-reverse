---
name: blackbox-web-reverse
description: "Authorized black-box web application reverse engineering: reconstruct frontend routes, shipped JavaScript, API contracts, real-time channels, authentication and authorization behavior, data entities, and business rules from a running system. Use when the user asks to understand, document, migrate, test, or rebuild a website they own or are explicitly authorized to assess, or to turn browser/HAR evidence into a reproducible specification. Do not use for bypassing access controls, paywalls, quotas, CAPTCHAs, or for collecting data outside an approved scope."
license: MIT
metadata:
  version: "1.0.1"
  author: MYTPONS
---

# Black-box Web Reverse Engineering

Turn an opaque running web application into a reproducible specification and, when requested, a clean reconstruction blueprint.

The unit of work is **evidence → contract → reconstruction**, not “scan everything”.

## Operating contract

1. **Establish authorization first.** Record the owner, exact hosts, accounts, data classes, test window, rate limit, and prohibited actions. If any is missing, stop and ask.
2. **Use the cheapest source first.** Official SDK or package → OpenAPI/source map → runtime observation → shipped JavaScript → minimal request replay → manual reconstruction.
3. **Prefer public artifacts.** Never bypass a control. If a response says unauthorized, rate-limited, invalid session, or CAPTCHA required, record the boundary and move on.
4. **Minimize impact.** Use a dedicated test account, synthetic records, same-origin requests, a conservative delay, and the smallest request set that answers the question.
5. **Redact at capture time.** Never persist raw cookies, bearer tokens, CSRF values, personal data, or production payloads in a repository, issue, or report.
6. **Evidence or it did not happen.** Attach a command, request/response excerpt, source location, or screenshot to every material conclusion. Mark unknowns as `unverified`.
7. **Stop on ambiguity.** If the next action could modify data, cross a tenant boundary, or exceed the approved scope, do not take it without explicit approval.

Read [SECURITY.md](SECURITY.md) before any collection activity.

## Deliverables

Produce only the artifacts the task needs:

- target card and evidence index;
- architecture and rendering-mode map;
- route and bundle map;
- API contract table with redacted examples;
- real-time channel description;
- authentication and authorization matrix;
- data model, identifiers, and business-rule notes;
- reconstruction blueprint or adapter;
- `docs/ACCEPTANCE.md` with commands, outputs, and unknowns.

## Workflow

### 0. Target card

Copy `templates/target-card.md` and fill it before making requests.

```md
Owner/authorization: <name + written approval reference>
Hosts in scope: <exact origins>
Accounts in scope: <dedicated test accounts>
Data in scope: <synthetic or approved data classes>
Request limit: <max RPS / total requests>
Prohibited: <writes, destructive actions, third-party hosts>
Stop conditions: <how to abort safely>
```

If authorization is not recorded, do not collect evidence.

### 1. Observe the public surface

Start with one documented entry point supplied by the owner:

```bash
node scripts/asset_crawl.mjs https://app.example.test ./out \
  --max-pages 20 --max-depth 2 --delay 1000
```

Record:

- protocol and redirect behavior;
- server/framework headers and error-page shape;
- static asset path conventions;
- page → chunk mapping;
- source-map references;
- lazy-loaded routes and dynamic imports;
- third-party origins the browser actually contacts.

A `200` is not proof of a valid route; a `404` is not proof that a handler does not exist. Use response signatures and documented behavior.

### 2. Restore frontend structure

Use source maps when present:

```bash
node scripts/sourcemap_restore.mjs \
  https://app.example.test/assets/app.js.map ./src-restored
```

Then inspect the shipped JavaScript:

```bash
node scripts/extract_endpoints.mjs ./out/js > ./out/ENDPOINTS.md
```

Build a map:

| Route | Page/component | Lazy chunks | State/store | API calls | Permission gate |
|---|---|---|---|---|---|
| `/example/:id` | `ExamplePage` | `example.[hash].js` | `exampleStore` | `GET /api/examples/:id` | `example:read` |

Runtime probes are useful only when they are read-only and within scope. Never mutate application state to expose a hidden screen.

### 3. Capture an authorized session

Use an existing authorized browser session:

```bash
node scripts/cdp_capture.mjs https://app.example.test ./out/session.json
node scripts/redact_har.mjs ./out/session.json ./out/session.redacted.json
node scripts/summarize_har.mjs ./out/session.redacted.json > ./out/CONTRACTS.md
```

Capture only the user flows needed for the contract. Do not capture unrelated accounts, payment data, private messages, or personal content.

### 4. Reconstruct API contracts

For each endpoint, record:

| Field | Example |
|---|---|
| Method + path | `GET /api/examples/:id` |
| Auth | `Authorization: Bearer <redacted>` |
| Required inputs | `id: string` |
| Optional inputs | `include=items` |
| Success envelope | `{ "data": ..., "requestId": "..." }` |
| Error envelope | `{ "error": { "code": "...", "message": "..." } }` |
| Pagination | cursor / offset / none |
| Idempotency | safe / unsafe / unknown |
| Observed latency | P50/P95 from a small sample |
| Evidence | redacted request ID or HAR entry |

Replay a request only when it is read-only, authorized, and necessary. Use `templates/api-contract.md`.

### 5. Map authentication and authorization behavior

Describe behavior, not bypasses:

- credential and session types;
- token storage and refresh behavior;
- required headers and CSRF handling;
- role and permission claims;
- resource ownership checks;
- differences between documented entry points.

Use a matrix:

| Action | Anonymous | Reader | Editor | Admin | Evidence |
|---|---|---|---|---|---|
| View example | 401 | 200 | 200 | 200 | request ID |
| Edit example | 401 | 403 | 200 | 200 | request ID |

If a control blocks access, record the control. Do not attempt auth bypass, quota evasion, credential stuffing, SSRF, injection, or privilege escalation.

### 6. Recover data and business rules

- Decode identifiers with `node scripts/decode_ids.mjs response.json`.
- Cross-check fields across list, detail, create/edit, and export views.
- Derive formulas from public documentation and approved test data.
- Record state transitions and idempotency.
- Validate with a small, deterministic test fixture; do not scrape unrelated production content.

### 7. Handle client-side protection as a boundary

`references/sign-and-crypto.md` covers how to inspect signing, encryption, WebAssembly, and anti-debugging **for interoperability on authorized systems**. Use the least invasive option:

1. call the application's own documented function in an authorized browser context;
2. implement the documented contract;
3. stop if the protection is an access-control or anti-abuse boundary.

Do not defeat CAPTCHAs, device fingerprinting, bot controls, or paywalls.

### 8. Reconstruct

Keep concerns separated:

```text
rev/
  transport/   http.js  ws.js  sign.js  crypto.js
  model/       entities.js  id-codec.js  rules.js
  service/     auth.js  list.js  detail.js  admin.js
  adapters/    source-a.js  source-b.js
  ui/          ...                # only when explicitly in scope
  config/      sites.example.json
```

The adapter template in `templates/adapter.mjs` shows capability flags, ID codecs, timeouts, and source-level error handling. Do not put production secrets in configuration or fixtures.

### 9. Acceptance

Run the smallest relevant set:

```bash
node --check scripts/*.mjs
pnpm verify
git diff --check
```

For a reconstructed UI, also run the project's visual tests at desktop and mobile sizes. Provide screenshot paths and console output. For an API adapter, provide:

- local stub tests;
- redacted contract examples;
- timeout/error mapping;
- pagination and identifier tests;
- an explicit “not recovered” list.

## Decision tree

```text
Is there an official SDK/package/OpenAPI/source map?
  ├─ yes → inspect the artifact, verify the contract, stop
  └─ no
       Is the page server-rendered or does it expose inline state?
         ├─ yes → record HTML/state, then verify endpoints
         └─ no  → inventory chunks, extract routes, observe an authorized session
                    ├─ contract is public/authorized → document and replay read-only calls
                    └─ control blocks access        → record boundary; do not bypass
```

## Reference map

| File | Use |
|---|---|
| `references/checklist.md` | Phase-by-phase completion checklist |
| `references/observation.md` | Browser, CDP, HAR, and runtime observation |
| `references/frontend-restore.md` | Source maps, bundles, routes, stores |
| `references/api-contracts.md` | API, GraphQL, WebSocket, pagination, errors |
| `references/security-model.md` | AuthN/AuthZ and safe testing boundaries |
| `references/sign-and-crypto.md` | Interoperability analysis for authorized systems |
| `references/framework-recipes.md` | Framework-specific public evidence |
| `references/reconstruction.md` | Layered reconstruction and quality gates |

## Scripts

| Script | Purpose |
|---|---|
| `scripts/asset_crawl.mjs` | Same-origin, rate-limited page/asset inventory |
| `scripts/extract_endpoints.mjs` | Static route/API/host/protocol extraction |
| `scripts/sourcemap_restore.mjs` | Restore `sourcesContent` into a local tree |
| `scripts/cdp_capture.mjs` | Capture an authorized Chromium session |
| `scripts/redact_har.mjs` | Redact headers, cookies, tokens, and personal data |
| `scripts/summarize_har.mjs` | Summarize redacted HTTP exchanges |
| `scripts/decode_ids.mjs` | Decode common identifier encodings |
| `scripts/pua_ratio.mjs` | Measure PUA text ratio |
| `scripts/privacy_scan.mjs` | Detect likely secrets and target-specific leakage |
| `scripts/syntax_check.mjs` | Check JavaScript and shell syntax across the repository |
| `scripts/check_package.mjs` | Validate the portable skill package layout and metadata |
| `scripts/selftest.sh` | Syntax, usage, fixture, and doc consistency checks |

## Final checklist

- [ ] Authorization and scope are recorded.
- [ ] All examples use reserved domains and synthetic data.
- [ ] Evidence is redacted and reproducible.
- [ ] No access control, quota, CAPTCHA, or paywall was bypassed.
- [ ] Unknowns are explicit.
- [ ] `pnpm verify` and `git diff --check` pass.
