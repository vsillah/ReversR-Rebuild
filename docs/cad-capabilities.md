# CAD Sandbox activation preparation

The API now mounts a protected Sandbox import handler before the general JSON parser. It remains disabled with the default environment. This branch prepares the adapter and offline qualification; it has not created a live Sandbox or changed production.

`GET /api/cad/capabilities` reports `routeMounted: true` because the handler exists, even while `enabled: false`. This updates the older field convention that described an active processing route. `configured` means all required local gates are present; it does not mean credentials or hosted execution have been verified. `enabled` also becomes false if cleanup on that service instance is uncertain. Both endpoints inherit the existing CORS policy and return `Cache-Control: no-store`.

## Operator gates

All of these must be present before the handler accepts a request:

- `CAD_IMPORT_EXECUTOR=sandbox`.
- Vercel deployment OIDC availability, `VERCEL_OIDC_TOKEN`, or all three explicit local credentials: `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`. Authentication is delegated to the SDK; values are never returned by capabilities or sent into the guest environment.
- `CAD_SANDBOX_LIVE_QUALIFIED=true`, an operator attestation that the separately approved live diagnostic passed. This is not an automatically verified evidence record.
- `CAD_SANDBOX_ACCESS_TOKEN`: a random URL-safe token of 32–128 characters. Requests require it in the `Authorization: Bearer ...` header. It is operator-only access; do not put it into the web/mobile client bundle.
- Installed Sandbox SDK and the bounded packaged CAD assets, including the qualified stock WASM checksum.

Missing gates return JSON `DISABLED` with status 503 before decoding a body. Wrong access tokens return 401 before decoding a body. No source-record/database route or user UI is added. This is a protected operator beta path, not a complete end-user CAD feature.

## Adapter and resource boundary

