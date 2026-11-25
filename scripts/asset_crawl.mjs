#!/usr/bin/env node
// Same-origin, rate-limited inventory of HTML pages and their static assets.
// Usage: node scripts/asset_crawl.mjs https://app.example.test ./out \
//          [--max-pages 20] [--max-depth 2] [--delay 1000] [--map]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const baseArg = args[0];
if (!baseArg) {
  console.error('usage: asset_crawl.mjs BASE OUTDIR [--max-pages N] [--max-depth N] [--delay MS] [--map]');
  process.exit(1);
}

const base = new URL(baseArg);
if (!['http:', 'https:'].includes(base.protocol)) {
  console.error('BASE must be http(s)');
  process.exit(2);
}

const outDir = args[1] || './out';
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? Number(args[index + 1]) : fallback;
};
const maxPages = Math.max(1, option('--max-pages', 20));
const maxDepth = Math.max(0, option('--max-depth', 2));
const delayMs = Math.max(0, option('--delay', 1000));
const fetchMaps = args.includes('--map');
const timeoutMs = Math.max(1000, option('--timeout', 20000));
const maxBytes = Math.max(64 * 1024, option('--max-bytes', 5 * 1024 * 1024));
const userAgent = 'blackbox-web-reverse/1.0 (+authorized research)';

const origin = base.origin;
const queue = [{ url: base.href, depth: 0 }];
const seenPages = new Set();
const fetchedAssets = new Set();
const thirdParty = new Set();
const pages = [];
const assets = [];
const maps = [];
const frameworkHits = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function slug(url) {
  const parsed = new URL(url);
  const raw = `${parsed.pathname === '/' ? 'index' : parsed.pathname.replace(/^\/+/, '')}${parsed.search ? '_' + parsed.search.slice(1) : ''}`;
  return raw.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 140) || 'index';
}

function isAssetUrl(url) {
  try {
    const parsed = new URL(url);
    return /\.(?:m?js|css|map|woff2?|ttf|otf|json|wasm)(?:\?|$)/i.test(parsed.pathname + parsed.search);
  } catch {
    return false;
  }
}

function isPageUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== origin) return false;
    if (isAssetUrl(parsed.href)) return false;
    return !/^\/(?:api|_next\/static|assets|static|public)\//i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function addPage(raw, from, depth) {
  try {
    const url = new URL(raw, from);
    url.hash = '';
    if (!isPageUrl(url.href)) return;
    if ([...seenPages].some((seen) => new URL(seen).href === url.href)) return;
    if (queue.some((item) => new URL(item.url).href === url.href)) return;
    if (depth <= maxDepth) queue.push({ url: url.href, depth });
  } catch {
    // Ignore malformed links.
  }
}

function extractPageLinks(html, pageUrl, depth) {
  const found = new Set();
  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
    try {
      const url = new URL(match[1], pageUrl);
      url.hash = '';
      if (url.origin === origin) addPage(url.href, pageUrl, depth);
      else if (/^https?:$/.test(url.protocol)) thirdParty.add(url.origin);
    } catch {
      // Ignore malformed links.
    }
  }
}

