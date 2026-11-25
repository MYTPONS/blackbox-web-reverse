# Framework recipes

Use these as hypotheses, not conclusions. Record the artifact and behavior that support each one.

## Fingerprint table

| Observable | Likely family | Public place to inspect |
|---|---|---|
| `__NEXT_DATA__`, `self.__next_f`, `_next/` | Next.js | HTML state, `_next` chunks, build manifest if public |
| `__NUXT__`, `_nuxt/` | Nuxt | serialized state, chunk map |
| `__vue_app__`, `Vue.createApp` | Vue | router and store boundaries |
| `__REACT_DEVTOOLS_GLOBAL_HOOK__` | React | route/component tree |
| `webpackChunk`, `__webpack_require__` | webpack | runtime chunk map |
| `import.meta.url`, `__vite__` | Vite | modulepreload and dynamic imports |
| `Whitelabel Error Page` | Spring Boot | documented actuator/OpenAPI only |
| `Whoops` | Laravel | error page behavior |
| `{"detail":"Not Found"}` | FastAPI/Django REST | public OpenAPI schema |
| `Route GET ... not found` | PHP/Go-style router | route error contract |

## Next.js

- Pages Router: inline `__NEXT_DATA__`, `_buildManifest.js` if public.
- App Router: route-segmented chunks under `_next/static/chunks/app/`.
- API routes may be local route handlers or a reverse proxy; verify with response headers and server behavior.

## Nuxt

- Serialized state in `window.__NUXT__`.
- Public build metadata under `_nuxt/`.
- Route and payload structure may be available in the initial HTML.

## Vite

- ESM chunks under `assets/`.
- `modulepreload` reveals static dependencies.
- Dynamic imports reveal route boundaries.
- Do not access filesystem paths outside the web root.

## webpack

- Runtime chunk-name mapping.
- `webpackChunk*` arrays can reveal chunk identifiers.
- Map entry and lazy chunks to user flows.

## Spring Boot

- Use only documented/public OpenAPI or actuator endpoints in scope.
- Record error envelope and validation behavior.
- Do not enumerate sensitive actuator endpoints.

## Laravel / PHP

- Observe validation envelopes and form fields.
- Record CSRF requirements.
- Do not attempt credential guessing or debug-page exploitation.

## Django / FastAPI

- Use public schema/docs only when the owner permits it.
- Record schema version and nullability.
- Do not enumerate admin endpoints or sensitive settings.

## RuoYi-like admin scaffolds

- Common route/menu and permission-code formats are useful for navigation.
- Use an approved account; do not test default passwords or bypass login.
- Record the permission model and inaccessible areas.

## Official client packages

If the owner publishes a client package:

```bash
tar tzf package.tgz
tar xzf package.tgz -C ./package
```

Inspect documented `README`, `openapi`, client transport, and error schemas. Do not publish private build keys or extracted proprietary code.
