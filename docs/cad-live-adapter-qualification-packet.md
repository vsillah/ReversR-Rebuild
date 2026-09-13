# Future synthetic durable-adapter qualification packet

Source base: `8303051b5df1645b165aee7e2b2e2781c1b5c512`.
Branch: `codex/cad-live-adapter-qualification-packet`.

This is an unfilled, offline review template, not an executable runner. No live
resource, adapter, auth setup, custody acceptance or cost enforcement is verified.
`liveAdapterRunPacket.json` records the proposed ceilings and pending evidence;
its pure JS checker accepts only the exact closed template. It cannot validate a
filled run dossier or grant authority. A later source-reviewed preflight and
separately approved runner are required. All twelve requirements from
`sharedControlsAdapterQualification.json` remain unqualified.

## Prepare a concrete dossier before requesting a live run

1. Pin the future adapter's full commit and reviewed runner commit. Copy this
   template into a separately reviewed dossier; assign a unique run ID and exact
   synthetic namespace. Record the exact resource privately and a non-sensitive
   alias publicly. Record engine/version, transaction isolation configuration,
   schema/index revisions and evidence that the resource contains no real data.
2. Bind the namespace server-side in every read, write, index and claim. Deny
   selectors outside it, missing namespace and attempts to choose a new ledger.
   Use one global ledger and one active window, shared by both independent clients;
   never split budgets by user, shop or client. Use distinct synthetic users,
   memberships, login/session metadata and revocation rows, without real Auth
   enrollment. No files, CAD bytes, passwords or tokens belong in fixtures.
3. Verify existing resource privileges support only the listed metadata operations.
   The allowlist is a proposal, not current store authority. No outbox consumption,
   HTTP body admission or downstream side effects are allowed. Resource creation,
   schema/provider configuration, store restart, backup/restore, deletion and
   rollover require their own exact approval. If fault injection cannot be done
   without those operations, mark that scenario blocked; do not emulate a pass.
4. Obtain named primary and backup custodian acceptance and an escalation owner.
   The primary owns unresolved selectors, due queue, evidence and stop decisions;
   backup takes over only through a new CAS claim generation. Neither can release
   holds merely because the run expired. Identify a compatible recovery operator
   and evidence reviewer, plus a durable custody destination without credentials.
5. Set exact UTC start and expiry (`YYYY-MM-DDTHH:mm:ssZ`), at most 1,800 seconds
   apart. Stop before expiry; every operation must fit its deadline and remaining
   run window. Reject expired approval, clock rollback, missing prerequisites or
   changed commit/resource/namespace/digest. No automatic extension or second run.
6. Complete cost and evidence worksheets, review reconciliation/rollback below,
   and hash the exact final UTF-8 dossier bytes with SHA-256. Keep that digest in
   an external approval envelope, avoiding a self-referential digest. Bind both
   source commits and the digest to explicit approval. Any edit invalidates it.

## Bounded resource and operation worksheet

Proposed maximums are encoded in the template: two clients, 64 synthetic records,
40 unresolved records for pagination, 4 KiB per record, 1 MiB total stored metadata,
1 MiB sanitized evidence, 256 logical commands and 768 total transaction attempts.
Counts include fixture seeding, injected faults, reads, retries and reconciliation;
stop on the first exhausted limit. Record scenario allocation before approval.
A transaction has at most three attempts within 5,000 ms, conflict backoffs of
100 and 250 ms, and a fresh authority/ledger/trusted-clock read on every attempt.
Denials and schema/binding errors are terminal. Unknown acknowledgements trigger
selector lookup within the same counters, never blind retry or a replacement key.

Claims last at most 60 seconds. Reconciliation permits two passes of at most four
pages of 32 selectors, with durable cursor/high-water state. At most two client
restarts and one separately authorized isolated-store restart are proposed.
These ceilings may be too small for all scenarios: allocate and review them first;
if any case cannot fit, narrow the run or request a separately bounded later run.
No cap increase is implied. Window rollover remains rejected, not implemented.

## Serializable transaction evidence plan

