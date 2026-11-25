#!/usr/bin/env node
// Capture an authorized Chromium session over CDP.
// Usage:
//   node scripts/cdp_capture.mjs URL OUT.json
//   node scripts/cdp_capture.mjs URL OUT.json --port 9222
//   node scripts/cdp_capture.mjs URL OUT.json --wait 8000 --scroll

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const targetPage = args[0];
const outFile = args[1] || './session.json';

if (!targetPage) {
  console.error('usage: cdp_capture.mjs URL OUT.json [--port N] [--wait MS] [--scroll] [--keep-open]');
  process.exit(1);
}

const getOption = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? Number(args[index + 1]) : fallback;
};

const hasFlag = (name) => args.includes(name);
const waitMs = Math.max(1000, getOption('--wait', 6000));
const debugPort = getOption('--port', null);
const doScroll = hasFlag('--scroll');
const keepOpen = hasFlag('--keep-open');
const maxBody = Math.max(256, getOption('--max-body', 4096));
const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36';

if (typeof WebSocket === 'undefined') {
  console.error('WebSocket is unavailable. Use Node.js 22+ or pass --experimental-websocket.');
  process.exit(2);
}

const chromeCandidates = [
  process.env.CHROME_PATH,
  path.join(os.homedir(), '.cache/ms-playwright/chromium-1255/chrome-linux64/chrome'),
  path.join(os.homedir(), '.cache/ms-playwright/chromium-1254/chrome-linux64/chrome'),
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
].filter(Boolean);

function findChrome() {
  return chromeCandidates.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  });
}

async function launchChrome() {
  if (debugPort) {
    return { port: Number(debugPort), process: null, profile: null };
  }

  const binary = findChrome();
  if (!binary) {
    throw new Error('Chrome not found. Set CHROME_PATH or pass --port N.');
  }

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bwr-'));
  const child = spawn(binary, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    `--user-agent=${userAgent}`,
    '--window-size=1440,900',
    'about:blank',
  ], { stdio: 'ignore' });

  const activePort = path.join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (fs.existsSync(activePort)) {
      const [port] = fs.readFileSync(activePort, 'utf8').split('\n');
      return { port: Number(port), process: child, profile };
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  child.kill('SIGKILL');
  fs.rmSync(profile, { recursive: true, force: true });
  throw new Error('Chrome did not expose a CDP port in time.');
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

async function main() {
  const chrome = await launchChrome();
  try {
    const version = await fetchJson(`http://127.0.0.1:${chrome.port}/json/version`);
    const target = await fetchJson(`http://127.0.0.1:${chrome.port}/json/new?about:blank`);
    const socket = new WebSocket(target.webSocketDebuggerUrl);

    const record = {
      schemaVersion: 1,
      targetUrl: targetPage,
      startedAt: new Date().toISOString(),
      browser: version.Browser,
      requests: [],
      frames: [],
      console: [],
    };

    let sequence = 0;
    let socketId = 0;
    const pending = new Map();

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && pending.has(message.id)) {
        const entry = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result);
        return;
      }

      const params = message.params || {};
      switch (message.method) {
        case 'Network.requestWillBeSent':
          record.requests.push({
            id: ++sequence,
            method: params.request.method,
            url: params.request.url,
            headers: params.request.headers,
            body: params.request.postData ? params.request.postData.slice(0, maxBody) : null,
            initiator: params.initiator,
            timestamp: params.timestamp,
          });
          break;
        case 'Network.webSocketCreated':
          record.requests.push({ kind: 'websocket-created', url: params.url, timestamp: params.timestamp });
          break;
        case 'Network.webSocketHandshakeResponseReceived':
          record.requests.push({
            kind: 'websocket-handshake',
            url: params.webSocket ? params.webSocket.url : '',
            status: params.response ? params.response.status : null,
            headers: params.response ? params.response.headers : null,
            timestamp: params.timestamp,
          });
          break;
        case 'Network.webSocketFrameSent':
        case 'Network.webSocketFrameReceived':
          record.frames.push({
            kind: message.method.endsWith('Sent') ? 'sent' : 'received',
            url: params.webSocket ? params.webSocket.url : '',
            timestamp: params.timestamp,
            data: String(params.response ? params.response.payloadData : '').slice(0, maxBody),
          });
          break;
        case 'Runtime.consoleAPICalled':
          record.console.push({
            type: params.type,
            args: (params.args || []).map((item) => item.value ?? item.description ?? item.type),
          });
          break;
        default:
          break;
      }
    });

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++socketId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });

    await send('Network.enable');
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setUserAgentOverride', { userAgent });
    await send('Page.navigate', { url: targetPage });
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    if (doScroll) {
      await send('Runtime.evaluate', {
        expression: `(async () => {
          const root = document.scrollingElement;
          for (let i = 0; i < 8; i += 1) {
            root.scrollTop += root.clientHeight;
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        })()`,
        awaitPromise: true,
      });
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 3000)));
    }

    const probe = await send('Runtime.evaluate', {
      expression: `(() => ({
        title: document.title,
        url: location.href,
        forms: [...document.forms].map((form) => ({
          action: form.action,
          method: form.method,
          inputs: [...form.elements].map((input) => ({ name: input.name, type: input.type }))
        })),
        scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
        globals: ['__NEXT_DATA__', '__NUXT__', '__APOLLO_STATE__', '__vue_app__', 'webpackChunk', 'React', 'Vue']
          .filter((key) => key in window)
      }))()`,
      returnByValue: true,
    });

    record.page = probe && probe.result ? probe.result.value : null;
    record.finishedAt = new Date().toISOString();

    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(record, null, 2));
    fs.writeFileSync(
      outFile.replace(/\.json$/i, '') + '.summary.txt',
      [
        `target=${targetPage}`,
        `browser=${record.browser}`,
        `requests=${record.requests.length}`,
        `pages=${record.page ? 1 : 0}`,
        `websocketFrames=${record.frames.length}`,
      ].join('\n'),
    );

    socket.close();
    console.log(`capture=${path.resolve(outFile)}`);
    console.log(`requests=${record.requests.length} frames=${record.frames.length}`);
  } finally {
    if (chrome.process && !keepOpen) chrome.process.kill('SIGKILL');
    if (chrome.profile && !keepOpen) fs.rmSync(chrome.profile, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(2);
});
