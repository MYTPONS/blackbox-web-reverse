# Observation and evidence

## 1. Evidence hierarchy

Use the least invasive source that answers the question:

1. owner-provided specification or source;
2. official SDK, package, OpenAPI, schema, or source map;
3. public application behavior;
4. authorized runtime observation;
5. static analysis of shipped JavaScript;
6. minimal read-only replay.

Do not jump to request fuzzing or manual brute force.

## 2. Browser observation

Use a dedicated browser profile and a test account. Keep a log:

| Time | Origin | Action | Account | Request count | Result | Evidence |
|---|---|---|---|---|---|---|
| `T0` | `app.example.test` | Open list page | `reader@example.test` | 4 | 200 | HAR `req-001` |

Record only the screens and flows needed to explain the contract. Do not capture unrelated messages, payments, health data, or customer content.

## 3. CDP capture

```bash
node scripts/cdp_capture.mjs https://app.example.test ./out/session.json
```

The capture records:

- request/response metadata and timing;
- WebSocket frames;
- console and runtime errors;
- request initiator stack;
- page forms and global framework probes.

Immediately redact it:

```bash
node scripts/redact_har.mjs ./out/session.json ./out/session.redacted.json
```

The raw capture is temporary. Never commit it.

## 4. HAR hygiene

Before storing a capture:

- remove cookies, authorization headers, CSRF tokens, API keys, and session IDs;
- replace emails, phone numbers, names, addresses, and resource IDs with stable placeholders;
- truncate large bodies and remove binary/media payloads;
- remove unrelated hosts;
- keep the request sequence and response envelope needed to establish the contract;
- record the redaction method and residual risk.

## 5. Response signatures

Use more than status codes:

- content type and body shape;
- normalized error envelope;
- headers such as `WWW-Authenticate`, `Retry-After`, and rate-limit headers;
- redirect target;
- response length and a body hash;
- framework-generated error text.

A different body does **not** imply success. Success requires the expected business payload, not merely a changed error string.

## 6. Request replay

Replay only requests that are read-only, authenticated with an authorized test account, and necessary for the contract.

For each replay, record:

```text
Endpoint:
Method:
Headers (redacted):
Body (synthetic):
Expected status/envelope:
Observed status/envelope:
Evidence ID:
```

If the request would create, update, delete, invite, pay, publish, or trigger a side effect, do not replay without explicit approval and a reversible test plan.

## 7. Reproducible evidence bundle

```text
evidence/
  manifest.json
  target-card.md
  requests/
    req-001.redacted.http
    req-002.redacted.http
  responses/
    req-001.redacted.json
  screenshots/
  notes.md
  ACCEPTANCE.md
```

`manifest.json` should include hashes, collection timestamps, tool versions, and a short description of each artifact.
