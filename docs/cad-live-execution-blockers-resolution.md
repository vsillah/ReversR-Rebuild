# CAD live execution blocker resolution

Base: `94250aeba0bb734be28739e9108eacf9014d07fa` (PR #188).
Branch: `codex/cad-live-execution-blockers-resolution`.
Status: source-only specification; all live gates remain closed.

[executionBlockers.json](../offline/cad-convex/executionBlockers.json) is the
reviewable companion to [executionInputs.json](../offline/cad-convex/executionInputs.json).
It defines required fields, evidence sources, command cards, time constraints,
usage worksheet and rollback compatibility rows. It is neither an authorization
receiver nor a private-register validator. Passing its tests establishes source
packet consistency only. No live transport, coordinator, removal operation,
provider policy or deadline enforcement is implemented by this packet.

## Evidence and private-register contract

Copy the field groups into an existing approved encrypted private register only
under a later scoped appointment. Git contains field names and null receipts;
never fill this source JSON with real appointments, identifiers, credential
versions, account data, commands containing credentials or private receipts.
A completed private record must bind its revision, reviewer, evidence reference,
observation UTC and source SHA. Missing, stale, unknown or mismatched fields block
execution; a human signature cannot substitute for missing technical evidence.
Evidence requirements in the JSON distinguish source findings from facts requiring
provider observation or a human appointment. Source paths are relative to this repo.

| Evidence | Exact source and acceptance | Owner and remaining gate |
| --- | --- | --- |
| Immutable destination | Convex dashboard, team `vambah-sillah`, project `reversr-cad-auth-dev`, development `majestic-alligator-31`; provider-supported identity export with immutable project/deployment IDs, team binding, type, region and separately displayed cloud/site endpoints | Executor collects through approved existing read-only access; captain matches. If the UI omits IDs, provider-supported metadata evidence is required. Slugs and team IDs cannot fill them. No new credentials or browser-storage extraction. |
| Appointments | Explicit appointment receipt and separate executor/backup acceptances, accountable human, custodian, rollback and retention owner; exact gates and expiration | Vambah appoints; each operator accepts. An admin badge supplies no appointment. |
| Custody | Existing vault item/version references, owner, access/recovery policy and prior env versions or verified absence | Custodian identifies references privately. No secret generation, storage or installation here. |
| Cap and deadlines | Current account rate/coverage evidence and provider enforcement semantics, plus reviewed workload graph and UTC schedule | Executor and captain review together; unknown lag, cost or cleanup access keeps provisioning blocked. |
| Transport and accounting | `developmentService.js`, `convex/cad.ts`, `convex/librarySession.ts` and future implementation receipt | Separate implementation must prove verified session propagation and a durable shared coordinator. The existing counter is process-local. |
| Removal and retention | Pinned Auth SDK public exports and provider-supported removal documentation; complete related-record graph | No supported account removal is established by this packet. Resolve it before provisioning, or obtain an explicit revised retention decision with exact records/deadline. |
| Rollback | Disabled source, generated bindings, expanded schema and retained-record fixtures | No observed prior cloud release exists. Prove compatibility and retain revocation/removal access before changing source/env. |

The historical dashboard observation from PR #188 is not refreshed here. Refresh
identity, release and env inventory within 300 seconds before each future action;
include clock skew in the age. Stop on changed destination, release, source or
inventory. If a long action needs another refresh, count the read in the approved
operation/cost manifest. No provider correspondence is sent by this lane.

Appointment text for the private register:

> I appoint [executor] with accountable human [name], backup [name], custodian [name], rollback owner [name] and retention owner [name] for only [gate IDs] at source [full SHA] and immutable destination [project/deployment IDs], until [UTC]. Each named operator accepts in [receipt references]. Custody, access and recovery are bound to [existing policy/item references]. Appointment alone authorizes no execution, secret handling, provider mutation or spending.

## UTC worksheet

Enter literal `YYYY-MM-DDTHH:mm:ssZ` values and a measured nonnegative clock-skew
bound. Record earliest record and receipt creation times as the run progresses.
Run end must be no later than start + 900 seconds and strictly before the next
UTC daily/monthly reset. Session expiry is at most issue + 900 seconds and no later
than run end. Stop test work early enough to leave the proved cleanup duration
plus clock skew inside the approved cleanup window. Cleanup deadline is at most
24 hours after the earliest run-owned record; receipt expiry is at most 30 days
after the earliest private sanitized receipt. Approval must cover every action's
own deadline, including cleanup; expired approval never permits automatic resume.

The backup takes responsibility at the first missed stop/cleanup acknowledgment,
using the same reviewed commands and still-valid authorization. If approval or
cleanup capacity expires, halt and report the exact retained record counts and
owner; obtain a new bounded cleanup approval. No timer, scheduler or escalation
message is installed. Provider logs/backups have their own documented retention;
application deletion does not establish erasure there. Source docs persist in Git.

## Enforceable cost worksheet

Fill one `metricRows` entry per applicable resource, using the JSON field list.
The coverage register must explain every listed charge category as bounded cost or
provider-evidenced not applicable; blank and assumed-free entries fail review.
Confirm currency, rates, rounding, applicable tax/fees, existing baseline usage,
threshold precision and daily/monthly scopes. Record both an enforcement receipt
and the exact reviewed threshold change separately from the proposed worksheet.
This lane performs no fresh pricing research and supplies no current rate claim.

For each metric, derive a bounded incremental quantity from the reviewed call graph
(including rejected auth, provisioning, two clients, reads, unknown outcomes and
cleanup), plus worst-case enforcement lag/overshoot and retained storage. Quantities
must already include fanout; do not multiply or omit it twice. Round up by verified
billing quantum and multiply by the verified unit rate. Add bounded tax, fees and
currency conversion once, with their applicable base documented. The sum must be
at most US$5. All numeric terms must be finite and nonnegative. Estimates, warning
thresholds and assumed free allocations cannot prove the cap.

For each disable threshold prove baseline + work + lag + cleanup fits below the
usable resource bound with documented precision; also prove the all-in dollar
bound holds through retention. If a threshold can prevent revocation/removal,
prove a supported reserved cleanup path before provisioning. Merely reserving
logical operation numbers does not reserve provider capacity. Keep at least 20
of 100 initiated logical attempts for cleanup and at most 80 for other work;
if the removal graph needs more, reduce other work. Bound provider fanout separately.
One operation in flight across both clients, at most two identities, no automatic
retries. Unknown terms or an unenforceable cap require provider evidence or an
explicit changed cost decision before any live action. Do not raise limits on failure.

## Command manifest review

Each JSON command card requires the complete `privateRegister.fieldGroups.command`
record. `command: null` is deliberate: supplying guessed CLI invocations would
misrepresent an unimplemented path as executable. The future record must identify
an absolute executable with pinned version/hash, literal argument vector without
secrets, branch/worktree/source binding, immutable destination receipt, credential
reference mechanism, timeout, attempt/fanout bounds, expected fixed result codes,
exact ownership selectors, unknown-outcome procedure and rollback counterpart.
No `latest`, initializer, watch mode, default destination, deploy-key user identity,
implicit retry or credential-bearing argv. Read-only commands also need bounds.

| Card | Required implementation/evidence before command can be filled |
| --- | --- |
| transport | Independently authenticate service and server-verified exact login; preserve `ctx.auth` into internal operations; deny wrong origin, forged claims, owner mismatch, revoked/expired session and generic admin proxy access. |
| accounting | Durable atomic ledger keyed by run/operation/source/destination, shared by both clients; count before dispatch, persist pending before remote call and terminal/unknown afterward. Concurrent denial and rejected attempts count. Crash or lease expiry halts the run; a second process cannot reset the count or redispatch. |
| reconciliation | Bounded authoritative read lookup of a pending operation; committed and absent outcomes retain evidence. Timeout or missing lookup stays unknown. No test writes while unknown, no replay after absence without fresh explicit review. |
| revocation | Exact run-owned synthetic users, empty prior session history, bounded session fanout, pinned `invalidateSessions` context with no except list; subsequent exact-session denial and separate remaining-record counts. |
| cleanup | Supported removal API, complete run-owned relationship graph, bounded selectors and dependency order, before/after counts and provider-retention exceptions. No manual auth-table edits, broad delete, resource deletion or inferred cascade. |
| provision | Pinned `createAccount` action context, two collision-free synthetic identities, linking disabled and receipts; cleanup review precedes any account write. Public signup remains denied. |
| qualification | Source-bound cases for expiry/logout/revoke, wrong owner/origin, stale responses, outage, two-client race and unknown writes. Missing, unverifiable and valid sessions all deny CAD upload before reading the body; zero CAD bytes/conversion/Sandbox. |

Each future command must bind a reviewed implementation receipt. A sentinel harness
must inject only local fake password/token/email values across success, denial,
timeout, unknown write, provider exception and cleanup failure, checking stdout,
stderr, client responses, receipts and telemetry. Only fixed codes, opaque IDs,
counts and UTC metadata may survive. Raw exceptions and secret hashes are not safe
receipts. Provider log policy is a separate evidence gate; settings changes require S.

## Rollback compatibility manifest

Use the JSON `rollbackCompatibility.rowFields` for all three CAD tables and every
table exported by the pinned SDK's `authTables`. The companion now enumerates
`users`, `authSessions`, `authAccounts`, `authRefreshTokens`,
`authVerificationCodes`, `authVerifiers` and `authRateLimits`, with null private
compatibility rows and a checksum of Auth 0.0.95 schema source. Expand the installed SDK source
rather than assuming that the local source-loader mock (which supplies empty
`authTables`) covers auth compatibility. Enumerate all indexes and validators,
forward and disabled hashes, retained record shapes, ownership selectors,
supported removal paths and dependency order. No table may be omitted as empty
without an authoritative bounded inventory receipt.

Fixture evidence must test proposed source against retained shapes and disabled
source against post-run retained shapes, including auth sessions/accounts and
indexes. A fixture failure, removed field or incompatible validator blocks D;
never drop fields/data to force rollback. Bind the candidate source SHA, generated
bindings and schema hashes. `verifiedCloudRelease: null` remains accurate.

Default order: halt dispatch with uploads disabled; reconcile unknown writes;
invalidate exact sessions and prove denial; remove approved run-owned data;
restore individually approved env versions/absence; deploy the compatible disabled
source only if explicitly approved. Verify cleanup/revocation remain callable
through this order. If they depend on code/env being removed, review a different
order before D. Preserve protective limits. Redeployment alone proves neither
revocation nor removal. Every step has its own receipt, owner, timeout and failure
stop. No cloud rollback or local branch/worktree cleanup occurs here.

## Future approval phrases

Templates below are not grants. Replace every bracket and expand the referenced
private manifests for review without disclosing secrets. A checksum binds a reviewed
manifest; it does not replace its review. Never request E/D/T with unresolved fields.
The existing [U/K/S/P gate phrases](cad-live-dev-edt-approval-packet.md) remain
separate and must also bind the immutable destination, source and UTC expiration.

Publication is the immediate next human gate:

> Approve pushing only commit [full reviewed SHA] from codex/cad-live-execution-blockers-resolution to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD live-execution blocker-resolution packet. No merge, deployment, live tests, Auth/provider/env changes, secret generation/storage, deploy keys, billing/usage changes, enrollment, email/SMS, store mutation, private CAD, uploads, conversion, Sandbox dispatch or cleanup.

A next source implementation lane, if selected after review:

> Approve source-only implementation on [named branch/worktree] from [full SHA] of the reviewed transport, durable accounting, bounded reconciliation, supported removal and diagnostic contracts in [packet checksum], with synthetic offline tests and disabled CAD admission. No provider calls, secrets, env changes, live tests, deploy, push, merge, billing, enrollment, private CAD, Sandbox or cleanup. Unsupported provider behavior remains blocked for evidence; do not invent an API.

E — environment only:

> Approve only environment manifest [checksum; exact names/scopes/prior versions and new custody version references] for implementation [full SHA], immutable project [ID] and development deployment [ID] bound to reversr-cad-auth-dev / majestic-alligator-31 by [fresh identity receipt], executed by [executor] with backup [name] before [UTC], within verified US$5 all-in cap [receipt]. Permit only row-specific rollback [exact actions/checksum] within [UTC]. No secret generation, provider-console/source/limit/billing changes, deployment, live tests, stores, users, delivery, production, CAD, Sandbox or lane cleanup.

D — development source only:

> Approve deploying only [full implementation SHA and source/schema/bindings checksums] using [exact reviewed invocation and command checksum] to immutable project [ID] and development deployment [ID] bound to reversr-cad-auth-dev / majestic-alligator-31 by [fresh receipt], by [executor] with backup [name] before [UTC], within verified US$5 all-in cap [receipt]. Permit only disabled rollback [source SHA, compatibility receipt, exact command, trigger and deadline]. No app-host deployment, secrets, env/provider-console/limits/billing changes, live tests, provisioning, unrelated store writes, production, real users, delivery, CAD, Sandbox or lane cleanup.

T — one run only:

> Approve one synthetic run [run ID] at [full source SHA and deployed release receipt] on immutable project [ID] and development deployment [ID] bound to reversr-cad-auth-dev / majestic-alligator-31 by [fresh receipt], using [reviewed harness origin/source and command manifests], by [executor] with backup [name], from [UTC] to [UTC], expiring [UTC]. Maximum two identities, two clients, 100 initiated logical attempts including at least 20 reserved for cleanup, one in-flight operation and no automatic retry, under verified US$5 all-in cap and provider bounds [receipt]. Permit only enumerated run-owned provisioning/auth/session/authority writes, bounded reconciliation reads, revocation and supported cleanup [exact selectors and command checksums], cleanup by [UTC], receipts expiring [UTC], owned by [names]. Unknown outcomes halt writes. No secret generation, env/provider/source/limits/billing changes, deployment, other stores, real users, email/SMS, production, private CAD or CAD bytes, uploads, conversion, Sandbox or lane cleanup.

C — separately needed cleanup after expired or interrupted authority:

> Approve only cleanup/reconciliation/rollback commands [exact reviewed list and checksums] for run [ID], source [full SHA], immutable project [ID] and development deployment [ID], limited to [run-owned selectors and retained counts], by [owner] with backup [name] until [UTC], within [verified remaining all-in cap and provider capacity]. Restore only [enumerated env versions/absence]; disabled rollback deployment is [explicit exact command/source or excluded]. No unknown-write replay, broad table edits, new users/tests, new secrets, limit increases, resource deletion, unrelated records, production, delivery, CAD, Sandbox or branch/worktree cleanup.

## Validation and remaining work

Run the companion tests, existing CAD/Convex/upload/session tests, TypeScript,
local bindings check, integrity and source audits and `git diff --check`. Tests
check closed gates, evidence references, field/card completeness and coverage of
budget/deadline/rollback contracts. They do not verify private values, enforce
spending, simulate distributed persistence or prove live cleanup.

Completed here: explicit evidence contract and private field inventory, appointment
format, time/cost worksheets, command review cards and rollback requirements.
Next: captain reviews this packet and requests publication with its exact commit.
Then obtain private appointments/provider evidence and separately implement the
missing source behavior. Live E/D/T remains blocked by immutable IDs, appointments,
custody, enforceable cap/deadlines, implemented transport/accounting/removal,
diagnostics and compatible rollback evidence. No UI changed; browser/viewport QA,
live provider tests and deployment verification do not apply to this source phase.

Local validation receipt (September 13, 2026):

```sh
npm ci --offline --ignore-scripts --no-audit --no-fund
node --test scripts/cad-convex-*.test.js scripts/cad-upload-session.test.js scripts/cad-upload-session-store.test.js scripts/cad-user-upload-route.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

Lockfile-pinned dependencies restored from local cache, without install scripts or
network. Regression run: 116 passed, zero failed. Initial sandbox run had nine
`listen EPERM` failures; the same suite passed with local fixture binding allowed.
After binding the Auth table inventory/checksum, all four companion tests passed
again. TypeScript passed; five bindings, 73 integrity files, 59 source-audit files
and three Markdown links verified; zero leak-pattern matches. Whitespace passed.
No runtime source changes, provider calls, live tests, publication, cleanup or expense.
