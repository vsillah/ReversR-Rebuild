# CAD capabilities boundary

`GET /api/cad/capabilities` returns static metadata qualification status under the existing API CORS and request-body policy. Responses use `Cache-Control: no-store`.

`enabled: false` and `routeMounted: false` describe hosted CAD processing. Only the capabilities endpoint is mounted; no import route is added. Environment flags cannot activate processing in this slice. The module has no imports, runtime probes, file access, or execution adapters.

The metadata qualification was recorded at evidence commit `8ab9edfeb0825bd57091ecaf3c0acbf904596582`, for implementation commit `bf80b32777d22be822db0fca095af0e89ea515e5`. This is historical evidence from the research branch, not a check performed by the endpoint or code included in this slice. Its recorded outcome was successful bounded metadata execution, observed guest restrictions, exact-ID cleanup, and an unchanged pre-existing container inventory. Private evidence is excluded from this change.

The response separates that limited proof from unproven hosted processing, identity/store/executor adapters, native import, supplied-file processing, provider integration, failure-independent expiry, deployment, and production activation. Each broader execution step requires explicit approval. No environment setting grants that approval.

Validation: `node --test scripts/cad-readiness.test.js`, `npm run typecheck`, and `git diff --check`. The focused test uses loopback HTTP with provider/commercial modules stubbed, checks the server's existing CORS policy, rejects import requests, and guards the source boundary and public diff. It performs no CAD or provider work.

## Hosted activation assessment (2026-09-11)

Decision: keep processing disabled. This assessment starts from `bb09301`; it does not establish that serverless CAD is impossible. It establishes that the inspected code does not yet provide a qualified hosted conversion path.

Current production-shaped code uses the existing Express app through the catch-all API entrypoint. The capabilities response is static and cannot be activated by an environment flag. No CAD upload client or processing route is connected by this slice.

The package manifest already declares `occt-import-js` and the installed reference package contains a roughly 7.3 MiB WASM asset. Package availability alone does not prove deployed asset tracing, bounded execution, or correct source geometry. No deployment bundle or hosted conversion was executed in this assessment.

The reference branch separates two paths:

- The local importer uses subprocess execution and operating-system memory polling. Its service explicitly rejects hosted execution. Moving that route into the API would violate this slice's execution constraints.
- The source-faithful reader verifies a separate pinned JS/WASM artifact, admits only explicit trims on affine surfaces with straight boundaries, and validates trim, adjacent-vertex, and source-construction receipts. It also depends on local staged assets and per-call authorization ledgers. The stock package is not demonstrated to be equivalent to that reader.

The reference processor also imports the research source pipeline, which contains private fixture bindings. It cannot be copied into the public request dependency graph. The hosted job adapter's synthetic contract tests are not evidence of a real geometry conversion.

### Smallest viable next slice

Prepare a public-safe, bytes-in/validated-results-out core around the qualified artifact and its supported-source admission checks. Preserve deterministic render, STL and source-confidence validation. Package licensed, pinned assets explicitly. Run it in an independently terminable worker with enforced input, memory, output, concurrency and wall-clock limits; a timeout promise around synchronous WASM is insufficient. Prove a generated tiny supported IGES case end to end, plus malformed, unsupported, empty, oversized and timed-out cases, before mounting import or reporting enabled capabilities.

### External worker alternative

The shortest evidenced architecture to investigate is an authenticated API admission endpoint forwarding to an isolated executor using the reference hosted-job protocol. Implement real identity, entitlement, ownership, durable lease/store, executor and cleanup adapters. Qualify the pinned source-faithful runtime there with synthetic source geometry, hard resource limits, expiry and cleanup receipts. Return bounded validated results through the API. Worker provisioning, source transfer, runtime execution and production activation need their own scoped authorization; no provider has been selected or benchmarked here.

Captain gate: review this no-go finding, choose the isolated worker path or fund the public-safe serverless extraction/qualification slice, and retain disabled production capabilities until actual conversion and hosted deployment evidence pass. This assessment makes no production configuration changes and does not claim a completed CAD import.
