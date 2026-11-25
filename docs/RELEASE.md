# Release checklist

1. Run `pnpm install` and `pnpm verify`.
2. Run `pnpm skillcheck`.
3. Run `git diff --check`.
4. Confirm no real target host, IP, cookie, token, personal data, or production capture is present.
5. Update `package.json` and `SKILL.md` metadata versions.
6. Commit and tag `vX.Y.Z`.
7. Create a GitHub release with a concise change summary.
