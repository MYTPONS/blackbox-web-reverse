import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeCandidate } from '../scripts/decode_ids.mjs';

test('decodes base64 and hex identifiers', () => {
  const base64 = decodeCandidate('MTIzNDU2');
  assert.equal(base64[0].kind, 'base64');
  assert.equal(base64[0].value, '123456');

  const hex = decodeCandidate('6578616d706c65');
  assert.equal(hex[0].kind, 'hex');
  assert.equal(hex[0].value, 'example');
});
