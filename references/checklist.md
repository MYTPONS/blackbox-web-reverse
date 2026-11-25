# Reverse-engineering checklist

Use this checklist as an evidence gate. A box is checked only when the linked artifact exists.

## 0. Authorization

- [ ] Owner, written authorization, and engagement window are recorded.
- [ ] Exact origins and subdomains are allowlisted.
- [ ] Dedicated test accounts and synthetic records are identified.
- [ ] Request-rate and total-request limits are agreed.
- [ ] Prohibited data, writes, and third-party systems are documented.
- [ ] Stop and escalation contacts are available.

## 1. Surface inventory

- [ ] Entry URL and redirect behavior are recorded.
- [ ] Public HTML, scripts, styles, fonts, and maps are inventoried.
- [ ] A page → lazy chunk map exists.
- [ ] Source-map references and build identifiers are recorded.
- [ ] Third-party origins are documented; only approved origins are contacted.

## 2. Frontend skeleton

- [ ] Rendering mode is supported by evidence: SSR, SSG, SPA, MPA, micro-frontend, or hybrid.
- [ ] Route table and dynamic-route patterns are documented.
- [ ] Store/state boundaries are identified without modifying production state.
- [ ] Request interceptors, retry logic, and global error handling are described.
- [ ] Lazy chunks are associated with the user flows that load them.

## 3. API contracts

- [ ] API-like paths come from at least two sources: bundle extraction and runtime capture.
- [ ] Every endpoint has method, path, auth, inputs, success shape, error shape, pagination, and evidence.
- [ ] Read-only requests were replayed with the smallest necessary headers.
- [ ] Field types and nullability are tested with localized, bounded cases.
- [ ] Rate limits and controls are recorded as boundaries, not bypassed.

## 4. Real-time channels

- [ ] Transport is identified: WebSocket, SSE, MQTT, long polling, or WebRTC.
- [ ] Handshake and authentication sequence are documented.
- [ ] Frame/event types and heartbeat behavior are listed.
- [ ] Reconnect, resume, and backfill behavior is described.
- [ ] No unauthorized channel or tenant is accessed.

## 5. Authentication and authorization

- [ ] Session/token types and storage locations are mapped.
- [ ] Refresh, logout, and revocation behavior are described.
- [ ] Permission codes and role matrix are evidence-backed.
- [ ] Resource ownership and tenant boundaries are documented.
- [ ] Any boundary that blocks testing is recorded; no bypass is attempted.

## 6. Data and business rules

- [ ] Identifier encodings are tested one field at a time.
- [ ] List, detail, edit, and export shapes are cross-checked.
- [ ] Business formulas are derived from approved data and recorded with error bounds.
- [ ] State transitions and idempotency are documented.
- [ ] Personal data is minimized and redacted.

## 7. Reconstruction

- [ ] Transport, model, service, adapter, and UI concerns are separated.
- [ ] Signing/encryption, if any, is isolated in the transport layer.
- [ ] Timeouts follow observed upstream behavior.
- [ ] Error and empty states are handled explicitly.
- [ ] Fixtures use synthetic data and no production credentials.

## 8. Delivery gate

- [ ] `pnpm verify` passes.
- [ ] `git diff --check` passes.
- [ ] Every material claim links to evidence.
- [ ] Unknown items are marked `unverified`.
- [ ] A privacy scan confirms no real target host, secret, or personal data remains.
