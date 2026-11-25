#!/usr/bin/env node
// Extract route/API/host/protocol clues from shipped text, HTML, or JavaScript.
// Usage:
//   node scripts/extract_endpoints.mjs ./out/js
//   node scripts/extract_endpoints.mjs ./out/html ./out/js
//   cat app.js | node scripts/extract_endpoints.mjs -
import fs from 'node:fs';
import path from 'node:path';

const inputs = process.argv.slice(2);
if (inputs.length === 0) {
  console.error('usage: extract_endpoints.mjs <dir|file|->...');
  process.exit(1);
}

function walk(input) {
  if (input === '-') return [{ name: '<stdin>', text: fs.readFileSync(0, 'utf8') }];
  const stat = fs.statSync(input);
  if (!stat.isDirectory()) return [{ name: input, text: fs.readFileSync(input, 'utf8') }];
  const files = [];
  for (const entry of fs.readdirSync(input, { withFileTypes: true })) {
    const full = path.join(input, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(?:html?|js|mjs|cjs|ts|jsx|tsx|vue|svelte)$/i.test(entry.name)) {
      files.push({ name: full, text: fs.readFileSync(full, 'utf8') });
    }
  }
  return files;
}

const files = inputs.flatMap((input) => {
  try {
    return walk(input);
  } catch (error) {
    console.error(`skip ${input}: ${error.message}`);
    return [];
  }
});
if (files.length === 0) {
  console.error('no readable HTML/JS files');
  process.exit(2);
}

const apiPaths = new Set();
const routes = new Set();
const hosts = new Set();
const websockets = new Set();
const headers = new Set();
const keywords = new Map();

const API_PATTERN = /(["'`])((?:\/(?:api|v\d+|admin|manage|open|internal|gateway|auth|user|order|pay|upload|file|msg|ws)\b)[A-Za-z0-9_\-/{}$.:?=&%]*)\1/g;
const ROUTE_PATTERN = /(["'`])(\/[A-Za-z0-9_\-/{}$:.]{2,100})\1/g;
const HOST_PATTERN = /https?:\/\/[A-Za-z0-9_.\-]+(?::\d+)?/g;
const WS_PATTERN = /wss?:\/\/[A-Za-z0-9_.\-:/?=&]+/g;
const HEADER_PATTERN = /(["'`])(x-[a-z0-9-]{2,40})\1/gi;
const KEYWORDS = {
  signing: /(?:signature|hmac|nonce|timestamp|app[_-]?key|app[_-]?secret|request[_-]?id)/i,
  crypto: /(?:CryptoJS|createCipher|AES|RSA|SM2|SM3|SM4|encrypt|decrypt|atob|btoa|deflate|inflate)/i,
  auth: /(?:authorization|bearer|csrf|xsrf|session|cookie|oauth|jwt)/i,
  admin: /(?:admin|manage|backend|dashboard|permission|role|menu)/i,
  realtime: /(?:WebSocket|EventSource|socket\.io|mqtt|sse)/i,
};

for (const file of files) {
  const text = file.text;
  for (const match of text.matchAll(API_PATTERN)) apiPaths.add(match[2]);
  for (const match of text.matchAll(ROUTE_PATTERN)) routes.add(match[2]);
  for (const match of text.matchAll(HOST_PATTERN)) hosts.add(match[0]);
  for (const match of text.matchAll(WS_PATTERN)) websockets.add(match[0]);
  for (const match of text.matchAll(HEADER_PATTERN)) headers.add(match[2].toLowerCase());

  for (const [category, pattern] of Object.entries(KEYWORDS)) {
    const hits = keywords.get(category) || [];
    for (const line of text.split('\n')) {
      if (pattern.test(line) && line.trim().length < 500) {
        hits.push(`${path.basename(file.name)}: ${line.trim().slice(0, 220)}`);
      }
    }
    keywords.set(category, hits);
  }
}

const sort = (set) => [...set].sort((a, b) => a.localeCompare(b));
const out = [];
out.push('# Static endpoint extraction');
out.push('');
out.push(`Files: ${files.length}`);
out.push(`API-like paths: ${apiPaths.size}; routes: ${routes.size}; hosts: ${hosts.size}; WebSocket URLs: ${websockets.size}`);
out.push('');
out.push('## API-like paths');
for (const item of sort(apiPaths)) out.push(`- ${item}`);
out.push('');
out.push('## Page/route candidates');
for (const item of sort(routes)) out.push(`- ${item}`);
out.push('');
out.push('## Hosts');
for (const item of sort(hosts)) out.push(`- ${item}`);
out.push('');
out.push('## WebSocket URLs');
for (const item of sort(websockets)) out.push(`- ${item}`);
out.push('');
out.push('## Custom header candidates');
for (const item of sort(headers)) out.push(`- ${item}`);
out.push('');
out.push('## Keyword lines');
for (const [category, hits] of keywords) {
  out.push(`### ${category}`);
  if (hits.length === 0) out.push('- none');
  for (const hit of [...new Set(hits)].slice(0, 30)) out.push(`- ${hit}`);
}
out.push('');
out.push('> Findings are hypotheses. Verify each path and field against an authorized response.');

console.log(out.join('\n'));
