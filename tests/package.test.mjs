import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('repository metadata and references are complete', () => {
  const skill = fs.readFileSync('SKILL.md', 'utf8');
  assert.match(skill, /^---\nname: blackbox-web-reverse\n/);
  for (const file of [
    'README.md',
    'README.zh-CN.md',
    'SECURITY.md',
    'LICENSE',
    'references/checklist.md',
    'references/observation.md',
    'references/frontend-restore.md',
    'references/api-contracts.md',
    'references/security-model.md',
    'references/sign-and-crypto.md',
    'references/framework-recipes.md',
    'references/reconstruction.md',
  ]) {
    assert.ok(fs.existsSync(file), `${file} should exist`);
  }
});
