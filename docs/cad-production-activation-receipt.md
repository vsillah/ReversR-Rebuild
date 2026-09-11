# CAD production activation receipt

Generated: 2026-09-11T23:32:27Z

This receipt records the first successful protected production Sandbox CAD import smoke for ReversR Rebuild. It is an operator-beta activation receipt, not a manufacturing-readiness certificate and not broad end-user CAD launch approval.

## Production target

- Project: ReversR Rebuild
- Production URL: https://reversr.vercel.app
- Exact deployment smoke URL: https://reversr-i8oh7pke8-vsillahs-projects.vercel.app
- Deployment id: `dpl_71pK2st3YHoRUfWKyuKuTjP8yQSa`
- Production commit: `93f1774bc552d3596aa6afc68375cb87403f661f`
- Merge chain: PR `#147`, `#148`, `#149`, `#150`, `#151`

## Activated gates

The production environment has the following CAD gates configured in Vercel as encrypted Production variables:

- `CAD_IMPORT_EXECUTOR=sandbox`
- `CAD_SANDBOX_LIVE_QUALIFIED=true`
- `CAD_SANDBOX_ACCESS_TOKEN=<encrypted operator token>`

The access token is intentionally not recorded in git, docs, logs, or receipts. The temporary local token files used during activation were deleted after the final smoke.

## Smoke evidence

All smoke checks used only the public `occt-import-js` package cube fixture. No private CAD files were used.

Fixture:

- File: `node_modules/occt-import-js/test/testfiles/cube-10x10mm/Cube 10x10.igs`
- Size: 11,562 bytes
- SHA-256: `5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3`

Checks:

- `GET /api/cad/capabilities` on the exact deployment returned HTTP `200`, `enabled: true`, `configured: true`, `blocker: null`, `missing: []`, and mode `sandbox-stock-occt-mesh-beta`.
- `POST /api/cad/import` without the operator token returned HTTP `401`, code `UNAUTHORIZED`, and no diagnostic payload.
- `POST /api/cad/import` with the operator token and the public cube fixture returned HTTP `200`, `status: ready`, `triangleCount: 12`, and `vertexCount: 24`.
- The production alias `https://reversr.vercel.app` also returned enabled capabilities and a successful protected cube import with `triangleCount: 12` and `vertexCount: 24`.

## Root-cause repairs completed during activation

Production initially failed despite local tests and a ready deployment. The activation sequence added bounded diagnostics and then fixed the production-only loader issue:

- Preserved guest-side failure diagnostics.
- Preserved command-exit diagnostics when the guest exits before a ready result.
- Preserved primary conversion diagnostics even when cleanup also fails.
- Added executor stage diagnostics for failures that do not include guest details.
- Fixed production loading of `@vercel/sandbox` by using dynamic `import('@vercel/sandbox')` instead of CommonJS `require`, resolving production `ERR_REQUIRE_ESM`.

## Operational rollback

If production CAD import misbehaves, disable the execution gate first:

1. Remove or change `CAD_IMPORT_EXECUTOR` from `sandbox` in Vercel Production.
2. Redeploy production or trigger a fresh production function instance.
3. Verify `GET /api/cad/capabilities` reports `enabled: false`.
4. Verify `POST /api/cad/import` returns HTTP `503` with code `DISABLED`.
5. Rotate `CAD_SANDBOX_ACCESS_TOKEN` if the token may have been exposed.

## Known limits

This activation proves the protected production Sandbox path for the public cube fixture only.

It does not prove:

- arbitrary IGES source acceptance,
- private CAD file handling,
- assembly fidelity,
- STL export fidelity,
- rendered-image fidelity,
- source-confidence scoring beyond the current beta response,
- manufacturing quality,
- dimensional certification,
- production UI exposure,
- native app import workflow,
- or user-facing authorization/entitlement.

The CAD route should remain operator-token protected until the broader fixture qualification lane passes and the product UI gate is separately approved.
