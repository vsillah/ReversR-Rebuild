# CAD earlier-window transport diagnostic hardening

Base: `392d95eb0988698cd3ac16de6f2cf2b69dc97dd0`, after PR #221.
Branch: `codex/cad-earlier-window-transport-hardening`.
Status: source-only diagnostic hardening; no live run performed.
Expenses: USD 0.

## What changed

The earlier-window qualification attempt stopped during
`seed-synthetic-metadata` before any subsequent C0-C4 card could execute. The
read-only reconciliation pass found no ledger for the accepted earlier-window
scope, so the stopped run should be carried forward as a sanitized transport
diagnostic class instead of only an operator-memory `OUTCOME_UNKNOWN`.

This packet adds a source-only classifier for Convex CLI transport envelopes. It
does not run the CLI, read environment variables, load provider credentials,
dispatch network requests or mutate any store. A future reviewed operator bridge
can feed it sanitized process metadata and a read-only reconciliation summary.
The classifier returns fixed failure classes and authority flags only.

## Preserved bindings

The hardening remains bound to the accepted earlier-window successor evidence:

- projection `1dbdf153921a1676c8870827fd619706e1a6bd143835a6cb623be13590dae566`
- acceptance receipt `898bf16b7078730123aa9f1416d21dcfd1e5f07a2272ac15024563a6dbb498e8`
- private register digest `d2018ce44048a32a495a0c6095c4fafdffe375766dd0f9a4aafc5806e6ebb237`
- restricted command set digest `e1a74e5b4ea72c55b6b72845a1e924c4659f11eebd8ef216c3104f2a3abd51ee`
- command-card projection digest `2b79a9ca19197b12082301ef45dfe7dcc803e84238882f16304b56c8e09e5fac`

The stopped run evidence remains sanitized:

- evidence digest `3f1f56199597d332cc68883122e2d705f50d74bf4813ae416264256a69ff54d7`
- receipt digest `43f095fd42f7e7716a8aea37b7fcf61667af4d2a4e00a948606801205c548f52`
- initiated logical operations: `1`
- read-only reconciliation class: `NO_LEDGER_FOUND`

The projected diagnostic class is
`CLI_MUTATION_NO_COMMIT_OBSERVED` with commit state `NO_COMMIT_OBSERVED`.

## Operator bridge contract

The classifier accepts only sanitized metadata such as card operation, method,
function reference, exit code, signal, error code, timeout status and the
read-only reconciliation result. Raw stdout, stderr and thrown error strings are
never returned. If raw text is present in the input, the output records
`redactionApplied: true`; if a private-looking pattern is observed, it records
`privatePatternObserved: true` without echoing the value.

Mutation transport failures remain stop-on-unknown at runtime until a separate
read-only reconciliation pass classifies commit state. No automatic retry or
second run is authorized by this packet. No-delete retained-state custody,
disabled upload gates and fail-closed prior-packet compatibility remain in
force.

## Future approval phrase

Fresh bounded development qualification window evidence assembly:

> I approve starting the next CAD Import phase for fresh bounded development qualification window evidence assembly after source review of the transport diagnostic hardening. Scope is source/local and restricted-evidence planning only: select one new five-minute UTC development window, rebuild ignored restricted successor evidence bound to the accepted earlier-window chain and the transport diagnostic hardening commit, preserve no-delete retained-state custody, no-retry behavior, disabled upload gates, sanitized evidence destinations, UTC/cost/resource evidence and stop-on-unknown handling, and produce exact restricted evidence acceptance and one-run approval phrases. Do not push, merge, deploy, run live tests, start a live run, retry the stopped or expired run, change production or development env vars, configure provider/auth/resource settings, generate or store secrets outside reviewed ignored restricted evidence artifacts, change usage or billing settings, enable CAD uploads, dispatch CAD conversion, use private CAD, mutate stores outside reviewed restricted evidence artifacts, dispatch Sandbox work, send email/SMS/Slack, or cleanup branches/worktrees.

Publication:

> Approve pushing only commit [full reviewed SHA] from codex/cad-earlier-window-transport-hardening to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD earlier-window transport diagnostic hardening packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets outside reviewed ignored restricted evidence artifacts, usage/billing changes, enrollment, email/SMS/Slack, store mutation outside reviewed restricted evidence artifacts, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, stopped-run retry, live run, or branch/worktree cleanup.

## Validation

```sh
node --test scripts/cad-bounded-dev-qualification-transport.test.js scripts/cad-bounded-dev-qualification-executor.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