The dependency is pinned to `@vercel/sandbox` version `3.3.0`; package and lock changes add its dependency graph only. The adapter uses a unique request name, `node24`, `iad1`, one vCPU, a 60-second VM lifetime, denied guest network access, no exposed ports, no source checkout, an empty command environment, and `persistent: false`. Persistence is explicitly off because the current SDK otherwise retains snapshots by default. The SDK reports 2048 MB per vCPU. These are requested platform controls, not live enforcement evidence from this lane. See the [SDK reference](https://vercel.com/docs/sandbox/sdk-reference).

Only six fixed runtime/license assets plus validated source bytes are uploaded. The guest reads the packaged WASM directly and executes one fixed Node command; no guest package installation is needed. The app performs no process launch and uses no provider transport outside the Sandbox SDK. The guest conversion runs outside the API process; memory exhaustion there should be confined to the VM, pending live verification.

Limits: 256 KiB source, 384 KiB JSON, 1 MiB streamed response, 16 meshes, 20,000 vertices, 10,000 triangles, 45-second request deadline, 10-second guest command deadline, and 5 seconds for stop confirmation. The JSON envelope is sized for base64 expansion of private pilot files in the current source-size class; output, mesh and runtime limits are unchanged. The JavaScript heap option on the guest command is additional tuning, not the WASM memory boundary. One conversion is admitted per executor instance. This is not distributed rate limiting or a project-wide spending quota.

The guest returns triangle meshes and a source checksum. The parent rechecks the checksum, geometry limits, finite coordinates, valid indices and reported guest memory. Output explicitly marks source confidence unqualified and makes no render, STL, dimensional-accuracy, topology or manufacturing claim. In-file transform and subfigure constructs may reach the fixed OCCT reader; external references remain blocked because they can imply additional files outside the approved upload.

Stop runs after success and failure with a fresh cleanup signal. A result is not returned as successful until the stop receipt reports `stopped` without a snapshot. Cleanup errors or ambiguous creation timeouts block later work on that instance. A late-resolving creation is stopped without uploading source. If the process disappears or creation outcome is unknown, the requested VM lifetime is the fallback; its independent enforcement still needs live evidence. There are no application-level conversion retries, timeout extensions, snapshots, resumes or persistent mounts.

## Offline validation

```sh
node --test scripts/cad-sandbox.test.js scripts/cad-readiness.test.js scripts/cad-worker.test.js
node scripts/cad-sandbox-diagnostic.js
npm run typecheck
git diff --check
```

Fake-SDK tests cover the fixed create/upload/run/read/stop contract, gated HTTP success, missing gates, authorization, invalid requests, result limits and binding, errors, timeout, cancellation, late creation, cleanup stalls/failures, and the cleanup circuit breaker. Actual server tests verify disabled capabilities and the disabled POST path with existing CORS. Static guards cover the public diff and runtime imports. The diagnostic command above must print `SKIP` and perform no live operation.

These tests do not prove real Sandbox creation, OIDC, guest commands, network enforcement, memory isolation, hosted asset tracing, independent expiry, remote cleanup or a real billing receipt.

## Exact next gate

1. Captain reviews this commit and requests approval for one live public-package-cube diagnostic: one requested Sandbox, one vCPU/2048 MB, 60-second lifetime, guest network denied, persistence off, no private source, no production activation. No live run is authorized by this document.
2. After approval, select the intended Vercel team/project. For local execution, set the three explicit credential variables above in the terminal using a trusted secret mechanism, or supply a current OIDC token. Do not paste credentials into a task. Ensure the account supports the requested one-vCPU Sandbox.
3. From this branch's worktree run:

```sh
CAD_SANDBOX_DIAGNOSTIC_APPROVED=true node scripts/cad-sandbox-diagnostic.js --live
```

The script also skips when credentials are absent. It always uses the checksum-pinned public package cube; there is no source-path argument. Success must report `status: passed`, 12 triangles, provider-reported one-vCPU/2048 MB session limits, finite guest memory telemetry and `execution.cleanup: stopped`. Preserve the sanitized report and verify in Vercel's Sandbox dashboard that the session stopped, no persistent snapshot was created, and usage matches the approved run. A failure is a stop condition, not permission to retry.

4. Before activation, validate hosted bundle inclusion of the runner, contract, loader/WASM and license assets and an API duration sufficient for the 45-second request plus cleanup. Review deployment protection and access-token handling. Then separately approve the target environment settings, set the operator attestation only for the tested runtime/commit, and smoke the exact deployed commit with the public cube. Review VM timeout/OOM/network-denial behavior before admitting broader sources. Those checks may require another bounded live approval.
5. Rollback disables `CAD_IMPORT_EXECUTOR`; verify capabilities report `enabled: false` and import returns 503. Keep the access token server-side and rotate it through the operator's secret-management process if exposed.

Expected diagnostic cost at published default-region rates is roughly $0.003–$0.005 before taxes for a fully utilized one-minute run plus the small asset/result transfer, excluding unrelated usage. This is an estimate, not an enforceable dollar cap. The runtime/resource limits bound this request, and separate explicit live approval is required. Pricing varies by plan, included allowance and billing policy; verify the actual receipt in [Sandbox pricing and quotas](https://vercel.com/docs/sandbox/pricing). No Sandbox expense was incurred by this lane.

## Earlier qualification context

The original metadata boundary was released at `bb09301`. Historical Docker metadata evidence was attributed to implementation `bf80b32777d22be822db0fca095af0e89ea515e5` and evidence commit `8ab9edfeb0825bd57091ecaf3c0acbf904596582`; none of that establishes Sandbox execution.

The stock package probe converted the 11,562-byte public cube into 12 deterministic triangles, but direct synchronous WASM blocked timers and ignored a supplied capped memory. `node scripts/cad-stock-qualification.js` deliberately exits 1 with `IN_PROCESS_EXECUTION_LIMITS_UNENFORCEABLE`; `--expect-blocked` validates that known result. The Worker extraction then proved termination of infinite JavaScript and WASM loops, cancellation and bounded outputs. A 32 MiB WASM allocation still succeeded under a 16 MiB Worker JavaScript limit, leaving `WORKER_WASM_MEMORY_UNBOUNDED`. The Sandbox adapter is the proposed next isolation boundary. Source-faithful staged runtimes and private fixture pipelines remain outside its dependency graph.
