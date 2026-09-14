# Fresh bounded development run register rollover

Status: local planning packet; live execution remains blocked. Source baseline and unchanged executor: 7d7a015989676d61dfe84b051d972c36d3e566e4. Branch: codex/cad-fresh-bounded-dev-run-register-rollover. Expense: USD 0.

## Artifacts and provenance

[Run packet](cad-fresh-bounded-dev-run-register-rollover.json) binds the new run, namespace, ledger, window and fence through five SHA-256 values. [Command projection](cad-fresh-bounded-dev-run-command-card-projection.json) contains the matching restricted evidence and C0-C4 byte counts/digests. Raw values and local provenance remain in ignored .local/cad-convex/fresh-bounded-dev-run-register-rollover/ with directory mode 0700 and file mode 0600. This is a local evidence register only; no remote namespace, ledger or store was created. No secrets were generated.

The exact predecessor closeout file hashes to 25006f0f0a79bd5ccd156c7f87c670c024b64f9745ea398d7ff5a64a768fc199. Its historical receipt reports RUN_STOPPED, revision 1, unknownOutcome false, at 2026-09-14T15:44:36.626Z. No fresh provider read was made. Preserve its retained state and original evidence without deletion or retry. All five fresh identity values differ from the prior register; retained-state custody is carried as a no-delete policy, not a fabricated new custodian acceptance.

## Freshness and missing evidence

Local UTC observation: 2026-09-14T15:53:06Z. Proposed interval: 2026-09-14T17:00:00Z to 2026-09-14T17:05:00Z (300 seconds). This freezes one proposed window, not execution authority. After expiry, stop and prepare a newly reviewed packet; never silently roll the time forward. Runtime trusted-clock verification remains pending.

The prior 45 evidence fields were fixture placeholder strings. They cannot establish actual resource identity, pricing, enforced cost controls or human custody. Fresh fields explicitly carry LOCAL_PLANNING_ONLY or MISSING_EXTERNAL_EVIDENCE with approved=false; reviewer refs remain pending. reviewedUtc in the legacy projection shape means local inspection time only. No acceptance receipt has been minted. USD 9 is a proposed maximum, not verified enforcement; pricing, fee/FX coverage and retained-state cost coverage remain pending. No provider or billing settings were inspected or changed.

Projection syntax is complete under the inherited validator, which only checks shape and digests. It still returns LIVE_RUN_BLOCKED. Historical adapter/runner commits and the immutable null command-card time fields remain part of the inherited template. Concrete timing is bound by the fresh register and envelope digest; the unchanged executor baseline is separately bound in this packet. Remaining inherited contract hashes are scaffolding, not accepted executable command evidence. Independent command review must validate the underlying contracts before use.

## Executor compatibility gate

The unchanged deployed-main executor hard-pins the previous projection, register, command set and acceptance receipt in boundedDevQualificationExecutor.json. It therefore rejects this packet. A later source-reviewed rebind is required; this task does not alter that executor or claim that the fresh packet can execute. Preserve its corrected cadDurableEngine.js references and per-call deadlines. The future-run wrapper must reject RUN_ALREADY_EXISTS for this fresh attempt rather than invoke retained-run resume handling. Fixed executor timing must also remain inside the approved absolute UTC interval.

## Review steps

1. Inspect the ignored private register and planning evidence locally against the source-safe digests. Resolve exact development resource binding and independent command contracts without publishing raw values.
2. Supply actual enforced all-in cost evidence and primary, backup, reviewer and retained-state custody acceptances. Replace pending values, regenerate projections, and review every resulting digest. If the proposed window expires, prepare a new window and re-review it.
3. Review a separately scoped executor rebind and fresh-only admission guard. Record genuine restricted-evidence acceptance. Updated artifacts require a newly frozen approval phrase; the conditional phrase below cannot bypass any unresolved prerequisite.
4. Only after those gates pass may the captain request one-run approval. This task stops before push, merge, deployment or execution.

## Exact future conditional approval phrase

This binds the current planning bytes and grants no action while prerequisites remain unresolved. It is not a claim of live readiness.

> Approve one fresh synthetic durable-adapter development qualification attempt for rrb-ref:fresh-bounded-development-run, bound to planning projection d6c36899e75ed925b5232add3e9c8144bb8f53a59c14dbdffb1a95c5492296f9, restricted register 3bd0ec777a9f3f2ec748e17ff05591b78e22378a6ac63256b5682a7940320724, command-card projection 6a38c8b6960b33ecb8be339ffe6676a48514d42c4592f618a066e0387982a98f, restricted command set 2e2c95a7f82308efd05bb907ed8bbb9609d2b86c02659dbbe786318460c2d51e, planning evidence e911f3cf4df0b4bc0579683726182746fbe1d8af5acf00b33dbbecc7847934f7, and executor source baseline 7d7a015989676d61dfe84b051d972c36d3e566e4. Window: 2026-09-14T17:00:00Z through 2026-09-14T17:05:00Z, maximum 300 seconds; enforceable all-in cap USD 9 including retained-state costs. This approval takes effect only after fresh independent restricted-evidence acceptance, resource and cost enforcement verification, primary and backup custody acceptance, and a separately reviewed executor rebind to these exact artifacts. Permit only reviewed C0-C4 synthetic development metadata operations, bounded reconciliation, revocation without deletion, and non-production no-body disabled-route checks. Preserve expired-run closeout 25006f0f0a79bd5ccd156c7f87c670c024b64f9745ea398d7ff5a64a768fc199 and all retained state. Keep uploads disabled. Stop on unknown outcome or expiry. No expired-run retry or resume, automatic retry, second run, deletion, production access, live Auth tests, CAD files, private CAD, upload activation, conversion, Sandbox, real users, enrollment, email/SMS/Slack, new secrets, env/provider/auth/resource or usage/billing changes, backup/restore, store restart, push, merge, deployment or lane cleanup.

## Validation

38 focused offline tests passed (executor, private register, command bytes, runner, durable engine and loopback disabled-upload route). Artifact checks passed: five fresh identities, SHA-256 round-trip, original evidence unchanged, restricted 0700/0600 permissions, raw-value exclusion and deliberate fresh-artifact rejection by the unchanged executor. The private verification script is retained next to the restricted register.

Commands run:

```sh
node --test scripts/cad-bounded-dev-qualification-executor.test.js scripts/cad-private-restricted-register-review.test.js scripts/cad-restricted-evidence-command-card-bytes.test.js scripts/cad-live-runner.test.js scripts/cad-durable-engine.test.js scripts/cad-user-upload-route.test.js
node .local/cad-convex/fresh-bounded-dev-run-register-rollover/verify.cjs
node scripts/cad-convex-codegen.js --check
npm run typecheck
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
git check-ignore .local/cad-convex/fresh-bounded-dev-run-register-rollover/private-restricted-register.json
git diff --check
```

Tests initially used NODE_PATH pointing to existing local dependencies. Codegen initially failed because this fresh worktree had no node_modules; an ignored symlink to existing dependencies resolved it without installation or network access. Codegen then verified five bindings; npm run typecheck passed. Source audit passed across 174 files with zero leak-pattern matches; manifest verified 191 files. No runtime code changed. No UI changed; no browser, hosted, production, live Convex/Auth or provider tests ran.
