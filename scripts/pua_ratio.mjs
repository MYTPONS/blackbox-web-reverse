#!/usr/bin/env node
// Measure private-use-area (PUA) text, a signal for font-based obfuscation.
// Usage: node scripts/pua_ratio.mjs page.html
//        cat page.txt | node scripts/pua_ratio.mjs
import fs from 'node:fs';

const input = process.argv[2];
const raw = input ? fs.readFileSync(input, 'utf8') : fs.readFileSync(0, 'utf8');
const text = raw
  .replace(/<script\b[\s\S]*?<\/script>/gi, '')
  .replace(/<style\b[\s\S]*?<\/style>/gi, '')
  .replace(/<[^>]+>/g, '');

let total = 0;
let pua = 0;
const counts = new Map();
for (const char of text) {
  const code = char.codePointAt(0);
  if (code <= 0x20) continue;
  total += 1;
  if (code >= 0xe000 && code <= 0xf8ff) {
    pua += 1;
    const key = code.toString(16).toUpperCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
}

const ratio = total === 0 ? 0 : (pua / total) * 100;
console.log(`chars=${total} pua=${pua} ratio=${ratio.toFixed(2)}%`);
const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
if (top.length > 0) {
  console.log(`top=${top.map(([code, count]) => `U+${code}x${count}`).join(',')}`);
}
console.log(ratio > 10 ? 'signal=possible-font-obfuscation' : 'signal=none-obvious');
