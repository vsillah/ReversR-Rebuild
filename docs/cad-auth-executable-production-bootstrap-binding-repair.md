# CAD Auth Executable Production Bootstrap Binding Repair

This source-only packet repairs the disabled-by-default production bootstrap path for `POST /api/cad/user-import`.

## What Changed

- `server/cadLiveOpeningExecutableRuntimeBootstrap.js` can now forward explicit executable runtime inputs into `createCadLiveOpeningExecutableRuntimeWiring`.
- `server/cadUserUploadRouter.js` can now receive those inputs through `liveOpeningExecutableRuntime` while preserving the literal closed body gate.
- Default production behavior remains fail-closed when no later live gate supplies exact command-card bytes, digest, current deployment reference, bounded session binding, adapter, and clock.

## What This Does Not Authorize

This gate does not authorize upload activation, upload-session issuance, request-body admission, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime activation, executable command-card issuance, external messages, retries, second live runs, real-user commercialization, or commercial-readiness claims.

## Next Gate

After this repair merges and production deployment changes, the live-opening command card must be rebound to the fresh current deployment. A later explicit approval must repeat the bounded session, exact command-card digest, UTC window, one-session/one-attempt limits, independent expiry checks, rollback-first controls, and post-rollback fail-closed smoke requirement.
