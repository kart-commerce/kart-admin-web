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
npm start          # ng serve, proxies /v1 to a local kart-api-gateway (proxy.conf.json)
npm test           # unit tests (karma/jasmine)
npm run lint
npm run build
```

## BFF session-broker

Per `docs/client/security.md` §1, this CSR-only app's access/refresh token pair never reaches
the browser — a thin Express session-broker (`src/server/bff/`) holds it server-side (Redis),
the browser only ever holds an `HttpOnly`/`Secure`/`SameSite=Strict` session cookie. Build and
run it with `npm run build && npm run serve:bff`.
