#!/usr/bin/env node
// Restore sourcesContent from a source map into a local directory.
// Usage:
//   node scripts/sourcemap_restore.mjs app.js.map ./src-restored
//   node scripts/sourcemap_restore.mjs https://app.example.test/assets/app.js.map ./src-restored
import fs from 'node:fs';
import path from 'node:path';

const [source, outDir = './src-restored'] = process.argv.slice(2);
if (!source) {
  console.error('usage: sourcemap_restore.mjs <file.map|file.js|url> [outdir]');
  process.exit(1);
}

async function load(location) {
  if (/^https?:\/\//i.test(location)) {
    const response = await fetch(location, {
      headers: { 'user-agent': 'blackbox-web-reverse/1.0' },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${location}`);
    return { text: await response.text(), base: new URL('.', location).href, remote: true };
  }
  const absolute = path.resolve(location);
  return { text: fs.readFileSync(absolute, 'utf8'), base: path.dirname(absolute), remote: false };
}

function safeRelative(sourceName, sourceRoot = '') {
  const normalized = String(sourceName)
    .replace(/^webpack:\/\//, '')
    .replace(/^file:\/\//, '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  const rooted = sourceRoot ? path.posix.join(String(sourceRoot).replace(/\\/g, '/'), normalized) : normalized;
  const cleaned = path.posix.normalize(rooted).replace(/^(\.\.\/)+/, '');
  if (path.posix.isAbsolute(cleaned) || cleaned === '..' || cleaned.startsWith('../')) {
    throw new Error(`unsafe source path: ${sourceName}`);
  }
  return cleaned || 'unknown.js';
}

async function main() {
  const loaded = await load(source);
  let mapText = loaded.text;

  if (!/"sources"\s*:/.test(mapText) || !/"mappings"\s*:/.test(mapText)) {
    const match = mapText.match(/\/\/[#@]\s*sourceMappingURL=([^\s]+)/);
    if (!match) throw new Error('no sourceMappingURL and content is not a source map');
    const mapLocation = /^https?:/i.test(source) ? new URL(match[1], source).href : path.resolve(String(loaded.base), match[1]);
    mapText = (await load(mapLocation)).text;
  }

  let map;
  try {
    map = JSON.parse(mapText);
  } catch (error) {
    throw new Error(`source map parse failed: ${error.message}`);
  }

  const sources = Array.isArray(map.sources) ? map.sources : [];
  const contents = Array.isArray(map.sourcesContent) ? map.sourcesContent : [];
  fs.mkdirSync(outDir, { recursive: true });

  let written = 0;
  let missing = 0;
  const report = [];

  for (let index = 0; index < sources.length; index += 1) {
    const relative = safeRelative(sources[index], map.sourceRoot || '');
    const destination = path.join(outDir, relative);
    const content = contents[index];
    if (typeof content !== 'string') {
      missing += 1;
      report.push(`missing ${relative}`);
      continue;
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);
    written += 1;
    report.push(`written ${relative} ${Buffer.byteLength(content)}B`);
  }

  console.log(`sources=${sources.length} written=${written} missing=${missing}`);
  console.log(`output=${path.resolve(outDir)}`);
  for (const line of report.slice(0, 200)) console.log(line);
  if (report.length > 200) console.log(`... ${report.length - 200} more`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(2);
});