For each requirement ID, preserve scenario ID, immutable command digest, complete
synthetic selector (ledger, window, user, shop, upload session, login session,
attempt key, fence), client ID, transaction/claim revisions, trusted timestamps,
read dependencies, commit/abort result and before/after accounting. A ledger-only
CAS or a JSON round-trip is insufficient. Collect independent engine transaction
receipts or equivalent verifiable serialization evidence, with reviewer disposition.

- Race the final user, shop and global-cost slot from independent clients. Race
  authority-only revocation/deletion and missing-row creation against reservation,
  denial and fencing. Prove read-set/range dependencies prevent stale admission.
- Inject abort before commit: attempts, both leases, holds and any inert handoff
  marker must be all present or all absent. Lose acknowledgement after commit,
  restart clients, resolve the original selector once and retain acknowledged state.
  Actual store crash/recovery proof stays pending until separately authorized.
- Exhaust explicit conflicts; prove bounded attempts/deadlines and zero side effects.
  Lost handoff acknowledgement must retain the hold and enter custody, never dispatch.
- Use 40 unresolved records to cross a page boundary. Restart cursors, poison an
  early entry, expire/reassign a claim and reject settlement by the stale custodian.
  Persist progress only after commit; restart sweeps to revisit earlier unresolved
  records. Exhausted passes leave an explicit handoff to accepted custody.
- Demonstrate expiry/cancellation/unknown outcomes retain both leases and all-in
  hold. Replay identical independent synthetic terminal receipts once; conflicting
  receipts or mismatched selectors cannot refund. Synthetic receipt fixtures must
  be owned by a separate evidence verifier, not supplied as caller authority.
- Reject unsupported schemas and old/new window fence collisions without deleting
  state or starting a fresh ledger. Proving actual rollback recovery requires an
  approved backup/restore exercise; source-only rejection is not that proof.

## Cost cap worksheet

Proposed ceiling: USD 9.00, not an approved spend or verified provider cap. Fill
integer microdollar amounts for compute, storage, operations, backup, egress,
taxes/fees/currency conversion and contingency; sum must be at most 9,000,000 and
at most the independently enforced cap. Attach dated pricing, exact meter/quantity
limits and proof that enforcement covers all resources and retained-state costs.
An alert, estimate, credit balance or application ledger does not enforce spend.
Recurring commitments are excluded. No provider/billing changes are authorized.
If retention after expiry has unknown cost or hard enforcement is unavailable,
keep the run blocked. Do not delete evidence or unresolved holds to satisfy cost.
Record actual cost and receipt evidence after an approved run; current expenses: zero.

## Sanitized evidence register

One pending slot exists for each prior requirement, with artifact reference,
SHA-256, run ID, adapter commit, resource alias, UTC interval, reviewer and disposition.
In the future dossier attach engine/isolation and scenario references to each slot.
Use disposition pass/fail/blocked only after review; no offline result fills live
slots. Keep raw provider traces in the approved restricted evidence destination;
public artifacts contain synthetic aliases and sanitized summaries only. Exclude
secrets, auth headers, raw account IDs, local private paths and private CAD. Review
and hash sanitized copies before publication; hashes attest bytes, not correctness.

## Reconciliation and rollback procedure

1. On expiry, limit exhaustion, unknown result or safety failure, stop new commands
   and verify admission remains disabled. Preserve selectors, immutable bindings,
   attempts, holds, actual costs, terminal receipts, claim generations and cursor.
2. Primary custodian resolves unknown outcomes using the original selector and
   authoritative receipt. Claim with CAS; only current claim generation may settle.
   Identical settlement is idempotent. Missing/conflicting evidence retains both
   leases and the full hold and escalates; timeout cannot imply zero cost.
3. If primary fails, backup acquires a new generation after claim expiry. Revisit
   unresolved earlier pages and persist due work. No work beyond approved UTC expiry:
   hand custody to the accepted owner and obtain a fresh reconciliation-only approval.
