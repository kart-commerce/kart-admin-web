# kart-admin-web
Support Agent / Admin back-office console (Angular)

Internal, authenticated-only SPA for the platform's back-office operations — catalog/inventory
management, order & fulfillment-exception handling, customer support tooling, identity
administration, and audit/compliance reporting. See
`docs/client/kart-admin-web/*` in the `kart-platform` repo for the approved design package this
app is built against (requirement-spec, architecture, edge-cases, design-decisions, tickets).

**This app has no live backend to run against yet.** Every write screen calls
`kart-admin-service`'s approved `api-contract.yaml`, but that service's own repo is still an
initial commit (no controllers implemented). See the root-level completion summary for the full
list of what is and isn't runnable end-to-end today.

## Development

```bash
npm ci
npm run build:bff && npm run serve:bff   # BFF session-broker, localhost:4000 — required (see below)
npm start                                # ng serve, proxies /api/bff to the BFF (proxy.conf.json)
npm test                                 # unit tests (karma/jasmine)
npm run lint
npm run build
```

Every generated API client (`core/http/generated/**`) calls same-origin
`/api/bff/gateway/v1`, not `kart-api-gateway` directly — this app has no
public/anonymous surface (README's "internal, authenticated-only" scope), so
every call needs the BFF's token-relay proxy running to attach the session's
bearer token. Without the BFF up, every screen's API calls 401.

## BFF session-broker

Per `docs/client/security.md` §1, this CSR-only app's access/refresh token pair never reaches
the browser — a thin Express session-broker (`src/server/bff/`) holds it server-side (Redis),
the browser only ever holds an `HttpOnly`/`Secure`/`SameSite=Strict` session cookie. It also
proxies every generated client's Gateway call (`src/server/bff/gateway-proxy.ts`), attaching
that session's bearer token server-side. Build and run it with `npm run build && npm run serve:bff`.
