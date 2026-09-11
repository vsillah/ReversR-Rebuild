# CAD capabilities boundary

Current assessment: `worker-qualified-disabled`. The production import route remains unmounted. The public cube now converts through a local qualification router backed by a terminable Worker. Production enablement is blocked by `WORKER_WASM_MEMORY_UNBOUNDED` and unqualified hosted packaging. Earlier sections below record the progression from metadata-only status to the direct-call probe.

## Original metadata boundary

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

## Stock package execution probe

The follow-on offline probe now provides actual conversion evidence for stock `occt-import-js` version `0.0.23`. It reads only the package's public cube fixture (11,562 bytes), verifies its checksum, supplies the packaged WASM bytes directly, denies network transport, and converts twice. Both outputs contain 12 triangles with identical position/index hashes. This is a local geometry check; render, STL, source-confidence, arbitrary-source correctness and hosted packaging are still unqualified.

Run `node scripts/cad-stock-qualification.js`. The observed result is exit code 1:

```text
IN_PROCESS_EXECUTION_LIMITS_UNENFORCEABLE: synchronous WASM prevents timer/abort callbacks during conversion; the stock loader ignores the supplied capped memory.
```

The first conversion took 47 ms while a scheduled 1 ms timer could not fire. Timing varies by machine; the synchronous call prevents timer callbacks until it returns. The probe also passed a memory with a 256 MiB maximum and verified that the importer's heap uses a different buffer. Inspection of this installed loader shows it obtains exported memory from the WASM instance and uses a 2 GiB heap ceiling. This does not show that the tiny fixture exhausts memory, nor that every possible isolation design fails. It shows that a request timer and supplied memory option do not enforce the proposed direct in-process limits.

`node scripts/cad-stock-qualification.js --expect-blocked` validates the expected no-go result with exit code 0. It executes exactly two public-fixture conversions and writes no artifacts. The normal command deliberately fails the activation qualification gate; it is not a failing enabled-route test.

The capabilities endpoint now exposes the stable blocker code with the limited local qualification result. POST import remains unmounted and returns 404, as tested by the existing route suite; no uploaded source is processed. No beta-enabled claim is made. An independently terminable worker (potentially a qualified Node worker-thread implementation) with separately enforced WASM memory limits is the next technical avenue within a no-subprocess design. That alternative has not been implemented or qualified here. The isolated external executor remains the other path.

## Worker extraction and qualification

`server/cadWorkerImport.js` provides an unmounted, default-disabled qualification router and worker lifecycle service. The fixed `server/cadMeshWorker.js` entrypoint reads only the packaged WASM asset and receives source bytes from the parent. It imports no research pipeline. No files are written, no external runtime is selected, and no environment flag enables the production route.

The parent validates the upload before launching one Worker per service instance. Limits are 64 KiB source, 96 KiB JSON body, 1 MiB output, 16 meshes, 20,000 vertices, 10,000 triangles and 5 seconds including startup. Output is validated before leaving the Worker and again in the parent. The parent awaits termination before settling a request and releasing capacity, including success, timeout, abort, malformed output, worker error and early exit. JavaScript resource limits are 64 MiB old generation, 16 MiB young generation and a 4 MiB stack. These are not WASM or total-process memory limits. Concurrency is per service instance, not a distributed quota.

The useful output is a bounded triangle mesh with a source checksum, byte count and explicitly unqualified source-confidence status. Requested output units are millimeters; dimensional accuracy, units and topology have no independent verification. Transforms and selected assembly/reference records are rejected. There is no rendered image, STL, database import, client UI or manufacturing-confidence claim.

Validation commands:

```sh
node --test scripts/cad-worker.test.js scripts/cad-readiness.test.js
npm run typecheck
git diff --check
```

The worker suite covers the public package cube through HTTP, deterministic mesh output, runtime transport denial, malformed/oversized/empty/unsupported uploads, output/count/index validation, timeout of both infinite JavaScript and infinite WASM workers, parent responsiveness, abort, busy state, crash, early exit and confirmed termination. The main-server suite separately verifies GET capabilities and that production POST import remains unmounted even with activation-looking environment values. The qualification router is tested separately; it is not production-route success evidence. The public diff and runtime dependency graph are guarded.

The remaining memory blocker is reproduced by the worker test named `WASM can exceed the JS resource limit`. It allocates 32 MiB of WASM memory in a Worker configured with a 16 MiB old-generation limit. This confirms that JavaScript resource limits cannot serve as the requested CAD memory boundary; it does not intentionally exhaust the machine. [Node's Worker documentation](https://nodejs.org/api/worker_threads.html) also excludes external allocations from those limits and notes that process-wide out-of-memory failures remain possible. Timeout termination solves event-loop blocking but cannot prevent allocation spikes before termination.

Captain decision: this slice is reviewable as disabled qualification infrastructure, not safe for immediate production beta activation. Next qualify a hard WASM/total-process memory boundary and hosted asset tracing, or use a separately isolated executor. Do not mount or enable this router based solely on passing local cube and timeout tests. No push, deployment or environment change was performed.
