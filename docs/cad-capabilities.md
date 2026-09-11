# CAD capabilities boundary

`GET /api/cad/capabilities` returns static metadata qualification status under the existing API CORS and request-body policy. Responses use `Cache-Control: no-store`.

`enabled: false` and `routeMounted: false` describe hosted CAD processing. Only the capabilities endpoint is mounted; no import route is added. Environment flags cannot activate processing in this slice. The module has no imports, runtime probes, file access, or execution adapters.

The metadata qualification was recorded at evidence commit `8ab9edfeb0825bd57091ecaf3c0acbf904596582`, for implementation commit `bf80b32777d22be822db0fca095af0e89ea515e5`. This is historical evidence from the research branch, not a check performed by the endpoint or code included in this slice. Its recorded outcome was successful bounded metadata execution, observed guest restrictions, exact-ID cleanup, and an unchanged pre-existing container inventory. Private evidence is excluded from this change.

The response separates that limited proof from unproven hosted processing, identity/store/executor adapters, native import, supplied-file processing, provider integration, failure-independent expiry, deployment, and production activation. Each broader execution step requires explicit approval. No environment setting grants that approval.

Validation: `node --test scripts/cad-readiness.test.js`, `npm run typecheck`, and `git diff --check`. The focused test uses loopback HTTP with provider/commercial modules stubbed, checks the server's existing CORS policy, rejects import requests, and guards the source boundary and public diff. It performs no CAD or provider work.
