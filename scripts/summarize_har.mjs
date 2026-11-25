#!/usr/bin/env node
// Summarize a redacted HAR or cdp_capture.json file.
// Usage: node scripts/summarize_har.mjs capture.redacted.json
import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: summarize_har.mjs <capture.json|*.har>');
  process.exit(1);
}

let input;
try {
  input = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (error) {
  console.error(`failed to read JSON: ${error.message}`);
  process.exit(2);
}

function toRequests(data) {
  if (Array.isArray(data.requests)) {
    return data.requests
      .filter((request) => request && request.url && !request.kind)
      .map((request) => ({
        method: request.method || 'GET',
        url: request.url,
        status: request.status ?? null,
        headers: request.headers || {},
        body: request.body || null,
        mimeType: request.mimeType || '',
      }));
  }
  if (data.log && Array.isArray(data.log.entries)) {
    return data.log.entries.map((entry) => ({
      method: entry.request?.method || 'GET',
      url: entry.request?.url || '',
      status: entry.response?.status ?? null,
      headers: Object.fromEntries((entry.request?.headers || []).map((header) => [header.name, header.value])),
      body: entry.request?.postData?.text || null,
      mimeType: entry.response?.content?.mimeType || '',
    }));
  }
  return [];
}

const requests = toRequests(input);
if (requests.length === 0) {
  console.error('no requests found');
  process.exit(3);
}

function normalizeUrl(raw) {
  try {
    const url = new URL(raw);
    const path = url.pathname
      .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}(?=\/|$)/gi, '/<id>')
      .replace(/\/\d{6,}(?=\/|$)/g, '/<number>');
    return { path: `${url.host}${path}`, query: [...url.searchParams.keys()] };
  } catch {
    return { path: raw.split('?')[0], query: [] };
  }
}

function isStatic(raw) {
  try {
    const url = new URL(raw);
    return /\.(?:js|mjs|css|png|jpe?g|gif|svg|woff2?|ttf|otf|ico|map|webp|avif)(?:\?|$)/i.test(url.pathname + url.search);
  } catch {
    return false;
  }
}

const api = requests.filter((request) => !isStatic(request.url));
const hosts = new Map();
const methods = new Map();
const paths = new Map();

for (const request of requests) {
  try {
    const host = new URL(request.url).host;
    hosts.set(host, (hosts.get(host) || 0) + 1);
  } catch {
    // Ignore malformed URLs.
  }
}

for (const request of api) {
  methods.set(request.method, (methods.get(request.method) || 0) + 1);
  const normalized = normalizeUrl(request.url);
  const key = `${request.method} ${normalized.path}`;
  const current = paths.get(key) || {
    method: request.method,
    path: normalized.path,
    query: new Set(),
    statuses: new Set(),
    contentTypes: new Set(),
    count: 0,
  };
  for (const name of normalized.query) current.query.add(name);
  current.statuses.add(request.status);
  if (request.mimeType) current.contentTypes.add(request.mimeType);
  current.count += 1;
  paths.set(key, current);
}

const lines = [];
lines.push('# HTTP inventory');
lines.push('');
lines.push(`requests=${requests.length} apiLike=${api.length} hosts=${hosts.size}`);
lines.push('');
lines.push('## Hosts');
for (const [host, count] of [...hosts.entries()].sort((a, b) => b[1] - a[1])) {
  lines.push(`- ${host}: ${count}`);
}
lines.push('');
lines.push('## Methods');
for (const [method, count] of [...methods.entries()].sort((a, b) => b[1] - a[1])) {
  lines.push(`- ${method}: ${count}`);
}
lines.push('');
lines.push('## API-like endpoints');
lines.push('| Method | Path | Query | Statuses | Count | Content-Type |');
lines.push('|---|---|---|---|---|---|');
for (const item of [...paths.values()].sort((a, b) => a.path.localeCompare(b.path))) {
  const statuses = [...item.statuses].map((status) => String(status)).join(', ');
  const types = [...item.contentTypes].join(', ');
  lines.push(`| ${item.method} | \`${item.path}\` | ${[...item.query].join(', ') || '-'} | ${statuses || '-'} | ${item.count} | ${types || '-'} |`);
}
lines.push('');
lines.push('## Contract notes');
lines.push('- This inventory is not a contract until each row has an authorized request/response fixture.');
lines.push('- Verify success and error envelopes separately.');
lines.push('- Never copy tokens, cookies, personal data, or live identifiers into the document.');
console.log(lines.join('\n'));
