# CAD bounded development qualification executor

Base: `a32de6334c3b93060c51c40cf9650dda4f7f78c4`, after PR #214.
Branch: `codex/cad-bounded-dev-qualification-resume`.
Status: source-only executor resume handling and tests; no live run performed.
Expenses: USD 0.

## What changed

The accepted restricted register and command-card projection proved evidence
completeness, but the previous `cad-live-runner.js` command still returned
`LIVE_EXECUTION_NOT_IMPLEMENTED`. This packet adds a source-reviewed executor
bridge without adding a provider client, environment reader, credential resolver,
network transport or shell-command execution.

The first bounded live attempt reached the reviewed executor but stopped after
initialization because the live deployment uses `cadDurableEngine.js:*`
function identifiers and the executor reused a fixed one-second deadline across
CLI transport. This resume packet corrects the source function references, gives
each adapter call a fresh bounded deadline, and permits only a retained
initialized-run continuation when the authority read proves revision `0`.

The executor validates the accepted restricted register, source-safe projection
and acceptance receipt against the approved digests. It then interprets C0-C4 as
fixed card IDs and effects, not as executable shell bytes. Runtime execution is
possible only when a later approved caller injects a reviewed development-only
durable adapter, a no-body disabled-route checker and a sanitized evidence sink.

## Runtime boundary

`offline/cad-convex/boundedDevQualificationExecutor.js` exports:

- `inspectAcceptedRunArtifacts` for local/restricted artifact validation.
- `inspectRestrictedCommandDescriptors` for command-card byte-count and digest
  review without returning raw command bytes.
- `executeBoundedDevelopmentQualificationRun` for a fixed C0-C4 operation graph
  through injected callbacks only.

The bridge requires a runtime `oneRunApproval` object matching the accepted
projection, receipt, restricted-register and command-card digests. It rejects
missing approval, unsafe disabled-route checks, malformed descriptors, unexpected
engine codes and unknown mutation outcomes. It does not retry automatically and
does not start a second run.

If initialization returns `RUN_ALREADY_EXISTS`, the bridge immediately reads
authority and continues only when the retained run is still an initialized,
revision-zero run. Any later retained state stops closed as
`RESUME_STATE_UNSUPPORTED`, preserving no-delete rollback compatibility and
preventing silent replay over advanced ledger state.

The fixed graph covers accepted-artifact preflight, disabled route pre/post
checks, synthetic metadata initialization, authority read, exact selector read,
reserve, expected conflict observation without retry, fence, unknown marking,
CAS claim, bounded reconciliation scan, permission revocation without deletion,
revoked-authority read and stop. Sanitized evidence contains card IDs, digests,
byte counts, route statuses, engine codes and counters only.

## What remains blocked

No live Convex/Auth qualification ran in this slice. No production or development
environment variables changed. No provider, resource, billing or usage settings
changed. No secrets were generated or stored. No real users, email/SMS/Slack,
CAD files, upload activation, conversion, Sandbox dispatch, deployment, merge or
cleanup were performed.

The next publication gate is still source-only. A later live qualification needs
separate approval naming this executor commit, the accepted restricted evidence,
the exact development adapter binding and the no-body disabled-route target.

## Validation

```sh
node --test scripts/cad-bounded-dev-qualification-executor.test.js scripts/cad-private-restricted-register-review.test.js scripts/cad-restricted-evidence-command-card-bytes.test.js scripts/cad-live-runner.test.js scripts/cad-durable-engine.test.js scripts/cad-user-upload-route.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

The fixture run uses the in-memory durable-engine fixture only. It is not a live
Convex/Auth test.

## Future approval phrases

Publication only:

> Approve pushing only commit [full reviewed SHA] from codex/cad-bounded-dev-qualification-resume to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD bounded development qualification resume-handling packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch or branch/worktree cleanup.

One bounded live development qualification continuation, after source review and publication:

> Approve continuing the synthetic durable-adapter development qualification run using accepted restricted evidence projection 2355757d7415cb1512d234c69f90cd670cc4c1a405c31f7102140622507e77d4, acceptance receipt c1001e4c4ab59accebfa5bc49e8bf76d8799af75bfcc165fc43e5e03e61bf053, private restricted register digest 0ed5be1773de1db4f7f9f6991a63f29473a530dfe53716ee1d955e61380c3c58, restricted command set digest 035742b2d20ba7bb037505a609224191dd2d8898398f622bfdc308dc8861af3f, command-card projection digest f3e864320f4f6aa146cac0cacf3f1e1a7e4e90b2c0001af0bfb23bcc1698ff1a, resume-handling executor commit [full reviewed SHA], and deployed main commit [full reviewed SHA]. Scope is one bounded development-only continuation through corrected cadDurableEngine.js function references, per-call bounded deadlines, retained initialized-run resume handling after RUN_INITIALIZED, accepted restricted register, injected development-only adapter, no-body disabled-route checks, synthetic metadata writes, bounded reconciliation reads, revocation without deletion, sanitized evidence output, and stop-on-unknown/no-automatic-retry handling. Keep CAD uploads disabled. No production, CAD files, private CAD, CAD upload activation, CAD conversion, Sandbox dispatch, real users, enrollment, email/SMS/Slack, new secrets, env/provider/auth/resource or usage/billing changes, deployment, merge, automatic retry, second run, or branch/worktree cleanup.
