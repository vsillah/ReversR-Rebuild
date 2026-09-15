# CAD development upload/session qualification bridge

Base: `ce2e38e24ca80538cfe992b05689c3d3ef11bfdb`, after PR #247.
Branch: `codex/cad-dev-upload-session-qualification-bridge`.
Status: source-only Convex bridge for a future development-only upload-session
qualification run. Expenses: USD 0.

## Why This Slice Exists

PR #247 added the local executor shape, but a real development run cannot call
internal Convex CAD functions directly from an operator script. This bridge adds a
disabled-by-default public action that can execute the reviewed insert/read/revoke
sequence server-side after a future source rebind supplies one exact run tuple.

## Bridge Contract

`cadDevUploadSessionQualification:issueReadRevoke`:

- accepts only a credential digest, never a raw upload credential,
- requires the reviewed run key/projection/receipt tuple,
- checks the UTC window before any store operation,
- calls only `internal.cad.insertIfAbsent`, `internal.cad.read` and
  `internal.cad.revoke`,
- returns sanitized booleans and fixed status codes,
- keeps CAD uploads disabled and `BODY_ADMISSION_AUTHORIZED = false`,
- retains the revoked upload-session row rather than deleting it.

The binding file is disabled by default. A future rebind PR must set the exact
digest tuple and UTC window before any live development run.

## Still Not Authorized

This source-only bridge does not authorize a live run.

- live development run
- production upload activation
- CAD files, private CAD, conversion or Sandbox dispatch
- real users or external messages
- provider/resource/env/usage/billing mutation
- automatic retry or second run

## Validation

```sh
node --test scripts/cad-dev-upload-session-qualification-bridge.test.js
npm run cad:convex:codegen:check
npm run typecheck
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

## Next

After this source-only bridge is merged, deployed and production-smoked
fail-closed, the next gate is restricted evidence/register preparation and a
source rebind for exactly one development-only upload-session qualification run.
