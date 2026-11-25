# API contract reconstruction

## 1. Contract table

| # | Method | Path | Auth | Inputs | Success | Errors | Pagination | Evidence |
|---|---|---|---|---|---|---|---|---|
| 1 | GET | `/api/examples` | bearer | `page`, `limit` | `{data, pageInfo}` | 401/403/422 | cursor | `req-012` |

“Works in DevTools” is not a contract. A contract is reproducible outside the page with a minimal, redacted request.

## 2. Request and response shapes

Record:

- content type;
- required and optional headers;
- path/query/body parameters;
- nullability and type quirks;
- success envelope;
- error envelope and user-safe messages;
- pagination strategy;
- cache and conditional-request behavior;
- request IDs and tracing headers;
- observed latency from a small bounded sample.

## 3. Error envelopes

| Status | Shape | Meaning | Retry? |
|---|---|---|---|
| 401 | `{error:{code:"UNAUTHENTICATED"}}` | Missing/expired session | Re-auth, do not bypass |
| 403 | `{error:{code:"FORBIDDEN"}}` | Insufficient permission | Record boundary |
| 409 | `{error:{code:"CONFLICT"}}` | State conflict | No automatic retry |
| 422 | `{errors:{field:[...]}}` | Validation | Fix request |
| 429 | rate-limit headers | Throttled | Back off; do not evade |

## 4. GraphQL

If introspection is documented or authorized, record:

- schema version and endpoint;
- query/mutation names;
- input and output types;
- nullability;
- authorization at field and object levels;
- operation complexity or rate-limit behavior.

Do not use GraphQL to access fields or objects outside the approved account and scope.

## 5. WebSocket and streaming

| Item | Record |
|---|---|
| Transport | WebSocket / SSE / MQTT / long polling |
| Handshake | URL, protocols, auth headers/cookies |
| Events | client → server and server → client |
| Encoding | JSON / binary / protobuf |
| Heartbeat | interval, timeout, reconnect |
| Resume | cursor/token, replay behavior |
| Scope | tenant/channel authorization evidence |

## 6. Identifier handling

Some APIs expose multiple identifier forms. Decode only for understanding:

```bash
node scripts/decode_ids.mjs ./fixtures/response.example.json
```

Record the codec per field. Do not assume all IDs in one response use the same encoding.

## 7. Contract acceptance

- Local stub tests cover success, empty, validation, unauthorized, forbidden, conflict, and rate-limited responses.
- Pagination termination is proven with a bounded fixture.
- Timeouts are aligned to observed behavior.
- Every response shape has a redacted example.
- Unknowns are explicit.
