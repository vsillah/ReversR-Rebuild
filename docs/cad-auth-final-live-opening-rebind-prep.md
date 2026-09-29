# CAD Auth final live-opening rebind preparation

This source-only packet binds the post-PR #442 production state for a later bounded internal upload-admission opening. It verifies the merged durable-service qualification review projection, the production deployment target, and the fail-closed production smoke result while keeping runtime behavior closed.

The packet does not read private evidence, qualify the durable service live, issue upload sessions, activate production upload, admit or read request bodies, run conversion, dispatch Sandbox, use private CAD, collect live evidence, activate runtime behavior, issue an executable command card, send external messages, retry live work, or claim commercial readiness.

The packet resolves a deterministic command-card SHA-256 for review, but the command card is not issued by this gate. A later approval must still bind the packet SHA-256, source commit, production deployment, bounded session, durable evidence digest, UTC window, one-session/one-attempt limits, rollback controls, and post-rollback fail-closed smoke.

## Local validation

Run:

```sh
node scripts/cad-auth-final-live-opening-rebind-prep-checker.js
node --test scripts/cad-auth-final-live-opening-rebind-prep.test.js scripts/cad-auth-durable-service-qualification-review-projection.test.js scripts/cad-auth-live-opening-execution-gap-closure.test.js
git diff --check
```

The checker reads fixed public source files only. `--write` regenerates only the public JSON packet. Other modes are rejected and return sanitized fail-closed output.

## Next gate

The checker emits an exact public-push/draft-PR approval phrase bound to the packet bytes. Public push, PR creation, merge, deployment, production smoke, and live opening remain separate gates.
