# Security, authorization, and data handling

## Allowed context

Use this skill only when one of the following is true:

- you own the target system;
- the target owner has given written authorization that includes the exact hosts, accounts, data, test windows, and request-rate limits;
- you are working in a local or disposable environment with synthetic data;
- the activity is limited to publicly documented interfaces and public artifacts in a way that does not violate access controls or applicable law.

If the authorization is ambiguous, stop and resolve it before collecting evidence.

## Hard boundaries

Do not use this project to:

- bypass authentication, authorization, paywalls, quotas, rate limits, CAPTCHAs, or anti-abuse controls;
- obtain, validate, or rotate stolen credentials;
- access another user's data or demonstrate cross-tenant access using real accounts;
- scan internal networks or cloud metadata services;
- exploit an SSRF, injection, deserialization, or file-read primitive;
- publish production cookies, tokens, personal data, customer content, or unredacted captures;
- cause load, state changes, or costs outside the approved scope.

When a control blocks access, record the control and the missing authorization. Do not work around it.

## Data handling

- Use a dedicated test account and synthetic records.
- Capture only the minimum request/response data needed to establish a contract.
- Redact cookies, `Authorization` headers, CSRF tokens, session IDs, API keys, email addresses, phone numbers, and other personal data before storing evidence.
- Do not copy production secrets into fixtures, issues, pull requests, or this repository.
- Prefer hashes or stable placeholders over raw identifiers.
- Delete temporary captures and browser profiles after the engagement.

## Stop conditions

Stop and notify the system owner if you observe:

- a production outage, data corruption, or unexpected write;
- access to data outside the approved scope;
- a security issue that could affect real users;
- a request pattern that triggers rate limiting or abuse monitoring;
- uncertainty about authorization or legal basis.

## Reporting a problem in this repository

Open a private security advisory on GitHub if the issue could expose users or infrastructure. Do not include live secrets or production captures in a public issue.
