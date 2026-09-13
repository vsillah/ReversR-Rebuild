# Development Auth execution input resolution

Base: `70bc1f5e17f1d68dde918ba375103f631d99fb3c`.
Branch: `codex/cad-live-dev-auth-config-execution`.
Status: source-only plan; no live executable, approvals, secrets or enrolled cohort.

This continues [the configuration gate](cad-live-dev-auth-config-gate.md).
[executionInputs.json](../offline/cad-convex/executionInputs.json) records unresolved
operator inputs, dependency order and pinned-source checksums. It is a planning
manifest, never an approval receiver. Keep all command fields null and gates false.
The older closed worksheet remains unchanged. Private execution receipts must live
outside Git; this file does not implement custody or a live evidence verifier.

## Evidence resolved and still missing

The authenticated dashboard pass on September 13 around 04:16 UTC confirmed the
named development deployment, US East (N. Virginia), S256, independently displayed
cloud/site URLs, never deployed, no displayed env rows/Auth providers/backups,
client logs default-enabled, expiry Never, and unset daily/monthly thresholds.
These observations are historical, not current execution authorization. The private
operator receipt is identified only as `operator-dashboard-2026-09-13`; the captain
holds its local report. No personal profile, secret, browser session URL or raw row
is included here. UI absence does not establish absence of platform-owned env vars
or prove the complete history of auth data. Admin badges do not appoint operators.

### Immutable destination evidence strategy

1. Re-open the exact named development dashboard. Compare team/project/deployment,
   type and both displayed endpoints; stop on mismatch.
2. Inspect documented UI identity fields. The prior general/project pages did not
   expose immutable IDs. Do not substitute slugs, deploy references, or team ID.
3. If unavailable, obtain a provider-supported read-only identity export or approved
   existing authenticated metadata tool. First review its schema and redaction;
   retain only project ID, deployment ID, team binding, type, region and observation
   UTC. Do not scrape browser storage, reveal deploy keys, inspect auth tokens or
   create a new credential to make inspection possible. No such tool is implemented
   in this packet. Provider correspondence would need separate send authority.
4. Captain matches the private receipt to source/command manifests. Refresh within
   five minutes of a proposed action; abort on changed release, env inventory or
   destination. This freshness policy is proposed, not enforced by this JSON.

### Executor, backup, custody and expiry

The captain must obtain explicit executor and backup appointments and acceptance of
rollback/retention responsibility. Fields remain null; no invented appointment.
The proposed execution lane may prepare a command, but Vambah's admin badge alone
cannot fill either role. Appointing an agent requires a named accountable human.

Record opaque references to an existing approved encrypted vault/OS credential
store, access/recovery policy and item/version owners. Do not put vault passwords,
signing material, public key sets, account emails or credential hashes in Git.
Generation, storage and installation are distinct later actions. Current scope
creates no generator, key, password, credential entry or deploy key.

A later private register must contain literal UTC approval expiration, run start/end,
cleanup deadline and receipt expiration. Compute end no later than start + 900 s
and before the next daily or monthly UTC reset. Sessions last at most 900 s.
Run-owned records require removal within 24 h; sanitized receipts within 30 days.
Abort before provisioning if removal cannot meet that promise. No automatic resume
or new-process replay after expiry/failure. No scheduler or expiration enforcement
has been installed. Clock skew and cleanup time must fit the approved window.

## Enforceable usage-cap plan

