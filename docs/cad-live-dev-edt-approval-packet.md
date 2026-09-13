# CAD live development E/D/T operator approval packet

Prepared 2026-09-12 from `96a68ac253d08be9ae2b8bd8227da5aa09496bb8`.
Branch: `codex/cad-live-dev-edt-approval-packet`; sibling worktree:
`ReversR-Rebuild.worktrees/cad-live-dev-edt-approval-packet`.
Status: **planning only; no live gate approved or executed**.

This continues the [live wiring packet](cad-convex-live-wiring-packet.md) and
[configuration qualification](cad-live-dev-convex-auth-qualification.md).
Their runtime safety requirements remain in force. This packet is an operator
register, not a machine-readable authorization or a live qualification receipt.
No env file, secret, provider client, deployment, synthetic account or store record
was created. Expense: $0. Public publication remains separately gated.

## Evidence register

Source: Integration Captain's read-only dashboard observations supplied with this
lane's delegation on 2026-09-12. Observation time and screenshot/receipt identifiers
were not supplied. These are reported observations, not independently refreshed
here. Absence means dashboard-visible absence, not proof that no hidden state exists.
Account email is deliberately omitted from this public-review candidate.

| ID | Surface | Supplied observation | Before execution |
| --- | --- | --- | --- |
| EV-01 | Team | Vambah Sillah’s team; `vambah-sillah`; ID `405220` | Confirm exact team and operator role |
| EV-02 | Project / deployment | `reversr-cad-auth-dev` / development `majestic-alligator-31`; US East (N. Virginia) | Record immutable project/deployment IDs if exposed; never substitute team ID |
| EV-03 | Endpoints | Client `https://majestic-alligator-31.convex.cloud`; HTTP Actions `https://majestic-alligator-31.convex.site` | Read each independently; no string substitution |
| EV-04 | Release / health | Never deployed; All clear | No verified previous cloud release; stop on unexplained change |
| EV-05 | Deployment settings | Running; expiry never; no deploy tokens visible | No key creation or auto-expiry assumption |
| EV-06 | Diagnostic settings | Send Logs to Client enabled by default; Dashboard Edit Confirmation disabled by default | Review log redaction; settings changes need separate S approval |
| EV-07 | Environment Variables | No visible rows or names | Record row-specific absence immediately before E; never export values |
| EV-08 | Authentication | No providers yet | Source providers/issuers also empty at base; no enabled auth claim |
| EV-09 | Usage Limits | Monthly usage all zero; no warning/disable thresholds configured | Zero usage is no cost ceiling; U gate remains pending |
| EV-10 | Project admins | Vambah Sillah: Team Admin and Project Admin | Role does not appoint an execution or rollback operator |
| EV-11 | Project settings | No preview deploy keys, authorized applications or default env vars visible | Do not populate these as implicit prerequisites |

For each refreshed row, record UTC time, operator, opaque evidence reference,
destination tuple and outcome in the private operator register. Publish only
nonsecret identifiers/status and manifest checksums; exclude raw screenshots with
profiles, token-bearing URLs, secret values and secret hashes. Capture no CAD data.
The existing Professional subscription is inherited context from the predecessor,
not a fresh billing verification or authority to change recurring commitments.

## Unresolved decisions

Every recommendation below is pending acceptance. A decision receipt does not
permit the related provider mutation. Captain resolves these together in a single
worksheet before presenting the distinct execution phrases.

| Decision | Recommended default | Alternative | Evidence / owner needed |
| --- | --- | --- | --- |
| Method | Password, disposable existing synthetic accounts only; no sign-up/reset/verification delivery | Defer; or separately scoped OAuth/OIDC packet | P-selection receipt; reviewed restrictions and beta-risk acceptance |
| SITE_URL / app origin | Isolated local web harness, proposed `http://localhost:5001`; set SITE_URL only if reviewed source consumes it | Exact protected HTTPS preview origin; or N/A with source proof that no selected flow consumes it | Confirm host/port, approved return/logout paths and source references; port comes from existing web-preview script, not an observed harness |
| Usage guardrail | Deployment daily and monthly warning/disable limits plus a bounded harness; target incremental all-in ceiling US$5 | Defer; separately approved different cap | Supported units/minima, current usage, all billable dimensions, tax/fee coverage and enforceability evidence; alert alone fails |
| Secret generation/storage | Fresh deployment-specific RS256 pair; existing user-owned encrypted secret vault, restricted operator access | OS credential store with verified recovery/access controls | Exact vault/item/version references, generator source review and named custodian; no vault selected or created here |
| Rollback owner | Vambah accountable; explicitly named executing captain/operator and backup | Named delegated admin | Both role verification and acceptance; backup pending, no assumed access |
| Test retention | Remove/revoke only run-owned synthetic credentials/sessions/records at run end; maximum 24 hours; retain sanitized receipts 30 days | Shorter retention; longer only with explicit purpose and approval | Exact UTC deletion deadline, cohort selector, dependency-safe deletion order, owner and evidence location |

