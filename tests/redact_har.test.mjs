import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { redactCapture, redactText, redactUrl } from '../scripts/redact_har.mjs';

test('redacts HAR headers, hosts, identifiers, and tokens', () => {
  const input = JSON.parse(fs.readFileSync('fixtures/har/sample.json', 'utf8'));
  input.log.entries[0].request.headers.push({ name: 'Cookie', value: 'session=example' });
  const output = redactCapture(input);

  const request = output.log.entries[0].request;
  assert.equal(request.headers[0].value, 'application/json');
  assert.equal(request.headers[1].value, '<redacted>');
  assert.equal(request.headers[2].value, '<redacted>');
  assert.equal(request.cookies.length, 0);
  assert.match(request.url, /^https:\/\/app\.example\.test\/api\/examples\/:id\?/);
  const parsed = new URL(request.url);
  assert.equal(parsed.searchParams.get('token'), 'REDACTED');
  assert.equal(parsed.searchParams.get('page'), '2');
});

test('redacts custom capture fields and text payloads', () => {
  const input = {
    targetUrl: 'https://app.example.test/account/123456?token=abc',
    requests: [
      {
        method: 'POST',
        url: 'https://app.example.test/api/users/123456',
        headers: { Authorization: 'Bearer test', 'x-request-id': 'abc' },
        body: JSON.stringify({ email: 'reader@example.test', token: 'abc', name: 'Example' }),
      },
    ],
    frames: [{ kind: 'received', data: '{"token":"abc","value":"ok"}' }],
    page: { forms: [{ action: 'https://app.example.test/api/users/123456', method: 'post' }] },
  };
  const output = redactCapture(input);

  assert.equal(output.requests[0].headers.Authorization, '<redacted>');
  assert.equal(output.requests[0].headers['x-request-id'], 'abc');
  assert.match(output.requests[0].url, /\/api\/users\/:id$/);
  assert.match(output.requests[0].body, /<email>/);
  assert.match(output.requests[0].body, /<redacted>/);
  assert.equal(output.page.forms[0].action, 'https://app.example.test/api/users/:id');
  assert.match(output.frames[0].data, /<redacted>/);
});

test('redacts URLs and common secrets', () => {
  const url = redactUrl('http://app.example.test/path/123456?sign=abc&page=3');
  assert.match(url, /^https:\/\/app\.example\.test\/path\/:id\?/);
  assert.equal(new URL(url).searchParams.get('sign'), 'REDACTED');
  const text = redactText('contact reader@example.test at https://app.example.test/x?token=abc');
  assert.match(text, /<email>/);
  assert.match(text, /token=REDACTED/);
});
