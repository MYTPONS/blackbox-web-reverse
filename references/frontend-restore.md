# Frontend restoration

## 1. Rendering modes

| Mode | Public evidence | Approach |
|---|---|---|
| Traditional MPA | Full HTML per URL, form actions | Read HTML and forms |
| SPA | Empty app root, large entry bundle | Inventory routes and chunks |
| SSR/SSG | Inline state or hydrated HTML | Read serialized state first |
| Micro-frontend | Multiple independent entry bundles | Map each remote and its lifecycle |
| Hybrid | SSR shell plus client chunks | Reconcile both sources |

Do not label a framework from a single minified identifier. Record at least one concrete artifact and one behavior.

## 2. Source maps

If a map is public:

```bash
node scripts/sourcemap_restore.mjs \
  https://app.example.test/assets/app.js.map ./src-restored
```

Record:

- map URL and HTTP status;
- `sources`, `sourceRoot`, and whether `sourcesContent` exists;
- original file extension and build path;
- any missing content and why.

Source maps are public evidence only when the owner has made them public and their use is within scope.

## 3. Bundle inventory

```bash
node scripts/asset_crawl.mjs https://app.example.test ./out \
  --max-pages 20 --max-depth 2 --delay 1000
node scripts/extract_endpoints.mjs ./out/js > ./out/ENDPOINTS.md
```

Create a page → chunk table:

| Page | Entry chunk | Lazy chunks | Loaded on | API calls | Evidence |
|---|---|---|---|---|---|
| `/examples` | `app.[hash].js` | `list.[hash].js` | navigation | `GET /api/examples` | `req-012` |

## 4. Routes and state

Safe runtime probes are read-only. Prefer documented framework hooks:

- Vue: router route definitions;
- React: route configuration and DevTools fiber tree;
- Next.js: `__NEXT_DATA__` or RSC payload;
- Nuxt: `window.__NUXT__`;
- webpack: runtime chunk-name maps.

Do not mutate a store or permission list to reveal hidden screens. Record the gate and the required authorization instead.

## 5. Deobfuscation

Only deobfuscate artifacts you are authorized to inspect.

```bash
npx webcrack ./out/js/app.js -o ./deob
```

Prioritize:

1. request construction;
2. route registration;
3. error mapping;
4. state hydration;
5. permission gates.

Stop when the behavior is documented. A full “original source” is not the goal.

## 6. Frontend map output

```md
## Route map
- `/examples` → `ExampleListPage` → `GET /api/examples`
- `/examples/:id` → `ExampleDetailPage` → `GET /api/examples/:id`

## State
- `session`: user id, roles, expiry
- `exampleFilters`: query, page, sort
- global interceptor: request id, 401 redirect, normalized errors

## Gaps
- `unverified`: server-side sorting rules
- `unverified`: cache invalidation after edit
```
