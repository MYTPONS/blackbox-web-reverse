# Security model and authorization

This document is about **describing** controls, not defeating them.

## 1. Authentication inventory

| Mechanism | Where used | Storage | Lifetime | Refresh | Revocation | Evidence |
|---|---|---|---|---|---|---|
| Session cookie | Web | `HttpOnly; Secure` | 8h | rotation | server-side | `req-001` |
| Bearer token | API | memory | 15m | refresh token | unknown | `req-018` |

Record the actual values only as redacted placeholders.

## 2. Authorization matrix

Build a role/action matrix from approved test accounts:

| Resource/action | Anonymous | Reader | Editor | Admin | Evidence |
|---|---|---|---|---|---|
| List examples | 401 | 200 | 200 | 200 | `req-010` |
| View own example | 401 | 200 | 200 | 200 | `req-011` |
| Edit example | 401 | 403 | 200 | 200 | `req-012` |
| View another tenant | 401 | 403 | 403 | 403 | `req-013` |

If you cannot test a cell without accessing another person's data, mark it `not tested — authorization required`.

## 3. Token analysis

Decode a token only to explain claims and expiry:

```bash
node scripts/decode_ids.mjs ./fixtures/token.example.json
```

Do not test signature bypass, algorithm confusion, token forgery, credential stuffing, or replay against another account. Those are out of scope for this skill.

## 4. Resource ownership

For each resource, document:

- owner identifier;
- tenant/organization identifier;
- permission source (role, ACL, policy engine);
- expected response when ownership fails;
- where the check occurs (gateway, service, data layer) if observable.

## 5. Boundary language

Use precise language in reports:

- “The endpoint requires an authenticated reader session.”
- “An editor receives `403` for another tenant.”
- “Not tested: cross-tenant access without a second approved account.”

Avoid language that implies a control was bypassed when it was not.

## 6. Handling a possible vulnerability

If you find a security issue:

1. stop testing the affected path;
2. preserve only the minimum redacted evidence;
3. notify the owner through the agreed private channel;
4. do not publish exploitable details before remediation;
5. include a safe reproduction and remediation recommendation in the private report.
