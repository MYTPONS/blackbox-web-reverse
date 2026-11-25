#!/usr/bin/env node
// Validate the repository as a portable skill package.
import fs from 'node:fs';
import path from 'node:path';

const required = [
  'README.md',
  'README.zh-CN.md',
  'LICENSE',
  'SECURITY.md',
  'SKILL.md',
  'package.json',
  'references/checklist.md',
  'templates/target-card.md',
  'templates/adapter.mjs',
  'tests',
];

const missing = required.filter((item) => !fs.existsSync(path.join(process.cwd(), item)));
if (missing.length > 0) {
  console.error(`missing required paths: ${missing.join(', ')}`);
  process.exit(1);
}

const skill = fs.readFileSync(path.join(process.cwd(), 'SKILL.md'), 'utf8');
if (!skill.startsWith('---\n')) {
  console.error('SKILL.md is missing YAML frontmatter');
  process.exit(2);
}
const frontmatter = skill.split('---', 3)[1] || '';
for (const field of ['name:', 'description:']) {
  if (!frontmatter.includes(field)) {
    console.error(`SKILL.md frontmatter missing ${field}`);
    process.exit(3);
  }
}
if (!frontmatter.includes('name: blackbox-web-reverse')) {
  console.error('SKILL.md name must match the repository skill name');
  process.exit(4);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
if (packageJson.name !== 'blackbox-web-reverse') {
  console.error('package.json name mismatch');
  process.exit(5);
}
if (!packageJson.scripts || packageJson.scripts.build !== 'node scripts/check_package.mjs') {
  console.error('package.json build script mismatch');
  process.exit(6);
}

const suspicious = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'out', 'dist'].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:md|mjs|json|sh|txt)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      if (/TODO\s*:\s*replace|YOUR[_-]?TARGET|INSERT[_-]?TARGET/i.test(text)) suspicious.push(path.relative(process.cwd(), full));
    }
  }
}
walk(process.cwd());
if (suspicious.length > 0) {
  console.error(`unfinished placeholders: ${suspicious.join(', ')}`);
  process.exit(7);
}

console.log(`package-ok version=${packageJson.version}`);
