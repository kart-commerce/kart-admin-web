# core/http/generated

Typed HTTP clients for every backend contract this app calls, one folder per service
(`admin/v1`, `order/v1`, `payment/v1`, `analytics/v1`, `order-returns/v1`, `ai-assistant/v1`,
plus `category/v1`/`product/v1`/`search/v1`/`inventory/v1`/`user/v1`), mirroring
kart-web's `core/http/generated/category/v1` pattern — one Angular service per contract,
models typed 1:1 against each contract's schemas, injected via `GATEWAY_BASE_PATH`
(`../base-path.ts`) rather than a hardcoded base URL.

**Provenance note (deviation from kart-web, flagged for transparency):** kart-web's
category client is produced by `openapi-generator-cli` (`typescript-angular` generator),
regenerated in CI via `kart-devops`'s `openapi-client-codegen.yml` reusable workflow. That
generator is Java-based; this development environment has no JVM and no network access to
one, so the clients under this folder are **hand-authored in the same shape** the generator
would produce (one service class per contract, `Observable<T>` methods matching each
operation, models matching each schema 1:1) rather than machine-generated. They are not
wrapped in the generator's own scaffolding (`configuration.ts`'s credential-lookup system,
`encoder.ts`, `.openapi-generator/` metadata, `git_push.sh`) since fabricating those files
without the tool actually having run would misrepresent their provenance — this app's CI
(`.github/workflows/ci.yml`) still wires up the same reusable codegen-verification workflow
kart-web uses per contract, for the environment where the real toolchain is available; the
first real CI run may show a diff against these hand-authored files that needs reconciling.
