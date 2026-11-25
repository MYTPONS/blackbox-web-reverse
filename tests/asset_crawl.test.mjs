import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('inventories same-origin pages and assets', async () => {
  const server = http.createServer((request, response) => {
    if (request.url === '/') {
      response.setHeader('content-type', 'text/html');
      response.end('<html><head><script src="/app.js"></script></head><body><a href="/detail">Detail</a></body></html>');
      return;
    }
    if (request.url === '/detail') {
      response.setHeader('content-type', 'text/html');
      response.end('<html><title>Detail</title></html>');
      return;
    }
    if (request.url === '/app.js') {
      response.setHeader('content-type', 'application/javascript');
      response.end('fetch("/api/examples");');
      return;
    }
    response.statusCode = 404;
    response.end('not found');
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bwr-crawl-'));
  try {
    await execFileAsync(process.execPath, [
      'scripts/asset_crawl.mjs',
      `http://127.0.0.1:${address.port}/`,
      outDir,
      '--max-pages', '5',
      '--max-depth', '2',
      '--delay', '0',
    ]);
    const report = fs.readFileSync(path.join(outDir, 'CRAWL.md'), 'utf8');
    assert.match(report, /Pages: 2/);
    assert.match(report, /app\.js/);
    assert.ok(fs.existsSync(path.join(outDir, 'js', 'app.js')));
  } finally {
    server.close();
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});
