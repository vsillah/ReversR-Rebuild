# CAD Auth Production Executable Runtime Mount Completion

This source-only packet completes the disabled-by-default production server mount for `POST /api/cad/user-import`.

## What Changed

- `server/index.js` now mounts CAD user import through `server/cadProductionExecutableRuntimeMountCompletion.js`.
- The mount helper creates the reviewed executable bootstrap mount and passes it into `createCadUserUploadRouter`.
- The production call supplies no executable runtime input, so the route remains fail-closed by default.
- A later live gate must still bind the exact command-card SHA-256, current deployment reference, bounded session ref, durable adapter, one-session/one-attempt fence, independent expiry checks, rollback-first controls, and post-rollback fail-closed smoke.

## What This Does Not Authorize

This gate does not authorize provider, environment, resource, or billing changes; secret reads; upload-session issuance; production upload activation; request-body admission or reads; conversion; Sandbox dispatch; private CAD use; live evidence collection; executable command-card issuance; external messages; retries; second live runs; real-user commercialization; or commercial-readiness claims.

## Next Gate

After this source-only mount completion merges and production redeploys, the command-card digest must be rebound to the fresh production deployment. The later approval must repeat the exact deployment, session, command-card digest, durable evidence digest, UTC window, one-session/one-attempt limits, independent expiry checks, rollback-first controls, and post-rollback fail-closed smoke requirement.
