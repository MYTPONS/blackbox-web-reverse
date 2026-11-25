// Multi-source adapter blueprint.
// Replace placeholders and implement only capabilities that are documented by evidence.

export const name = 'example-adapter';
export const baseUrl = 'https://app.example.test';

export const sources = [
  {
    id: 'source-a',
    label: 'Source A',
    capabilities: { search: true, detail: true, realtime: false },
    p95Ms: 800,
  },
  {
    id: 'source-b',
    label: 'Source B',
    capabilities: { search: true, detail: false, realtime: false },
    p95Ms: 2000,
  },
];

export const codecs = {
  'source-a': {
    decode: (id) => Buffer.from(id, 'base64url').toString('utf8'),
    encode: (raw) => Buffer.from(String(raw)).toString('base64url'),
  },
};

const isOk = (payload) => payload && (payload.code === 0 || payload.code === '0');

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`upstream_http_${response.status}`);
  }
  return response.json();
}

export async function search({ query, page = 1, source }) {
  const data = await request(
    `/api/search?q=${encodeURIComponent(query)}&page=${page}&source=${encodeURIComponent(source)}`,
  );
  if (!isOk(data)) throw new Error(`search_failed:${data?.error?.code || 'unknown'}`);
  return (data.data?.items || []).map((item) => ({
    id: item.id,
    title: item.title,
    source,
  }));
}

export async function detail({ id, source }) {
  const data = await request(`/api/items/${encodeURIComponent(id)}?source=${encodeURIComponent(source)}`);
  if (!isOk(data) || !data.data?.id) throw new Error(`detail_empty:${source}`);
  return data.data;
}

export async function searchAll({ query, page = 1, onSourceError }) {
  const usable = sources.filter((source) => source.capabilities.search);
  const settled = await Promise.allSettled(
    usable.map((source) => search({ query, page, source: source.id })),
  );

  const items = [];
  const report = [];

  settled.forEach((result, index) => {
    const source = usable[index];
    if (result.status === 'fulfilled') {
      items.push(...result.value);
      report.push({ source: source.id, ok: true, count: result.value.length });
      return;
    }

    report.push({ source: source.id, ok: false, error: String(result.reason?.message || result.reason) });
    onSourceError?.(source, result.reason);
  });

  return { items, report };
}
