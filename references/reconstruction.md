# Reconstruction blueprint

## 1. Layers

```text
rev/
  transport/   HTTP, WebSocket, retries, request IDs, signing boundary
  model/       entities, identifiers, validation, business rules
  service/     use cases, pagination, authorization policy
  adapters/    per-upstream capability and error mapping
  ui/          only when explicitly in scope
  config/      target-independent examples and feature flags
```

## 2. Adapter contract

Each adapter should declare:

```js
export const capabilities = {
  list: true,
  detail: true,
  search: true,
  realtime: false,
};
```

And implement only the capabilities it can support. A successful search does not imply that detail or write operations are available.

## 3. Error model

Map upstream errors to a stable local taxonomy:

| Local code | Upstream examples | Behavior |
|---|---|---|
| `UNAUTHENTICATED` | 401, expired session | Re-auth through approved flow |
| `FORBIDDEN` | 403, tenant mismatch | Surface permission error |
| `NOT_FOUND` | 404, missing resource | Empty state |
| `RATE_LIMITED` | 429, retry-after | Back off; do not evade |
| `UPSTREAM_ERROR` | 5xx, timeout | Bounded retry + observability |

## 4. Quality gates

- local HTTP stub tests;
- synthetic response fixtures;
- pagination termination;
- identifier round-trip;
- timeout and cancellation;
- error-envelope mapping;
- no production secrets in config;
- no target-specific data in repository.

## 5. Acceptance document

`docs/ACCEPTANCE.md` should record:

```md
# Acceptance

## Scope
Owner / hosts / account / data / time window.

## Commands
...

## Results
...

## Evidence
...

## Not recovered
- Item — reason — required authorization/artifact.
```

## 6. Delivery checklist

- [ ] Core flows work against a local stub.
- [ ] UI states are covered when UI is in scope.
- [ ] Desktop and mobile screenshots exist when UI is in scope.
- [ ] Console errors are recorded.
- [ ] Unknowns are explicit.
- [ ] No real target or secret remains.
