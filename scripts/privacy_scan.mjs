#!/usr/bin/env node
// Scan tracked text files for likely secrets and target-specific residue.
// Usage: node scripts/privacy_scan.mjs [repo-root]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_ROOT = '.';
const ALLOWED_HOSTS = new Set([
  'app.example.test',
  'example.test',
  'example.com',
  'www.example.com',
  'app.example.com',
  'example.org',
  'localhost',
  '127.0.0.1',
  'github.com',
  'www.github.com',
  'raw.githubusercontent.com',
  'nodejs.org',
  'owasp.org',
]);
const ALLOWED_EMAIL_DOMAINS = new Set(['example.test', 'example.com', 'example.org']);
const PUBLIC_IP = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const LOOPBACK = new Set(['127.0.0.1', '0.0.0.0', '255.255.255.255']);
const TEXT_EXTENSIONS = new Set(['.md', '.mjs', '.js', '.json', '.yaml', '.yml', '.sh', '.txt', '.html', '.css', '.cjs', '.ts']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'out', 'dist', 'coverage', '.pnpm-store']);
const SECRET_PATTERNS = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g],
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g],
  ['jwt', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ['bearer-literal', /\bBearer\s+(?!<redacted>)[A-Za-z0-9._~+/-]{20,}/g],
  ['literal-secret', /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"'<>]{12,}["']/gi],
];

function walk(rootDir) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) || entry.name === '.gitignore' || entry.name === '.editorconfig') {
        files.push(full);
      }
    }
  };
  visit(rootDir);
  return files;
}

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function hostFromUrl(raw) {
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function scanText(text, relativeFile = '<memory>') {
  const findings = [];
  const add = (rule, index, message) => findings.push({ file: relativeFile, line: lineNumber(text, index), rule, message });

  for (const [rule, pattern] of SECRET_PATTERNS) {
    for (const match of text.matchAll(pattern)) add(rule, match.index || 0, 'possible secret material');
  }

  for (const match of text.matchAll(PUBLIC_IP)) {
    const ip = match[0];
    if (LOOPBACK.has(ip)) continue;
    add('public-ip', match.index || 0, `public or private IPv4 literal: ${ip}`);
  }

  for (const match of text.matchAll(/https?:\/\/[^\s"'`<>)]*/g)) {
    const raw = match[0];
    if (raw.includes('${')) continue;
    const host = hostFromUrl(raw);
    if (!host) continue;
    if (!ALLOWED_HOSTS.has(host)) {
      add('unapproved-host', match.index || 0, `URL host is not an approved placeholder: ${host}`);
    }
  }

  for (const match of text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
    const domain = match[0].split('@')[1].toLowerCase();
    if (!ALLOWED_EMAIL_DOMAINS.has(domain)) {
      add('unapproved-email', match.index || 0, `email domain is not a placeholder: ${domain}`);
    }
  }

  if (/\/home\/[A-Za-z0-9._-]+\//.test(text)) {
    add('absolute-home-path', text.indexOf('/home/'), 'absolute home path may identify an operator');
  }

  return findings;
}

export function scanDirectory(rootDir = DEFAULT_ROOT) {
  const absoluteRoot = path.resolve(rootDir);
  const findings = [];
  for (const file of walk(absoluteRoot)) {
    const relative = path.relative(absoluteRoot, file);
    const text = fs.readFileSync(file, 'utf8');
    findings.push(...scanText(text, relative));
  }
  return findings;
}

const invokedAsScript = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedAsScript) {
  const root = process.argv[2] || DEFAULT_ROOT;
  const findings = scanDirectory(root);

  if (findings.length === 0) {
    console.log('privacy-scan: clean');
  } else {
    console.error(`privacy-scan: ${findings.length} finding(s)`);
    for (const finding of findings) {
      console.error(`${finding.file}:${finding.line}: ${finding.rule}: ${finding.message}`);
    }
    process.exit(1);
  }
}
