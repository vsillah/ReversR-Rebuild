# CAD Auth durable runner adapter preparation

This packet prepares the durable adapter contract that sits after the
source-only command-card rehearsal. It is still disabled by default. It does not
mount a production adapter, issue upload sessions, open admission, read request
bodies, dispatch conversion or activate any runtime behavior.

## Durable adapter shape

The adapter contract requires a durable ledger with atomic compare-and-set for a
single run claim and a single attempt claim. Unknown mutation outcomes retain
tombstones, close the fence and forbid retry. A future live adapter must prove
cross-process durability, independent expiry, crash closure and idempotent
rollback before any live opening can be proposed.

Independent expiry is explicit: the start is inclusive, expiry is exclusive and
the trusted clock must be checked before every effect. Rollback remains
available after expiry and must close the fence, revoke bounded session grants,
verify retained run and attempt tombstones, observe late grants and complete the
post-rollback fail-closed smoke.

## Command-card preparation

`prepareDurableCommandCardDraft` can construct a non-executable draft from
closed SHA-256 references and exact UTC bounds. The draft is not a command card
issuance, approval, runtime credential, upload session, or production capability.
It records the future fields and receipts that must be bound by a later gate.

`validateDurableReceiptPlan` accepts only receipt digests and zero observer
deltas. It does not authenticate private evidence and does not authorize cleanup,
session issuance, activation or body admission.

`transactionAdapter.js` adds a source-only transition proposal model for the
future durable store. It can prepare ordered claim transitions for one run, one
session and one attempt, then force close/revoke on unknown outcomes, stale
revisions, repeated claims, expiry or rollback. Its independent fence checker can
report simulated eligibility, but it always returns `admissionAllowed: false`.

## Validation

Run:

```sh
node scripts/cad-auth-prod-durable-runner-adapter-prep-checker.js
node --test scripts/cad-auth-prod-durable-runner-adapter-prep.test.js scripts/cad-auth-prod-executable-runner.test.js scripts/cad-auth-prod-executable-runner-source.test.js scripts/cad-auth-prod-runner.test.js scripts/cad-auth-prod-opening-prep.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
```

The checker reads fixed public sources only. Its sole write mode regenerates the
public packet JSON. It accepts no arbitrary paths, approval strings, runtime
flags or live execution options.

## Remaining gates

Next safe gate: source-only durable adapter evidence and command-card review.
That later gate must bind fresh adapter packet SHA-256, immutable production
deployment, independent expiry evidence, durable ledger evidence and
post-rollback smoke evidence. It must still stop before live execution if any
provider/env/resource change, secret, missing adapter evidence or unknown outcome
appears.

No provider/env/resource/billing changes, secrets, upload-session issuance,
production upload activation, request body admission/read, conversion, Sandbox,
private CAD, live evidence, runtime activation, live command-card issuance,
external messages, retry, second live run, real-user commercialization or
commercial-readiness claim are supplied or authorized by this packet.
