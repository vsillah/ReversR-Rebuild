# CAD Auth restricted source intake disposition

Status: source-only, sanitized and non-executable. This packet records the
bounded read of one named private source after the restricted receipt review
gate requested a concrete source reference.

The source was projected publicly only as
`rrb-local:cad-auth-live-evidence-stop-receipt/20260924T132411Z` with SHA-256
`15fc914116f6a693c45be19f2bf3c6159ac8fd0152f549db331ee3edd45b3005`.
The absolute local path and private payload are not committed.

## Intake result

The named source is a stop receipt, not the required eight-category restricted
receipt bundle. It reports `STOPPED` with `MISSING_PREREQUISITE` and confirms
zero live evidence collection, zero upload sessions, zero request-body reads,
zero secret reads, zero provider/environment/resource/billing changes, no
activation, no retry or second run, no private CAD use, no external messages and
no commercial-readiness claim.

The observed missing prerequisites were:

- no checked-in concrete live collection command;
- sealed-card preparation remained source-only and non-executable;
- live collection was not authorized; and
- no provider/runtime binding, restricted cohort receipt, custody receipt or
  executable collector was available.

## Still required

A future private source must provide opaque refs and exact SHA-256 digests for
all eight CAD Auth categories:

- concrete provider runtime binding;
- executable collector command review;
- restricted synthetic cohort receipt;
- custody/reviewer receipt;
- durable consumed-run ledger;
- installed route/body observer;
- late-grant observer; and
- immutable target recheck.

Until a separately approved source contains those eight categories, sealed-card
preparation, executable command-card issuance, live collection, runtime
activation, upload-session issuance, request-body admission/read, conversion,
Sandbox dispatch, retry, second run and any commercial-readiness claim remain
blocked.

## Local validation

Run:

```sh
node scripts/cad-auth-restricted-source-intake-checker.js
node --test scripts/cad-auth-restricted-source-intake.test.js scripts/cad-auth-restricted-receipt-review.test.js scripts/cad-auth-live-collector-binding.test.js scripts/cad-auth-command-card-source.test.js
```

Passing validation means only that the sanitized stop-source projection is
internally consistent and cannot be promoted into runtime execution.
