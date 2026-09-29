# CAD Auth production execution binding finalization

Branch: `codex/cad-auth-production-execution-binding-finalization`.

Status: source-only finalization prepared. Production remains fail-closed by
default. This gate does not activate upload admission, issue an upload session,
read request bodies, issue a command card, qualify live durable service, change
provider settings, or collect live evidence.

## What changed

- `server/cadProductionExecutionBindingSource.js` adds a disabled-by-default
  source factory for a later reviewed production execution binding.
- `server/cadProductionExecutionBinding.js` now gets its default input from that
  source factory. The factory default is still `null`, so production returns
  `{ enabled: false }` unless a later source-reviewed live gate supplies exact
  command-card bytes, SHA-256, current deployment reference, bounded session
  reference, durable evidence digest, durable service interface, and clock.
- The source factory runs executable command-card binding review before returning
  anything and rejects mismatched session or durable evidence bindings.
- Historical source-only packets that depended on the earlier execution-gap
  closure are now treated as stale provenance. Their tests preserve zero-effect
  fail-closed behavior and no longer mint approval phrases from outdated source
  bindings.

## Closed controls

The default production path remains closed:

- no provider, environment, resource, or billing changes
- no secret reads
- no private evidence reads
- no upload-session issuance
- no production upload activation
- no request-body admission or read
- no conversion
- no Sandbox dispatch
- no private CAD use
- no live evidence collection
- no runtime activation
- no executable command-card issuance for live execution
- no external messages
- no retry or second live run
- no commercial-readiness claim

## Next gate

After this branch merges and Vercel deploys the new main commit, the deployment
target will be different from the last no-live rebind. The next gate must verify
the fresh production deployment, run fail-closed smoke, recompute the durable
evidence digest and executable command-card SHA-256 against that deployment, and
then return the exact live-opening approval phrase.

## Validation

Focused validation:

```bash
node --test scripts/cad-auth-production-execution-binding-finalization.test.js scripts/cad-auth-live-opening-execution-gap-closure.test.js scripts/cad-auth-live-opening-executable-runtime-wiring.test.js
node --test scripts/cad-auth-durable-service-qualification-plan.test.js scripts/cad-auth-durable-service-reference-prep.test.js scripts/cad-auth-durable-service-qualification-review-plan.test.js scripts/cad-auth-durable-service-qualification-review-projection.test.js scripts/cad-auth-final-live-opening-rebind-prep.test.js
node scripts/cad-auth-production-execution-binding-finalization-checker.js
git diff --check
```
