# API contract

## Endpoint

```text
METHOD:
PATH:
AUTH:
CONTENT TYPE:
EVIDENCE ID:
```

## Inputs

| Location | Name | Type | Required | Constraints | Example |
|---|---|---|---|---|---|
| path | `id` | string | yes | opaque ID | `<id>` |
| query | `page` | integer | no | >= 1 | `1` |
| body | `name` | string | yes | 1..80 chars | `<name>` |

## Success

```json
{
  "data": {},
  "requestId": "<request-id>"
}
```

## Errors

| Status | Code | Meaning | Retry | Evidence |
|---|---|---|---|---|
| 400 | `INVALID_ARGUMENT` | Invalid input | No | `<id>` |
| 401 | `UNAUTHENTICATED` | Missing/expired session | No | `<id>` |
| 403 | `FORBIDDEN` | Permission denied | No | `<id>` |
| 429 | `RATE_LIMITED` | Back off | Bounded | `<id>` |

## Pagination

- Strategy:
- Page size:
- Cursor field:
- Termination condition:
- Total count:

## Behavior

- Idempotency:
- Cache:
- Conditional requests:
- Observed latency:
- Side effects:

## Notes

- `unverified`:
