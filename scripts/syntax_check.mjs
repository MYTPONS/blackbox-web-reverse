#!/usr/bin/env node
// Check JavaScript and shell syntax without running the helpers.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const files = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'out', 'dist'].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:mjs|cjs|js)$/.test(entry.name) || entry.name.endsWith('.sh')) files.push(full);
  }
}

walk(root);
let checked = 0;
for (const file of files) {
  try {
    if (file.endsWith('.sh')) execFileSync('bash', ['-n', file], { stdio: 'pipe' });
    else execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    checked += 1;
  } catch (error) {
    console.error(`syntax failure: ${path.relative(root, file)}`);
    console.error(String(error.stderr || error.message));
    process.exit(1);
  }
}
console.log(`syntax-ok files=${checked}`);
