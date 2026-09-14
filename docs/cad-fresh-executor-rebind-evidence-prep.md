# Fresh executor rebind and evidence preparation

Status: source-reviewed plan only; executor unchanged and live run blocked. Base: PR #216 merge `2024c8f0a3b212fbde80bb820b97bb75bd9edcba`. Branch: `codex/cad-fresh-executor-rebind-evidence-prep`. Expense: USD 0.

## Reviewed source and identity

The companion [planning record](cad-fresh-executor-rebind-evidence-prep.json) preserves the predecessor bindings and records a separate proposed window. The exact bytes of [PR #216's projection](cad-fresh-bounded-dev-run-command-card-projection.json) verify as `d6c36899e75ed925b5232add3e9c8144bb8f53a59c14dbdffb1a95c5492296f9`. Its restricted register digest is `3bd0ec777a9f3f2ec748e17ff05591b78e22378a6ac63256b5682a7940320724`.

The ignored rollover register directory is absent from this worktree and the saved main checkout. Its private bytes and underlying evidence have therefore not been independently verified here. Do not reconstruct missing evidence from public digests or copy historical fixture values into accepted fields. The historical closeout digest `25006f0f0a79bd5ccd156c7f87c670c024b64f9745ea398d7ff5a64a768fc199` remains a source-reported receipt, not a fresh provider observation. Preserve the original evidence and all retained state without deletion, retry or resume.

## Explicit window replacement proposal

At the observed tool time `2026-09-14T16:24:12Z`, the rollover packet's proposed interval `2026-09-14T17:00:00Z` through `2026-09-14T17:05:00Z` was still in the future. The earlier run is closed; the requested description of the rollover window as expired does not match that observation.

Proposed replacement: **2026-09-15T17:00:00Z through 2026-09-15T17:05:00Z**, maximum 300 seconds. This is a newly recorded planning proposal, not an edit to accepted execution timing. No automatic refresh is allowed. If it expires before all reviews finish, stop and prepare another explicit proposal.

The old projection/register digests cannot bind this new interval. Replacement digests and receipt remain null until the restricted register's window fields, window identity and envelope/command dependencies are regenerated and independently reviewed. Preserve run/namespace/ledger/fence only if restricted source review establishes they have never been admitted; otherwise propose new identities without touching the retained store. Never claim the old digest now represents new bytes. Trusted runtime clock evidence is pending.

## Source-reviewed executor work plan

| Source surface | Finding and required change | Offline acceptance criterion |
| --- | --- | --- |
| `offline/cad-convex/boundedDevQualificationExecutor.json` and `inspectAcceptedRunArtifacts` | Executor pins the predecessor acceptance chain. Rebind only after authentic replacement evidence acceptance, including receipt source commits and all five artifact digests. Do not replace pins with planning receipts. | Old, mixed, tampered, missing and planning-only artifacts fail before injected callbacks. Acceptance of syntax alone never authorizes runtime. |
| `createScenario` and runtime approval validation | Current end is `now + 300000`; approval has no absolute interval. Bind exact approved start/expiry and trusted time, and cap run end, authority expiry, four-second call deadlines and 60-second leases by absolute expiry. | Before-start, exact-expiry, malformed clock, backwards clock, stalled precheck, mid-call expiry and late completion stop closed. Delayed start must never extend expiry. |
| initialization handling | `RUN_ALREADY_EXISTS` currently reads authority and permits revision-zero continuation. Fresh execution must reject immediately. Keep historical resume behavior isolated from the fresh entry point. | Revision-zero and advanced existing runs both stop after initialize, with no authority read, reconciliation, mutation, stop call, retry or cleanup. |
| adapter calls and `withinAllocation` | Logical allocation check currently occurs after the operations; remote attempt enforcement must be reviewed at the injected transport boundary. | Pre-dispatch counters reject excess work. No automatic transport retry. Expired/null deadlines cause no callback; route pre/post callbacks also respect the interval. Unknown mutation outcomes stop all subsequent remote operations. |
| corrected adapter references and evidence output | Preserve `cadDurableEngine.js:*` references, per-call deadline behavior, C0-C4 fixed interpretation and sanitized output. Never execute descriptor strings as shell commands. | In-memory successful fresh scenario covers the reviewed operation graph; disabled routes subscribe to no body. Failure evidence distinguishes local halt from verified remote RUN_STOPPED. |

Implementation belongs in the existing executor and focused fixture tests, with declarations updated if the API changes. Any acceptance writer must reject LOCAL_PLANNING_ONLY, MISSING_EXTERNAL_EVIDENCE, pending reviewer refs and approved=false. Validate underlying command contracts and exact development target separately from descriptor byte-count/digest syntax. A matching hash is not proof of authentic evidence.

## Required restricted evidence

The JSON record enumerates all 45 inherited evidence fields for traceability. All remain unaccepted for this replacement.

| Gate | Required evidence and review |
| --- | --- |
| Resource and privilege | Existing exact development resource identity and binding digest, alias, engine/isolation, least-privilege proof, synthetic-only inventory, fixture digest, source review and independent verifier. Raw identifiers remain restricted. No provider inspection or configuration is authorized in this lane. |
| Commands and counters | C0-C4 exact descriptors, source contracts, byte counts and digests, 12-row allocation mapping, logical commands and actual remote-attempt bounds, stop behavior and fresh-only admission proof. Regenerate every dependent digest. |
| UTC | Proposed interval, matching window identity/envelope, trusted clock provenance, bounded deadlines and stop procedure. New window requires new review and subsequent one-run authority. |
| Cost | Enforceable all-in maximum USD 9 with resource-bound enforcement evidence and pricing validity. Include compute, storage, operations, backup, egress, taxes/fees/FX, contingency and retained-state coverage. Executor's synthetic 6,400-micro ledger budget is not provider billing enforcement. Estimates or generic spending authorization are insufficient. If retained-state cost cannot remain bounded without deletion, stop for a separate decision. |
| Custody | Genuine primary and backup acceptances, escalation owner, recovery operator, independent evidence reviewer and retained-state acceptance. Bind identities, evidence digests, responsibilities and validity to this attempt and historical retained state. A no-delete policy alone is not human acceptance. |
| Evidence and recovery | Restricted and sanitized destinations with access/custody acceptance; sanitization review; non-production no-body disabled-route plan; bounded reconciliation, rollback and recovery baseline acceptance. Keep uploads disabled; revocation is not deletion. No remote cleanup on failure. |

## Ordered next steps and gates

1. Locate the original restricted rollover register and provenance with its custodian. Place a reviewed copy only in an ignored `.local/cad-convex/fresh-executor-rebind-evidence-prep/` directory (0700; files 0600). Confirm `git check-ignore` before writing; hash locally without printing raw evidence. Preserve originals unchanged. This lane created no restricted evidence or acceptance receipt.
2. Inspect genuine existing resource/cost/custody evidence locally. If acquiring evidence requires provider access, billing changes or contacting custodians, request that separately; this plan authorizes none of those actions.
3. Apply the explicitly reviewed window to a successor restricted register; regenerate projection and command dependencies with `createSourceSafeProjectionFromRestrictedRegister`. Verify exact bytes, canonical register digest and predecessor custody before freezing the successor packet. A source-only plan can be published while this remains blocked.
4. Obtain independent review and evidence-completeness approval naming the final successor hashes. Only then mint a genuine restricted acceptance receipt. No exact evidence-acceptance phrase is available yet because the required bytes and acceptances do not exist here.
5. Implement and review the source-only executor changes above with in-memory tests. Final digest pinning awaits step 4. Freeze the exact commit before requesting push/draft-PR authority. Merge, deployment, live run and any environment/provider changes remain separate gates.

## Next publication approval

The closeout supplies the exact local commit for this planning packet. Publication is the next available gate; it does not accept restricted evidence or authorize implementation/runtime beyond this packet.

No live approval is requested. The PR #216 conditional one-run phrase must not be reused for the replacement interval.

## Validation scope

Run the existing offline executor, restricted register, command-card bytes, runner and durable-engine fixtures; run static source audit, manifest regeneration/verification and `git diff --check`. Use existing local dependencies without installation. No UI or runtime implementation changed, so browser QA, production smoke and live provider/Auth checks are outside this planning slice. Validation results are reported in the task closeout.

Completed checks: 32 existing offline tests passed; source audit passed across 176 files with zero leak-pattern matches; contract manifest verified 193 files. A local consistency check verified the predecessor projection hash, the proposed 300-second interval, 45 unique evidence fields, null replacement bindings, disabled gates and unchanged executor source/packet hashes. No typecheck or codegen run was needed for this documentation/manifest-only change.

```sh
NODE_PATH="$(git rev-parse --git-common-dir)/../node_modules" node --test scripts/cad-bounded-dev-qualification-executor.test.js scripts/cad-private-restricted-register-review.test.js scripts/cad-restricted-evidence-command-card-bytes.test.js scripts/cad-live-runner.test.js scripts/cad-durable-engine.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
git diff --check
```

The audit caught an absolute local dependency path in the draft validation command. It was replaced with a Git-derived path before commit; the final audit was rerun.