Localhost and `127.0.0.1` are distinct origins. Do not silently accept both. A HTTPS
preview requires its own exact hosting project/branch, protection and hosting gate;
this packet grants no app deployment. Native deep links remain outside this phase.
Review return/logout allowlists and wrong-origin/redirect rejection before E/D.
The `.cloud` client URL and `.site` issuer are not app origins. Do not overwrite
platform-owned `CONVEX_SITE_URL` or feed real URLs into the synthetic preview config.

## Usage proposal and prerequisite U

Proposed starting resource bounds for one run (engineering recommendations, not
provider defaults or a demonstrated dollar cap): apply both daily and monthly
windows, warning at 50% of each disable value.

| Metric | Warning | Disable |
| --- | --- | --- |
| Function calls | 500 calls | 1,000 calls |
| Database I/O | 0.005 GB | 0.01 GB |
| Data egress | 0.005 GB | 0.01 GB |
| Action compute, each applicable runtime metric | 0.0005 GB-hours | 0.001 GB-hours |
| Search queries, if available/applicable | 0.0005 query-GB | 0.001 query-GB |

Before U, replace unsupported precision/minima or missing billable metrics with a
reviewed complete manifest; never round upward silently. Any dedicated compute,
storage, backup or other charges outside these metrics require separate accounting.
Recommended harness bound: one 15-minute run, two synthetic identities, two clients,
maximum 100 initiated logical test operations, no blind retries or background loops.
Count backend fan-out separately against resource limits. Reserve explicit capacity
for cleanup; do not depend on cleanup succeeding after a disable threshold fires.
Stop before a UTC window reset; new windows do not authorize resumed work.

