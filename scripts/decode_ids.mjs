#!/usr/bin/env node
// Decode common identifier encodings in a JSON document.
// Usage: node scripts/decode_ids.mjs response.json [--all]
//        cat response.json | node scripts/decode_ids.mjs -
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ID_KEY = /(?:^|_)(?:id|key|token|code|cursor|slug|ref|hash)(?:$|_)/i;
const URL_KEY = /(?:url|uri|href|link|endpoint|redirect)/i;
const B64_PATTERN = /^[A-Za-z0-9+/_-]+={0,2}$/;

function printableRatio(value) {
  if (!value) return 0;
  const chars = [...value];
  const printable = chars.filter((char) => {
    const code = char.codePointAt(0);
    return code === 9 || code === 10 || (code >= 0x20 && code !== 0xfffd);
  });
  return printable.length / chars.length;
}

function tryBase64(value) {
  const compact = value.trim();
  if (compact.length < 6 || !B64_PATTERN.test(compact)) return null;
  const normalized = compact.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const decoded = Buffer.from(padded, 'base64');
  if (decoded.length < 3) return null;
  const textValue = decoded.toString('utf8');
  if (printableRatio(textValue) < 0.9) return null;
  return {
    kind: compact.includes('-') || compact.includes('_') ? 'base64url' : 'base64',
    value: textValue,
  };
}

function tryHex(value) {
  const compact = value.trim().replace(/^0x/i, '');
  if (!/^[0-9a-f]{8,}$/i.test(compact) || compact.length % 2 !== 0) return null;
  const decoded = Buffer.from(compact, 'hex').toString('utf8');
  if (printableRatio(decoded) < 0.9) return null;
  return { kind: 'hex', value: decoded };
}

function tryUrl(value) {
  if (!/%[0-9A-Fa-f]{2}/.test(value)) return null;
  try {
    const decoded = decodeURIComponent(value);
    return decoded === value ? null : { kind: 'urlencode', value: decoded };
  } catch {
    return null;
  }
}

export function decodeCandidate(value) {
  if (typeof value !== 'string') return [];
  const results = [];
  for (const decoder of [tryBase64, tryHex, tryUrl]) {
    try {
      const result = decoder(value);
      if (result) results.push(result);
    } catch {
      // Ignore malformed candidates.
    }
  }
  const first = results[0];
  if (first) {
    const nested = decodeCandidate(first.value);
    if (nested.length > 0) results.push({ kind: `${nested[0].kind}x2`, value: nested[0].value });
  }
  return results;
}

function collectHits(value, showAll, currentPath = '', hits = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectHits(item, showAll, `${currentPath}[${index}]`, hits));
    return hits;
  }
  if (!value || typeof value !== 'object') return hits;
  for (const [key, item] of Object.entries(value)) {
    const nextPath = currentPath ? `${currentPath}.${key}` : key;
    if (typeof item === 'string') {
      const likely = showAll || ID_KEY.test(key) || URL_KEY.test(key) || /^(?:Nz|eyJ|L2J|aHR0)/.test(item);
      if (!likely) continue;
      const decoded = decodeCandidate(item);
      if (decoded.length > 0) hits.push({ path: nextPath, key, original: item, decoded });
    } else {
      collectHits(item, showAll, nextPath, hits);
    }
  }
  return hits;
}

function printHits(hits) {
  if (hits.length === 0) {
    console.log('no decodable identifier fields found');
    return;
  }
  const grouped = new Map();
  for (const hit of hits) {
    const group = grouped.get(hit.key) || [];
    if (group.length < 3 && !group.some((item) => item.original === hit.original)) group.push(hit);
    grouped.set(hit.key, group);
  }
  for (const [key, items] of grouped) {
    console.log(`## ${key}`);
    for (const hit of items) {
      console.log(`- ${hit.path} = ${hit.original}`);
      for (const item of hit.decoded) console.log(`  - ${item.kind}: ${item.value.slice(0, 200)}`);
    }
  }
  console.log('');
  console.log('> Identifier decoders are heuristics. Verify each field against application behavior.');
}

const invokedAsScript = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedAsScript) {
  const args = process.argv.slice(2);
  const input = args[0];
  const showAll = args.includes('--all');
  if (!input) {
    console.error('usage: decode_ids.mjs <file.json|-> [--all]');
    process.exit(1);
  }
  try {
    const text = input === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(input, 'utf8');
    const data = JSON.parse(text);
    printHits(collectHits(data, showAll));
  } catch (error) {
    console.error(`failed to decode input: ${error.message}`);
    process.exit(2);
  }
}
