# Signing, encryption, and client-side protection

Use this guide only for interoperability work on systems you own or are explicitly authorized to assess. If a mechanism is an access-control or anti-abuse boundary, stop and report it.

## 1. Locate the request construction

- Search the bundle for a header name observed in an authorized capture.
- Use an XHR/fetch breakpoint to find the caller stack.
- Inspect documented interceptors and request wrappers.
- Prefer a read-only runtime call to rewriting the algorithm.

Record the input, output, timestamp precision, and validation behavior with synthetic data.

## 2. Identify common primitives

| Evidence | Possible primitive | Next step |
|---|---|---|
| 32 hex chars | MD5 | Confirm input canonicalization |
| 40 hex chars | SHA-1 | Confirm encoding |
| 64 hex chars | SHA-256 | Check HMAC vs hash |
| base64 + IV | AES/DES | Record mode, IV, padding |
| WebAssembly export | Compiled routine | Inspect documented exports |
| Large switch state machine | VM/obfuscation | Prefer documented runtime contract |

Do not publish extracted production keys, salts, device identifiers, or proprietary anti-abuse internals.

## 3. WebAssembly

1. Identify the public `.wasm` asset and its documented purpose.
2. Inspect exported names and metadata with standard tooling.
3. Call only the exported function needed for interoperability in a controlled environment.
4. Record inputs/outputs with synthetic fixtures.

## 4. Encrypted responses

If the response is legitimately encrypted for the integration:

- identify the envelope format and version;
- record key-source and rotation behavior without exposing keys;
- verify with a synthetic fixture;
- document error and downgrade behavior.

Stop if decryption would expose data outside the approved account or scope.

## 5. Device and anti-automation controls

Do not bypass CAPTCHAs, device attestation, bot detection, or anti-tamper controls. Record:

- the control observed;
- the user-facing behavior;
- the approved alternative (official API, test mode, sandbox, or manual flow);
- what remains unverified.

## 6. Deliverable

```text
transport/
  request.js       # HTTP/WS request construction
  signature.js     # documented signing boundary
  crypto.js        # versioned envelope handling
fixtures/
  sign-input.json
  sign-output.json
docs/
  sign-spec.md
```

`sign-spec.md` must include the contract, synthetic test vectors, failure behavior, and a statement that no production secret is stored in the repository.
