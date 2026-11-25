import test from 'node:test';
import assert from 'node:assert/strict';
import { scanText } from '../scripts/privacy_scan.mjs';

test('accepts reserved example hosts', () => {
  const findings = scanText('https://app.example.test/api/examples\nreader@example.test');
  assert.deepEqual(findings, []);
});

test('rejects unapproved hosts, public IPs, and unapproved emails', () => {
  const badHost = ['https://', 'target', '.example', '.net'].join('');
  const publicIp = ['203', '0', '113', '10'].join('.');
  const badEmail = ['user', 'real-domain.com'].join('@');
  const findings = scanText(`${badHost}\n${publicIp}\n${badEmail}`);
  assert.ok(findings.some((item) => item.rule === 'unapproved-host'));
  assert.ok(findings.some((item) => item.rule === 'public-ip'));
  assert.ok(findings.some((item) => item.rule === 'unapproved-email'));
});
