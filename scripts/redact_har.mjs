#!/usr/bin/env node
// Redact an authorized capture before storing or sharing it.
// Usage: node scripts/redact_har.mjs INPUT.json OUTPUT.json [--host app.example.test]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_HOST = 'app.example.test';
const SENSITIVE_KEY = new RegExp(
  '(?:^|[-_])(?:authorization|auth|cookie|set-cookie|token|access[_-]?token|refresh[_-]?token|' +
  'id[_-]?token|session|session[_-]?id|csrf|xsrf|api[_-]?key|apikey|secret|password|passwd|' +
  'signature|sign|jwt|bearer|credential|private[_-]?key)(?:$|[-_])',
  'i',
);
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?\d[\s-]?){10,15}/g;
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
const LONG_NUMBER_PATTERN = /\b\d{6,}\b/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;

export function isSensitiveKey(key) {
  return SENSITIVE_KEY.test(String(key));
}

function redactPrimitive(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(BEARER_PATTERN, 'Bearer <redacted>')
    .replace(JWT_PATTERN, '<redacted-jwt>')
    .replace(EMAIL_PATTERN, '<email>')
    .replace(UUID_PATTERN, '<id>')
    .replace(LONG_NUMBER_PATTERN, '<number>')
    .replace(PHONE_PATTERN, '<redacted-phone>');
}

export function redactUrl(value, placeholderHost = DEFAULT_HOST) {
  try {
    const url = new URL(String(value));
    url.protocol = 'https:';
    url.host = placeholderHost;
    url.hash = '';
    for (const [key, raw] of url.searchParams.entries()) {
      if (isSensitiveKey(key) || /token|key|secret|sig|auth/i.test(key)) {
        url.searchParams.set(key, 'REDACTED');
      } else {
        url.searchParams.set(key, redactPrimitive(raw));
      }
    }
    url.pathname = url.pathname
      .split('/')
      .map((segment) => (UUID_PATTERN.test(segment) || /^\d{6,}$/.test(segment) ? ':id' : segment))
      .join('/');
    return url.toString();
  } catch {
    return String(value)
      .replace(/https?:\/\/[^/\s]+/gi, `https://${placeholderHost}`)
      .replace(/[?&]([^=&\s]+)=([^&\s]+)/g, (all, key, raw) => {
        return isSensitiveKey(key) ? `&${key}=REDACTED` : `&${key}=${redactPrimitive(raw)}`;
      });
  }
}

export function redactValue(value, placeholderHost = DEFAULT_HOST) {
  if (Array.isArray(value)) return value.map((item) => redactValue(item, placeholderHost));
  if (!value || typeof value !== 'object') return redactPrimitive(value);
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (isSensitiveKey(key)) {
      result[key] = '<redacted>';
    } else if (key === 'url' && typeof item === 'string') {
      result[key] = redactUrl(item, placeholderHost);
    } else if (key === 'action' && typeof item === 'string') {
      result[key] = redactUrl(item, placeholderHost);
    } else {
      result[key] = redactValue(item, placeholderHost);
    }
  }
  return result;
}

export function redactText(value, placeholderHost = DEFAULT_HOST) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.stringify(redactValue(JSON.parse(value), placeholderHost));
  } catch {
    let text = redactPrimitive(value);
    text = text.replace(/https?:\/\/[^\s"'<>]+/g, (match) => redactUrl(match, placeholderHost));
    return text;
  }
}

function redactHeaders(headers, placeholderHost) {
  if (Array.isArray(headers)) {
    return headers.map((header) => {
      if (!header || typeof header !== 'object') return header;
      const name = header.name || '';
      return {
        ...header,
        value: isSensitiveKey(name) ? '<redacted>' : redactText(header.value, placeholderHost),
      };
    });
  }
  if (headers && typeof headers === 'object') {
    return Object.fromEntries(
      Object.entries(headers).map(([name, value]) => [
        name,
        isSensitiveKey(name) ? '<redacted>' : redactText(value, placeholderHost),
      ]),
    );
  }
  return headers;
}

export function redactCapture(input, placeholderHost = DEFAULT_HOST) {
  const data = structuredClone(input);

  if (data.log && Array.isArray(data.log.entries)) {
    data.log.entries = data.log.entries.map((entry) => {
      const request = entry.request || {};
      const response = entry.response || {};
      return {
        ...entry,
        request: {
          ...request,
          url: redactUrl(request.url || '', placeholderHost),
          headers: redactHeaders(request.headers, placeholderHost),
          cookies: [],
          queryString: [],
          postData: request.postData ? {
            ...redactValue(request.postData, placeholderHost),
            text: redactText(request.postData.text || '', placeholderHost),
          } : request.postData,
        },
        response: {
          ...response,
          url: response.url ? redactUrl(response.url, placeholderHost) : response.url,
          headers: redactHeaders(response.headers, placeholderHost),
          cookies: [],
          content: response.content ? {
            ...redactValue(response.content, placeholderHost),
            text: redactText(response.content.text || '', placeholderHost),
          } : response.content,
        },
      };
    });
    return data;
  }

  if (Array.isArray(data.requests)) {
    data.requests = data.requests.map((request) => {
      const next = redactValue(request, placeholderHost);
      if (typeof next.url === 'string') next.url = redactUrl(next.url, placeholderHost);
      if (next.headers) next.headers = redactHeaders(next.headers, placeholderHost);
      if (typeof next.body === 'string') next.body = redactText(next.body, placeholderHost);
      return next;
    });
  }

  if (Array.isArray(data.frames)) {
    data.frames = data.frames.map((frame) => ({
      ...frame,
      data: redactText(frame.data || '', placeholderHost),
    }));
  }

  if (typeof data.targetUrl === 'string') data.targetUrl = redactUrl(data.targetUrl, placeholderHost);
  if (data.page) data.page = redactValue(data.page, placeholderHost);
  return data;
}

const invokedAsScript = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedAsScript) {
  const input = process.argv[2];
  const output = process.argv[3];
  const hostIndex = process.argv.indexOf('--host');
  const placeholderHost = hostIndex >= 0 ? process.argv[hostIndex + 1] : DEFAULT_HOST;

  if (!input || !output) {
    console.error('usage: redact_har.mjs INPUT.json OUTPUT.json [--host app.example.test]');
    process.exit(1);
  }

  try {
    const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
    const redacted = redactCapture(raw, placeholderHost);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(redacted, null, 2));
    console.log(`redacted=${path.resolve(output)}`);
    console.log(`host=${placeholderHost}`);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}
