import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

test('restores source files from sourcesContent', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bwr-map-'));
  execFileSync(process.execPath, ['scripts/sourcemap_restore.mjs', 'fixtures/sourcemap.map', outDir], {
    encoding: 'utf8',
  });
  assert.equal(fs.readFileSync(path.join(outDir, 'src/main.js'), 'utf8'), 'export const answer = 42;\n');
  assert.equal(fs.readFileSync(path.join(outDir, 'src/utils/format.js'), 'utf8'), 'export const format = (value) => String(value);\n');
  fs.rmSync(outDir, { recursive: true, force: true });
});