Proposed incremental all-in ceiling remains US$5, no recurring commitment. The
[official usage-limit documentation](https://docs.convex.dev/production/usage-limits)
distinguishes per-deployment resource limits from team dollar spending limits.
Disable thresholds reject new calls after crossing a threshold and reset on UTC
calendar boundaries; warning thresholds are insufficient. These controls alone do
not prove this packet's all-in dollar bound. Documentation checked September 13.

Before U/E/D/T, produce a metric worksheet with current applicable rates, units,
rounding, prior usage, threshold precision, maximum overshoot/enforcement lag,
fanout/concurrency, retained storage duration, cleanup, tax and fees. Include storage,
compute, I/O, egress, search, deployment and any other applicable charge even when
not represented by a dashboard disable control. Zero observed usage is only baseline.
Budget formula: sum of bounded billable quantities times verified rates, plus
bounded lag/retention/cleanup/tax/fees, must be at most US$5. Unknown terms block.
Do not borrow another project's free allocation or silently broaden to a team-wide
setting. Current scope changes no limit or billing control; no numeric thresholds
are invented while units/precision/coverage remain unverified.

The source plan reserves 20 of 100 initiated logical operations for cleanup,
leaving at most 80 for provisioning, auth, checks and reconciliation combined.
This is a conservative planning allocation, not proof that 20 is sufficient.
A reviewed call graph must bound each operation's backend fanout separately; 100
logical operations is not 100 provider calls. If cleanup requires more, lower test
work within 100; do not expand the ceiling. No live run until the cap is enforceable.

## Workflow and command manifests

The JSON dependency graph orders review prerequisites, not runnable actions. Every
workflow still has command=null. Even a valid plan confers no deployment/test right.
Each future private command record must include absolute executable/version/hash,
exact argv without secrets, branch/worktree/source SHA, destination selector and ID
receipt, opaque credential reference mechanism, timeout, logical and remote call
bounds, expected sanitized result codes, allowed record selectors, unknown-outcome
behavior and rollback counterpart. No initialization, default-project selection,
watch mode, latest-package install, implicit retry or credential-bearing argv.

| Workflow | Source-backed resolution | Remaining implementation/evidence |
| --- | --- | --- |
| Provision | Auth 0.0.95 exports createAccount with provider/account/profile arguments and optional email/phone linking | Reviewed internal action context, exact two run-owned fixture identities and custody refs, linking disabled, collision abort, receipt before any live invocation; public signup stays denied |
| Transport | Existing service verifies service and exact-login hooks; CAD functions remain internal | Select and prove a scoped transport preserving server-verified ctx.auth; service authentication cannot impersonate the user's login; no deploy/admin key as runtime authority |
| Accounting | Existing service counter is instance-local | One durable run coordinator shared by two clients; atomically count before dispatch, single in-flight operation across run, no per-client bypass; persist opaque outcomes and cleanup reserve |
| Reconcile | Unknown writes currently stop source candidate | Approved read-only operation lookup bound to run/source/destination; record unknown until authoritative evidence; no replay after timeout or process restart |
| Revoke | Auth 0.0.95 exports invalidateSessions(userId, except?) | Only exact run-owned users with no except list; prove their prior history empty; verify subsequent exact-session denial, and account for deleted/retained related records |
| Cleanup | No account-removal helper in inspected public server exports | Supported removal path, bounded selectors and complete related-record accounting; no manual auth-table edits, table-wide deletion or resource deletion. Block provisioning until resolved or captain obtains a changed retention decision |
| Qualification | Existing source tests exercise disabled admission and session failures | Later approved live source/cohort/run: expiry, logout, revoke, ownership, two-client race, stale response and outage; missing/unverifiable/valid session route denial before any CAD body read |

The SDK helper names are research candidates, not runnable commands. createAccount
is documented in pinned source for a credentials-provider action context; this
packet does not assume it can be invoked directly from CLI or an arbitrary service.
invalidateSessions is user-wide, so prior unrelated sessions would make its use out
of scope. Its pinned mutation collects all sessions for that user before deletion;
the reviewed provisioning/session budget must bound this fanout and reject unexplained
prior sessions before T. It also has a debug-log call with arguments, reinforcing
the diagnostic review requirement. Session invalidation does not establish account/user removal. SDK files
and runtime consumers are checksum-bound in the plan so upgrades require review.

## Diagnostic redaction

Propose an isolated local synthetic sentinel exercise before any live test: inject
fake password/token/email values through success, denial, timeout, unknown write,
provider exception and cleanup error. Assert no sentinel in stdout/stderr, client
responses, saved receipts or telemetry payloads. Allow only run/operation IDs,
source/destination receipt refs, UTC timestamps, bounded counts and fixed outcome
codes. Drop raw exceptions, request headers/bodies, token fragments and auth rows;
hashing a secret is not sanitization. No diagnostics harness or provider log policy
is implemented here. Client logs are observed enabled; any protective setting
change needs a separate exact S gate and its own rollback decision.

## Disabled rollback compatibility

The base SHA is a source candidate with Auth gate false/empty cohort and disabled
upload admission. Never deployed means there is no observed prior cloud release.
Before D, pin reviewed disabled source and generated/schema hashes; compare every
proposed table/index/validator with retained data, including Auth tables. Require a
fixture dry-run for additive/revert compatibility and a separate approved disabled
rollback deploy command. Do not drop schema fields/tables to force compatibility.
Restoring disabled code does not revoke sessions, remove accounts or restore env
versions. C ordering: halt admission, invalidate exact run-owned sessions, remove
approved run-owned data through supported operations, restore approved env versions
or remove only newly installed rows, then execute any explicitly approved disabled
rollback deployment in its reviewed compatible order. Prove that invalidation and
cleanup remain available before disabling their required code; change the sequence
in a reviewed manifest if needed. Keep protective limits. No cloud rollback run now.

## Validation and next gate

Run focused CAD/Convex/session/route tests, TypeScript, local bindings check,
integrity and source audits, and git diff --check. New manifest tests bind SDK/source
hashes, require closed gates/null commands/empty cohort, check dependency references
and cycles, and protect cleanup/accounting bounds. They do not simulate live proof.
No runtime/backend/UI edits; no browser viewport QA required for this source packet.

After the final local commit, the captain may request this exact publication scope
with the reviewed full SHA substituted:

> Approve pushing only commit [full local SHA] from codex/cad-live-dev-auth-config-execution to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD development Convex/Auth execution-input packet. No merge, deployment, live tests, key generation/storage, Auth/provider/env configuration, resource or billing/usage changes, real-user enrollment, email/SMS, Supabase/other-store mutation, private CAD, upload activation, conversion, Sandbox dispatch or cleanup.

This is a publication template, not a request to bypass missing live inputs. E/D/T
phrases are not actionable until the private register supplies immutable IDs,
appointments, custody/version refs, absolute UTC deadlines, enforced cap and complete
command/rollback manifests. Immediate next work is captain review and targeted
resolution of those gaps; approval of this source packet does not resolve them.

Local validation receipt: 115 focused tests passed (111 existing plus four plan tests),
TypeScript passed, five local bindings verified, 70 integrity-manifest files and
56 source-audit files passed with zero leak-pattern matches. Whitespace passed.
No runtime changes, live tests, provider calls, source publication or expense.