function extractAssets(html, pageUrl) {
  const result = new Set();
  for (const match of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) result.add(match[1]);
  for (const match of html.matchAll(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    if (/rel\s*=\s*["'](?:stylesheet|modulepreload|preload)["']/i.test(match[0])) result.add(match[1]);
  }
  const urls = [];
  for (const raw of result) {
    try {
      const url = new URL(raw, pageUrl);
      if (url.origin !== origin) {
        thirdParty.add(url.origin);
        continue;
      }
      url.hash = '';
      urls.push(url.href);
    } catch {
      // Ignore malformed resources.
    }
  }
  return urls;
}

function classify(url) {
  const parsed = new URL(url);
  if (/\.map(?:\?|$)/i.test(parsed.pathname + parsed.search)) return 'maps';
  if (/\.m?js(?:\?|$)/i.test(parsed.pathname + parsed.search)) return 'js';
  if (/\.css(?:\?|$)/i.test(parsed.pathname + parsed.search)) return 'css';
  if (/\.(?:woff2?|ttf|otf)(?:\?|$)/i.test(parsed.pathname + parsed.search)) return 'fonts';
  return 'other';
}

function fingerprint(text) {
  const patterns = {
    'Next.js': /__NEXT_DATA__|self\.__next_f|_next\//,
    'Nuxt': /__NUXT__|_nuxt\//,
    'Vite': /__vite__|import\.meta\.url/,
    'webpack': /webpackChunk|__webpack_require__/,
    'Vue': /__vue_app__|__vue__|Vue\.createApp/,
    'React': /__REACT_DEVTOOLS_GLOBAL_HOOK__|react-dom/,
    'Angular': /ng-version|@angular/,
    'Svelte': /svelte-/,
    'WASM': /WebAssembly\.(?:instantiate|compile)/,
  };
  for (const [name, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) frameworkHits.set(name, (frameworkHits.get(name) || 0) + 1);
  }
}

async function get(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': userAgent, accept: '*/*' },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > maxBytes) {
    throw new Error(`response_too_large:${buffer.byteLength}`);
  }
  return {
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    finalUrl: response.url,
    buffer,
  };
}

async function saveAsset(url) {
  if (fetchedAssets.has(url)) return null;
  fetchedAssets.add(url);
  try {
    const result = await get(url);
    const dir = classify(url);
    const filename = slug(url);
    const file = path.join(dir, filename);
    fs.mkdirSync(path.join(outDir, dir), { recursive: true });
    fs.writeFileSync(path.join(outDir, file), result.buffer);
    const item = { url, ...result, file };
    assets.push(item);
    if (dir === 'maps') maps.push(item);
    if (dir === 'js') fingerprint(result.buffer.toString('utf8'));
    return item;
  } catch (error) {
    assets.push({ url, error: String(error.message || error) });
    return null;
  }
}

for (const dir of ['html', 'js', 'css', 'maps', 'fonts', 'other']) {
  fs.mkdirSync(path.join(outDir, dir), { recursive: true });
}

while (queue.length > 0 && pages.length < maxPages) {
  const current = queue.shift();
  if (seenPages.has(current.url)) continue;
  seenPages.add(current.url);

  let result;
  try {
    result = await get(current.url);
  } catch (error) {
    pages.push({ url: current.url, depth: current.depth, error: String(error.message || error) });
    await sleep(delayMs);
    continue;
  }

  const html = result.buffer.toString('utf8');
  const title = (html.match(/<title[^>]*>([^<]*)/i) || [null, ''])[1].trim();
  const file = path.join('html', `${slug(current.url)}.html`);
  fs.writeFileSync(path.join(outDir, file), result.buffer);
  fingerprint(html);

  const pageAssets = extractAssets(html, result.finalUrl);
  const pageMaps = [];
  for (const assetUrl of pageAssets) {
    if (!isAssetUrl(assetUrl)) continue;
    const saved = await saveAsset(assetUrl);
    if (saved?.file) {
      pageMaps.push(saved.file);
      if (saved.file.startsWith('js/')) {
        const text = saved.buffer.toString('utf8');
        for (const match of text.matchAll(/\/\/[#@]\s*sourceMappingURL=([^\s]+)/g)) {
          try {
            const mapUrl = new URL(match[1], assetUrl).href;
            if (new URL(mapUrl).origin === origin) pageMaps.push(mapUrl);
            if (fetchMaps && new URL(mapUrl).origin === origin) await saveAsset(mapUrl);
          } catch {
            // Ignore malformed map references.
          }
        }
      }
    }
    await sleep(delayMs);
  }

  extractPageLinks(html, result.finalUrl, current.depth + 1);
  pages.push({ url: current.url, depth: current.depth, status: result.status, title, file, assets: pageMaps });
  await sleep(delayMs);
}

const lines = [];
lines.push(`# Asset crawl: ${origin}`);
lines.push('');
lines.push(`Pages: ${pages.length}; assets: ${assets.length}; third-party origins: ${thirdParty.size}`);
lines.push('');
lines.push('## Page → asset map');
for (const page of pages) {
  lines.push(`- ${page.url} [${page.status ?? 'ERR'}]${page.title ? ` — ${page.title}` : ''}`);
  for (const asset of page.assets || []) lines.push(`  - ${asset}`);
  if (page.error) lines.push(`  - error: ${page.error}`);
}
lines.push('');
lines.push('## Framework fingerprints');
if (frameworkHits.size === 0) lines.push('- none');
for (const [name, count] of [...frameworkHits.entries()].sort((a, b) => b[1] - a[1])) {
  lines.push(`- ${name}: ${count}`);
}
lines.push('');
lines.push('## Source maps');
if (maps.length === 0) lines.push('- none discovered');
for (const map of maps) lines.push(`- ${map.url} → ${map.file}`);
lines.push('');
lines.push('## Third-party origins');
if (thirdParty.size === 0) lines.push('- none');
for (const item of [...thirdParty].sort()) lines.push(`- ${item}`);
lines.push('');
lines.push('## Asset inventory');
for (const asset of assets) {
  lines.push(`- ${asset.url}${asset.status ? ` [${asset.status}]` : ''}${asset.file ? ` → ${asset.file}` : ''}${asset.error ? ` error=${asset.error}` : ''}`);
}

fs.writeFileSync(path.join(outDir, 'CRAWL.md'), lines.join('\n'));
console.log(`pages=${pages.length} assets=${assets.length} maps=${maps.length}`);
console.log(`report=${path.resolve(outDir, 'CRAWL.md')}`);