4. Keep source rollback separate from data rollback. Reject unsupported schema,
   retain acknowledged commits and history, and use a reviewed compatible reconciler.
   Record backup baseline and recovery evidence before any separately approved
   restore. Never overwrite a newer ledger with an older backup or erase unknowns.
5. Close the run only when evidence and costs reconcile or unresolved custody is
   explicitly accepted. Retention/deletion, resource retirement and lane cleanup
   remain separate decisions. Expiry closes authority, not accounting obligations.

## Disabled-route verification checklist

Run the explicit offline commands below. Mounted loopback tests must prove the
user upload route refuses before body subscription and admission, with no store or
conversion effects. Verify the literal false body gate and source audit isolation
across runtime directories. Preserve other protected-route authentication guards.
No environment switch, runtime import or route wiring is added. Do not call hosted
routes, live Auth/Convex or conversion suites. No UI changed; viewport QA is inapplicable.

```sh
node --test scripts/cad-live-adapter-run-packet.test.js scripts/cad-shared-controls-adapter-qualification.test.js scripts/cad-upload-shared-controls.test.js scripts/cad-user-upload-admission.test.js scripts/cad-user-upload-route.test.js scripts/cad-user-upload-activation-readiness.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

## Exact future approvals

Placeholders must be replaced with reviewed immutable values; these are templates,
not current requests. Generic proceed and source publication do not approve a run.

Publication:
> Approve pushing only commit [full SHA] from codex/cad-live-adapter-qualification-packet to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD live adapter qualification packet. No merge, deploy, live tests, env/provider/auth/resource or usage/billing changes, secrets, enrollment, email/SMS, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch or lane cleanup.

Provisioning, only if later needed:
> Approve only provisioning synthetic resource [exact resource and environment] under reviewed packet [SHA-256], with operations [exact configuration/provisioning allowlist], operator [name], UTC window [start to expiry] and enforceable all-in cap [USD amount and evidence]. No live qualification, production access, Auth enrollment, secrets generation, uploads, conversion, Sandbox, messages, merge, deployment or cleanup. Any credential or billing-setting change requires separate approval.

Live run:
> Approve one synthetic durable-adapter qualification run at adapter commit [full SHA] and runner commit [full SHA], packet [SHA-256], resource [exact resource], namespace [exact namespace], custodian [accepted primary and backup], UTC window [start to expiry], operations [exact allowlist and counters], enforceable all-in cap [USD amount and evidence], and reconciliation/rollback procedure [reviewed reference]. Keep CAD uploads disabled. No production access, private CAD, conversion, Sandbox, enrollment, email/SMS, env/provider/auth/resource or billing changes, secrets generation, backup/restore, store restart, rollover, deletion, merge, deployment or lane cleanup.

Recovery, only after a concrete recovery dossier exists:
> Approve only [exact reconciliation or backup/restore or isolated-store-restart operations] for synthetic run [ID], resource [exact resource], namespace [exact namespace], source [full SHA], recovery packet [SHA-256], custodian [accepted owner], UTC window [start to expiry] and enforceable all-in cap [USD amount and evidence]. Preserve all acknowledged commits, holds and selector history. Keep admission disabled. No new qualification run, production access, uploads, conversion, private CAD, Sandbox, enrollment, messages, provisioning, secrets, merge, deployment or deletion.

Next: captain reviews the local source commit. A filled, independently reviewed
resource/cost/custody dossier and future runner are still required before live approval.

## Local validation result

All 40 focused tests passed, TypeScript passed, five local SDK binding files
verified, and the 113-file source audit passed with zero leak-pattern matches.
Initial mounted tests lacked Express; `npm ci --offline --ignore-scripts --no-audit
--no-fund` installed locked dependencies from local cache and the full focused list
then passed. Existing dependency and Promise-like-handler deprecations were reported.
Manifest regeneration/check and whitespace checks passed. No runtime files changed,
no live service or conversion suite ran, and no expenses or scope deviations occurred.
The desktop sandbox initially rejected its symlinked writable root; reviewed direct
access to the assigned canonical worktree was used for local commands only.
