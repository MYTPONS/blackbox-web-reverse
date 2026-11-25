import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('reports PUA ratio from stdin', () => {
  const pua = String.fromCodePoint(0xe000);
  const output = execFileSync(process.execPath, ['scripts/pua_ratio.mjs'], {
    input: `<html><body>hello${pua}</body></html>`,
    encoding: 'utf8',
  });
  assert.match(output, /chars=6 pua=1/);
  assert.match(output, /ratio=16\.67%/);
  assert.match(output, /possible-font-obfuscation/);
});
