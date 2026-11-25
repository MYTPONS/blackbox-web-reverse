# Contributing

## Scope

Contributions should improve the methodology, documentation, local tests, or safe static-analysis helpers. Please do not add target-specific case studies, live domains, credentials, scanning dictionaries, exploitation primitives, or instructions for bypassing access controls.

## Local checks

```bash
pnpm verify
```

The gate includes syntax checks, unit tests, CLI smoke tests, a package dry-run, and a repository privacy scan.

## Style

- Node.js 20 or newer; no third-party runtime dependencies.
- Prefer `node:` built-ins.
- Keep scripts small, composable, and safe by default.
- Use `app.example.test` or another reserved placeholder in examples.
- Add a test for every new parser or output contract.
- Document security-sensitive behavior and stop conditions.

## Pull requests

Describe:

1. the operator problem;
2. the safe behavior added or corrected;
3. the tests and commands run;
4. any remaining limitation.
