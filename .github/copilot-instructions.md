# Passport SPID – AI Coding Notes

## Big Picture
- Library exposes a Passport strategy that adapts SPID-on-SAML flows; `src/strategy.ts` orchestrates SAML requests via `@node-saml/passport-saml` while injecting SPID-specific rules.
- Runtime stack hinges on three layers: `SpidStrategy` (Passport glue), `SpidSAML` (`src/saml.ts`) overriding node-saml hooks, and XML wrappers (`src/request.ts`, `src/response.ts`, `src/sp-metadata.ts`) that reshape payloads to satisfy AgID specs.
- SP metadata and request signing always use the PEM without headers (`cleanPem` in `strategy.ts`); respect that when accepting certificates from config.

## Core Patterns
- Always derive request/response mutations through the XML helper (`src/xml.ts`) instead of manual string ops; new XML tweaks should follow the pattern in `SpidResponse.validate`.
- Request caching is mandatory: every authorize request stores the outbound XML and IDP issuer via `SpidConfig.cache`; assertion processing retrieves and deletes it. New flows must keep cache semantics (`set`, optional `expire`, eventual `delete`).
- SPID defaults live in `src/const.ts`; prefer adding to `SPID_FORCED_SAML_CONFIG`/`SPID_LEVELS` rather than inlining literals.
- Metadata additions should extend `SPMetadata.getSpidInfo`; billing vs public/private logic is encoded there—mirror that branching when adding nodes.
- Signature helpers (`src/sign.ts`, `src/signAuthRequest.ts`) standardise xml-crypto usage; use them rather than new `SignedXml` instances.

## Working Practices
- Source of truth is TypeScript under `src/`; do not edit the compiled `dist/` output—run `npm run build` to regenerate.
- Typings live in `src/types.ts`; new SPID attributes or config flags must start there so downstream consumers see them.
- Linting/formatting use ESLint + Prettier: run `npm run lint` and `npm run format` after major edits.
- `npm run dev` boots the sample app in `test/main.ts` for interactive debugging (TS execution via `ts-node-dev`, inspector on port 9229).
- `npm test` executes `test.sh`, which orchestrates Docker-based SPID conformance checks (`test/docker-compose.yml`). It needs Docker + the `ghcr.io/italia/spid-sp-test` and `italia/spid-compliant-certificates` images; expect runs to take several minutes.

## Integration Tips
- IDP metadata discovery uses `getIdentityProviders` with the binding tied to the configured `authnRequestBinding`; ensure new bindings are accounted for there.
- AuthnContext handling is sensitive: `SpidResponse.validate` enforces RAC comparison rules; adjust both the response validator and `SPID_LEVELS` when adding contexts.
- When exposing new public APIs, re-export them from `src/index.ts` so consumers get typed entry points.
- Keep logs/noise out of library code—`console` usage is confined to test harnesses.