Official [usage-limit documentation](https://docs.convex.dev/production/usage-limits)
checked 2026-09-12: per-deployment resource limits support daily/monthly UTC windows;
disable thresholds stop calls but reset automatically. Development thresholds do
not send team notification emails. These limits are distinct from team dollar
spending limits. Do not assume a deployment resource bound proves an all-in cost
cap or silently change a team-wide limit affecting other projects.

Current account rates, existing commitments, metric coverage and enforcement lag
must be verified before E/D/T execution. US$5 is a proposed ceiling, not verified
spending authority. If no enforceable all-in bound can be established, execution
stays blocked pending a concrete cost decision; no purchase or recurring change
is requested here. U permits only reviewed deployment limit rows, independently
of E/D/T. Raising or removing a tripped limit is a new decision, not routine retry.

## Secret plan and prerequisite K

No keys or passwords are generated in this lane. Before K, inspect the pinned
Convex Auth 0.0.95 signer and formatting requirements (RS256, PKCS8), review the
exact generator and matching public JWKS schema, and bind generator checksum.
Use a vetted local cryptographic generator with OS entropy and restrictive file
permissions, no stdout/private-key output, shell arguments/history, telemetry,
clipboard recording, synced scratch directory, screenshots or chat disclosure.
Do not use Auth initialization: it can combine source and environment mutations.

After K only: generate once in an approved isolated local secret-handling context;
verify sign/verify pairing locally without emitting secret material; place the pair
in the approved existing vault; record only opaque item/version references and
pass/fail receipt. Remove transient copies under the approved procedure. Secret
hashes, passwords, JWTs and private keys never enter Git, logs, MP4s or this packet.
JWKS is public verification data, but its version must match the private signer.
Synthetic passwords require their own named items in the later T fixture manifest.
No reuse of personal or production credentials; no deploy key as runtime identity.

E is a separate gate installing only reviewed rows. Proposed minimum is
`JWT_PRIVATE_KEY` and `JWKS`; `SITE_URL` is conditional on the accepted source-backed
decision. App URL rows and service credentials remain excluded until consuming
source and exact destinations are reviewed. Row receipts contain name, scope,
prior absence/version, new vault version reference and rollback action, never value.

## Rollback and retention worksheet

| Gate | Required prepared rollback | Success evidence / stop rule |
| --- | --- | --- |
| U | Exact prior thresholds/absence; retain protective limits by default | Limit manifest and history receipt; no automatic raising/removal |
| K | Revoke access/remove only newly generated unused vault versions and transient copies | Value-free deletion/access receipt; no unrelated vault cleanup |
| E | Restore prior version or remove only individually approved newly added rows | Presence/scope receipt; no inferred all-env reset |
| D | Reviewed disabled source SHA, exact destination/command and explicit rollback deployment authority | No prior cloud deployment exists; never invent a previous release |
| T | Revoke exact run sessions and credentials; delete only enumerated run-owned records in reviewed dependency order | Counts and opaque cohort receipt; no table-wide delete or production restore |

Before D, prove the disabled candidate is compatible with the proposed schema and
retained records. A source rollback does not undo data or necessarily revoke issued
tokens. Enumerate session invalidation separately; do not manually edit library-owned
auth tables. If a cleanup path is unavailable, stop the harness and report the exact
retained cohort and deadline to the named owner; do not claim cleanup or retry an
unknown commit blindly. At 24 hours, unresolved retention is a blocker requiring
owner action, not automatic permission to broaden deletion. No scheduled job is
created by this plan. Provider backup/log retention must be recorded separately;
application record deletion does not prove erasure from provider backups.

The 30-day recommendation applies to private sanitized run receipts. Committed
source documentation has Git history and is not promised 30-day erasure. Never put
raw auth traces in it. Resource deletion, account suspension, billing changes and
branch/worktree cleanup remain excluded from all rollback actions.

## Operator sequence and completion criteria

1. Captain reviews this local packet and obtains publication authority separately.
2. In the in-app Browser: Convex dashboard → team `vambah-sillah` → project
   `reversr-cad-auth-dev` → development `majestic-alligator-31`. Refresh EV-01–11,
   record nonsecret evidence and stop if target, role or release differs.
3. Resolve the decision table; bind exact manifests, owners, evidence timestamps,
   expiration and implementation SHA. Missing fields keep execution closed.
4. Separate implementation review must deliver provider/issuer assembly, exact
   session ownership/liveness, service-caller authentication, durable replay and
   unknown-commit handling, synthetic provisioning and disabled-upload behavior.
   Current providers/issuers are empty and session reader throws AUTH_UNAVAILABLE.
   This documentation commit is not that implementation. The existing synthetic
   qualification inspector cannot authorize E/D/T or accept live evidence.
5. Present U, K and optional S independently; after each approved action collect
   its receipt. P-selection is separate; P-console is N/A only after Password
   selection is accepted. Use predecessor P-console packet for another method.
6. E: Settings → Environment Variables → recheck development selector → change only
   approved names → confirm presence/scope without disclosure → return receipt.
   No automatic deployment. D waits for E verification and its own approval.
7. D: compare reviewed source/function/env/command manifests and destination with
   approval, verify pinned CLI command is explicit and noninteractive, then deploy
   only that source. No guessed command is supplied before implementation exists.
   Record release identifier, source SHA and rollback readiness; no test execution.
8. T: use a separately approved cohort/provisioning manifest and bounded harness.
   Prove exact-session expiry/logout/revocation, owner mismatch, permission
   disable/regrant, wrong origin/replay, two-client races, timeout/unknown outcomes
   and restoration without revived authority. Rotation needs an explicit E/D
   subgate if it changes configuration/source. Record all affected remote writes.
9. Verify upload-route denial before body reads and zero conversion/Sandbox dispatch.
   At completion, stop clients, perform only approved cleanup, collect counts,
   retained-record exceptions, usage and cap evidence. No real-user or CAD testing.

## Exact future approval wording

These are templates, not grants. Known destination values are filled. Captain must
replace every bracket with verified values, expand referenced manifests into the
review packet, and present each complete phrase. A missing SHA, command, owner,
cap or rollback action prevents an execution request. No invented values should
be used to make a template appear executable. The decision phrase is presentable
now; E/D/T become presentable only after implementation and evidence prerequisites.

**Decision only**

> Approve the recommended planning defaults in the CAD live development E/D/T packet for reversr-cad-auth-dev, development majestic-alligator-31, team vambah-sillah (405220): isolated localhost:5001 web harness subject to source-backed SITE_URL review, proposed US$5 all-in incremental ceiling and deployment resource bounds, existing encrypted-vault storage, Vambah accountable for rollback with executing operator and backup still to be named, run-end cleanup within 24 hours and 30-day sanitized receipt retention. This accepts planning direction only; unresolved evidence remains blocking. No source, resource, env, secret generation, auth/provider, limit, deployment, store, live-test, production, email/SMS, CAD, Sandbox or cleanup action is authorized.

**U — deployment usage guardrails only**

> Approve setting only deployment usage-limit manifest [checksum; exact metrics, units, warning/disable values and UTC windows] on reversr-cad-auth-dev, development majestic-alligator-31, team vambah-sillah (405220), by [operator], with previous-state/rollback manifest [checksum and exact actions] and expiry [UTC]. No team spending-limit, billing/subscription, resource, secret, env, provider/auth, deployment, live-test or store changes. No production, email/SMS, private CAD, uploads, conversion, Sandbox or lane cleanup.

**K — local generation and existing-vault storage only**

> Approve generating one development-only signing pair using reviewed generator [source SHA/checksum and exact invocation] and storing it at [existing vault/item reference] for reversr-cad-auth-dev, development majestic-alligator-31, team vambah-sillah (405220), by [custodian/operator], with local pair verification and transient-copy cleanup [exact procedure], recovery [manifest] and expiry [UTC]. No secret output in logs/chat/Git, new vault/resource, env installation, provider/auth configuration, deployment, live tests, store writes, production, email/SMS, CAD, conversion, Sandbox or lane cleanup.

**S — optional diagnostic settings only**

> Approve only disabling Send Logs to Client and enabling Dashboard Edit Confirmation on reversr-cad-auth-dev, development majestic-alligator-31, team vambah-sillah (405220), by [operator], with rollback [prior values and exact approved actions]. No other setting, env, key, resource, provider/auth, deployment, live-test, store, billing, production, email/SMS, CAD, conversion, Sandbox or lane-cleanup action.

**E — environment only**

> Approve installing only [exact names and name/scope manifest checksum] from [approved existing vault/item/version references] for reviewed implementation [full SHA] on reversr-cad-auth-dev, development majestic-alligator-31, team vambah-sillah (405220), app destination [exact isolated destination or none], by [operator], before [UTC expiry], under verified cost bound [evidence reference], with row-specific rollback [checksum; prior versions/absence and exact actions]. Do not overwrite platform-owned CONVEX_SITE_URL. No new secrets/resources/keys, provider/auth source or console changes, limits/billing changes, deployment, live tests, store writes, production, real-user enrollment, email/SMS, private CAD, upload activation, conversion, Sandbox or lane cleanup.

**D — development deployment only**

> Approve deploying only implementation [full SHA], source/function manifests [checksums], exact command [invocation and manifest checksum], to reversr-cad-auth-dev, development majestic-alligator-31, team vambah-sillah (405220), US East (N. Virginia), by [operator], within [verified all-in cap, resource bounds and UTC expiry], with rollback [disabled-source SHA, compatibility evidence, exact command/destination, trigger and operator]. This authorizes only the reviewed development auth source and explicitly enumerated rollback deployment. No app-host deployment, new resource/key, env or provider-console change, limits/billing change, live tests, test provisioning, unrelated store writes, production, real-user enrollment, email/SMS, private CAD, upload activation, conversion, Sandbox or lane cleanup.

**T — one synthetic live run only**

> Approve one synthetic auth/session conformance run at implementation [full SHA] and deployment receipt [ID] on reversr-cad-auth-dev, development majestic-alligator-31, team vambah-sillah (405220), harness [exact origin/source SHA], test manifest [checksum and commands], cohort [opaque IDs], by [operator], bounded by [duration, operation and resource limits, verified all-in cap and UTC expiry]. Permit only Convex run-owned synthetic provisioning, auth/session/authority writes, revocation and cleanup explicitly enumerated in [manifest/checksum], with retention deadline [UTC], receipt expiry [UTC], rollback actions [exact list] and owner/backup [names]. No real-user records, new resources/keys, provider/env/source/limit/billing changes, deployment, email/SMS, production, private CAD or CAD bytes, upload activation, conversion, Sandbox, other-store mutation or lane cleanup. Stop on unknown outcomes; reconcile under the manifest before any retry.

## Local validation and handoff

This Markdown packet and the continuation link are included in the existing
source/leak audit and integrity manifest. Validation commands:

```sh
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

Local receipt: 58 integrity-manifest files verified; 44 source-audit files passed
with zero leak-pattern matches; seven relative Markdown links resolved; whitespace
check passed. No dependency install or runtime test was needed for this docs-only
change.

Also check changed relative Markdown links and ensure the diff contains documentation,
audit-list maintenance and integrity metadata only. No structured authorization
loader is introduced, so no new runtime tests are needed. No UI was changed;
viewport review, live auth, remote concurrency and production smoke are not claimed.

Completed: evidence register, decision options, separate prerequisite/E/D/T phrases,
secret/rollback/retention plans. Next safe action: captain reviews the committed
packet. Next human decisions: publication and planning defaults, then named owners
and source-backed execution manifests. Live implementation, budget enforcement and
operator evidence remain blocking. All live gates and uploads remain closed.

**Publication only — substitute the reviewed final commit**

> Approve pushing only commit [full reviewed SHA] on branch codex/cad-live-dev-edt-approval-packet to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the documentation/source-only CAD live development E/D/T approval packet. No merge, deployment, provider/auth/resource mutation, environment changes, secret generation, deploy keys, usage-limit or billing changes, live tests, enrollment, email/SMS, store writes, private CAD, CAD uploads, conversion, Sandbox dispatch or branch/worktree cleanup.
