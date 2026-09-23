# CAD Auth sealed evidence command-card prerequisites

Status: **source-only; blocked before any live evidence collection**. This packet
turns the PR #385 planning packet into a stricter command-card checklist. It does
not implement a provider adapter, collector, instrumentation, deployment target,
identity setup, custody workflow, runtime switch, upload-session issuer, body
admission path or executable run command.

The purpose is to prevent the plan phrase from being treated as execution
authority before the concrete inputs exist. A passing checker proves only that
the card remains unsealed and nonexecutable.

## Parent references

- Source plan merge: `06468abb5424aea56f4f89dd9cd05a9602864806`.
- Candidate under review: `dc7d733cff6d94841725e721cc8e7b0da7be4cff`.
- Parent packet: `docs/cad-auth-live-evidence-plan.json`.
- Parent live-collection phrase is **not reusable now**. Its prerequisites are
  still unbound, and the proposed UTC window must be fresh at seal time.

## What must be bound later

The JSON packet requires these prerequisites to stay blocked until a separate
source/setup review binds concrete evidence refs:

- Provider adapter source and deployed policy refs.
- Provider SDK, issuer, audience, algorithm and cache semantics receipt.
- Collector plus receipt validator source refs.
- Actual route/body instrumentation source and entrypoint review refs.
- Immutable collection deployment target.
- Restricted synthetic cohort mapping and lifecycle setup receipts.
- Custodian, reviewer, restricted store and retention/deletion receipts.
- Rollback and stop runbook, including late-grant and partial-evidence handling.
- Fresh exact approval receipt and sealed-card digest.

Null is intentional where the underlying artifact does not exist. The card must
not be sealed by filling guessed refs, stale deployment refs or private values in
the repository.

## Evidence handling

Public projection may include only aliases, exact source/deployment refs,
expected/observed result codes, disposition, sanitized artifact digest and
reviewer ref. Restricted materials such as provider account refs, login session
refs, membership refs or raw provider traces stay outside the repository.

Forbidden everywhere: tokens, cookies, raw headers, secret values, private CAD
and raw exception payloads. Receipt publication, raw credential capture and raw
account-record capture are all false.

## Runtime boundary

This packet supplies no command line, dry-run command, collector, target URL,
runtime variable, live test, upload session, upload-body admission, conversion or
Sandbox dispatch. Server routes must not import or reference it.

If future source/setup work completes the missing artifacts, produce a new sealed
card that binds the exact commits, target deployment, restricted cohort mapping,
custody refs, stop runbook and a fresh UTC window. Any source or target drift
requires resealing.

## Next non-live gate

The packet includes a source-only approval phrase for a later setup
implementation gate. That phrase is **not actionable from this PR**; this PR only
records the prerequisites. A separate approval remains required before building
the missing provider-adapter, collector, instrumentation, mapping, custody and
sealed-card generator artifacts.

## Local validation

```sh
node scripts/cad-auth-sealed-evidence-card-checker.js
node --test scripts/cad-auth-sealed-evidence-card.test.js scripts/cad-auth-live-evidence-plan.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

These commands are local source checks. They do not read secrets, contact Auth or
provider services, start the app, deploy, issue upload sessions, read upload
bodies, dispatch conversion/Sandbox work or send external messages.
