# Phase 7: isolated Google custody setup plan

Updated October 4, 2026, America/New_York. Source baseline: `cdca94233bdb724cd9253ee93c14cf339830faa1`. This additive plan supplements the [historical setup proposal](cad-auth-controlled-upload-host-custody-setup-proposal.md) and [proposed manifest](../offline/cad-gcp/resources.proposed.json); their bound bytes remain unchanged. Foundation creation is complete. All remaining setup is proposed and uninstalled.

`furtherSpendingAuthorized=false`; `furtherProvisioningAuthorized=false`; `providerQualified=false`; `hostQualified=false`; `bodyAdmissionAuthorized=false`; `liveReady=false`. This documentation work incurred no provider charges; no claim is made about the account's total bill.

## Evidence and planning choices

Captain supplied a read-only console review at **2026-10-04T00:29Z (October 3, 8:29 PM EDT)**: existing Google account access worked; 13 project quota slots remained; 12 accessible projects appeared under No organization, without a `reversr-cad-custody` entry; five billing accounts showed Active Direct; Kinflo Projects Professional was available/defaulted in New Project. The wizard was canceled without submission. This lane did not revisit the console. These observations do not prove global name availability, creation/linkage permission, organization-policy success or resource readiness.

**Subsequent October 4 foundation, verified by Captain and supplied to this lane:** project `reversr-cad-custody`, project number `739935425149`, No organization; billing display **Kinflo Projects Professional** explicitly linked. Authorized creation/linkage is complete and supersedes the earlier absent-project observation. Read-only IAM showed Vambah as the sole human Owner, with no additional principals when Google-provided grants were included. Service accounts had no rows; Workload Identity Pools showed Get started. These UI observations do not establish effective administrative independence or qualification. No APIs, IAM, services, credentials, trust or upload activation were configured in that work. Shared AmaduTown resources were untouched.

Vambah remains **decision owner**, not a verified independent custody administrator. No new Google or AWS account is required for this plan. Region `us-east1` remains proposed. Actual bucket/service resources, service-account numeric subjects, federation provider resources/audiences, mappings, workflow identities, deployed policies and retention durations remain **unbound/null**. Proposed names below are not provisioned IDs or confirmed globally available bucket names. No billing-account IDs, email addresses, raw financial data or screenshots are recorded.

The journal is a pure append planner with modeled counters and unauthenticated inputs. The identity source checks signatures against supplied test keys; public provider entry points remain disabled. Neither is a deployable custody executor. No durable quota transaction, authenticated fresh-reader integration or continuity capability is installed.

## Staged setup and acceptance

These are gates within Phase 7, not permission to execute or new roadmap phases.

Latest human planning direction: Vambah is the sole operator. Plan for eventual enrollment of **up to five testers**, with a **proposed US$25 allowance for the first 30 days of new Google custody infrastructure, no automatic renewal**. Approval to draft this proposal is not accepted operational risk, spending authority, tester enrollment or a live allowance. Commercial retention economics remain unsettled.

| Stage | Proposed action after its authorization | Acceptance before advancing |
| --- | --- | --- |
| 1. Foundation - complete | Preserve the approved project and billing linkage above. | No repeat creation or shared-project changes; no inferred permission for further charges. |
| 2. Decisions and source | Review the sole-operator threat model, finite pilot ledger, tier fixtures and missing executor design below. | Explicit disposition of the unchanged independent-custody gate; reviewed cost/retention proposal. Current authorization covers this document only. |
| 3. Isolated resources | After explicit scope approval, enable only reviewed necessary APIs, create dedicated service accounts, private buckets and admission-disabled services. | Record real resource identities and inspect direct/inherited IAM before callers receive access. Review build/image/logging dependencies and costs first. No irreversible locks. |
| 4. Trust and dispatch | Install exact subject-scoped federation/impersonation, receiving-service audiences, invoker grants and fixed application operation policy. | Confirm issuer mode, claims, protected workflow immutable refs and deployment/commit bindings. Single-operator control remains disclosed; a reviewed policy exception or effective different trust boundary is required before an otherwise blocked pilot can proceed. Token exchange remains separately scoped. |
| 5. Recovery and retention | Install independently protected origin/history, durable quotas/quarantine and restrictive recovery before any admitted operation. | Demonstrate restore-safe stop behavior; separately approve any irreversible lock, its duration and liability. |
| 6. Synthetic qualification | Separately authorize the existing isolated run after the gates above are resolved. | Test competing appends, lost responses, missing/stale/noncurrent/restored history, expired identity and fresh readback; source review does not establish administrative independence. Require accepted restrictive rollback and closed smoke. Later five-person pilot enrollment needs its own authorization; no production upload or private CAD. |

### Proposed resources and minimum workload permissions

All scopes are confined to the actual isolated project above. No temporary Editor, downloadable keys, pool-wide trusts, default compute identity or caller-selected roles. Setup/deployment administrator permissions need their own reviewed allowlist; none are granted by this table.

| Proposed resource or role | Name candidate | Permission/scope and restriction |
| --- | --- | --- |
| Evidence / anchor buckets | `reversr-cad-custody-evidence` / `reversr-cad-custody-anchors` | Regional Standard, flat namespace, uniform bucket-level access, public-access prevention; no workload administration, deletion or metadata edits. Actual resources null. |
| Journal / reader services | `reversr-custody-journal` / `reversr-custody-reader` | Separate workload runtimes and protected deployment paths; both ultimately controlled by the sole operator. Administrative independence unproven; actual URLs/audiences null. |
| Writer | `rrb-custody-writer` | `run.routes.invoke` on journal only; application permits reserve/arm/open/consume. No storage or approval creation. |
| Custody runtime | `rrb-custody-journal` | `storage.objects.create` and `storage.objects.get` on exact two buckets; conditional immutable payload append, no overwrite/delete. |
| Independent reader | `rrb-custody-reader` | `storage.objects.get` and `storage.objects.list` on exact two buckets; no writes, approval or journal invocation. |
| Recovery | `rrb-custody-recovery` | `run.routes.invoke` on journal only; application permits unknown/close/revoke, never restoration of spent authority. |
| Grant custodian | `rrb-custody-approval` | `run.routes.invoke` on journal only; fixed independently reviewed approval operation, no self-review or anchor reset. |
| Smoke verifier | `rrb-custody-smoke` | `run.routes.invoke` on journal only; separately approved closed-smoke evidence operation. |
| Federation candidates | `reversr-custody-workloads`, `reversr-vercel-writer`, `reversr-protected-automation` | Names only. No installed provider or trust; exact external subject and impersonation target must be reviewed. |

Cloud Run invoker IAM alone cannot distinguish journal operations; the absent application dispatcher must enforce the role matrix. The future reader-calling identity and reader-to-Convex authentication remain unresolved, with no implicit invocation grant. [Keyless OIDC federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation) requires exact configured trust; [Cloud Run service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service) requires the receiving audience's Google ID token and invoker authorization. Raw Vercel OIDC is not a Google service ID token. Neither identifies an approved commit or proves independent custody.

Qualification envelope: one run, at most 60 minutes including cleanup, two callers, 1,000 service requests, 1,000 storage operations and 10 MiB synthetic payloads. Reserve 200 requests, 200 operations and 48 KiB for known restrictive cleanup. Count every attempted request, retry, history page and readback. These source limits do not yet enforce durable provider quotas or bound unknown reconciliation costs.

## Sole-operator trust proposal and unchanged blockers

Writer invokes fixed operations without bucket access; custody runtime appends; reader only reads; recovery only closes/revokes/marks unknown; grant custodian submits independently reviewed approval; smoke verifier submits separately approved evidence. These distinct role names or service accounts are insufficient by themselves.

Propose Vambah as decision owner and eventual recovery/shutdown operator, subject to specific execution authorization and a tested runbook. Separate workload identities, narrowly scoped permissions, protected approval/recovery workflows, explicit command review and sanitized audit records reduce accidental misuse and workload compromise. They do not constrain every action of the same human Owner. No independent administrator is invented or required merely to finish source planning.

One administrator cannot establish independent control of writer versus reader code/trust, non-self-approved grants, resistance to Owner impersonation/IAM changes, independently immutable origin/audit history, or independent confirmation of current custody after restore. Separate accounts, service identities and a technical reviewer alone cannot supply those guarantees. Auditability is useful but is not independent tamper-proof custody under sole Owner control.

The existing independent-custody gate and proof requirements remain **unchanged and unmet**. Source review may next propose either (a) a bounded sole-operator pilot policy exception specifying excluded guarantees, synthetic-only data, duration, finite limits, stop rules and explicit residual-risk acceptance, or (b) an effective different trust boundary that supplies the missing guarantees. Neither option is approved or implemented here. An exception would require separately reviewed policy/source changes and acceptance before any gate could behave differently; this document cannot manufacture continuity capability or silently defer the gate. Independent custody and commercial/private-CAD release guarantees remain later release decisions, not promised outcomes of this pilot.

Exact missing trust inputs: approved service-account numeric subjects; service audiences; Vercel issuer mode and owner/project/environment constraints; workflow repository/owner identifiers, protected environment and immutable workflow/ref; subject-scoped mappings and impersonation permissions; deployed commit/policy bindings; reader/verifier nonce, freshness and clock policy. The project number permits later resource binding but is not permission to fabricate full provider URLs or subjects.

Blocking implementation/evidence remains: trusted UTC bounds and monotonic checks; durable quota reservations and quarantine; independently retained namespace/epoch origin and permanent spent history; authenticated fresh nonce/policy-bound generation readback; recovery after expiry, crash and ambiguous writes; current user/login/upload-session generations; and revocation-to-stream linearization without an unchecked awaited gap, including proxy buffering. Conditional create is not proof of no old/noncurrent history; mutable heads and missing buckets cannot restore unused authority. Historical rollback remains the unchanged negative `SCHEMA_FORMAT_UNSUPPORTED` baseline with `fixtureCompatible=false`; selected-host restrictive recovery still needs qualification.

## Retention recommendation and ownership

Recommend **30 days for sanitized evidence details**, with no CAD, request-body or credential bytes. This is a proposed internal-test policy, not a commercial retention promise or installed setting. Evidence created late in the pilot may therefore remain after pilot day 30 and continue costing money. Any separately authorized plumbing experiment without an irreversible lock remains unqualified for immutable custody. Locking a reviewed policy needs distinct approval; it cannot be reduced/removed, and protection ends when each object's retention is satisfied. Editable metadata is not protected payload. [Bucket Lock](https://docs.cloud.google.com/storage/docs/bucket-lock).

Minimal origin/spent/revoked/unknown anchors need retention for the entire old-grant replay lifetime, until safe namespace retirement survives restore. Thirty days does not establish that lifetime. Recommend no automatic anchor deletion; accept ongoing storage liability explicitly or stop before creating retained anchors. Evidence expiry must never erase spent state. The independent verification requirement remains unmet under current sole-operator control. Versions, soft-deleted copies, logs and image artifacts have separate retention/cost decisions.

Vambah is the proposed retention/cost and shutdown owner. Protected recovery should close/revoke/mark unknown before disabling invocation and compute; test this order in fixtures before requesting a run. Independent restrictive-readback/retirement assurance remains unresolved, not assigned to Captain by implication. Retained obligations cannot be erased by budget expiry.

## Finite five-tester pilot proposal and tier QA

Read-only source inspection of `server/commercialization.js` (no import/execution, environment or private reads) confirms defaults: Free five journeys/week; Pro Shop 100/month at US$49; Team 500/month at US$149 with three seats; internal Tester has `unlimitedCredits=true`. These are source defaults, not verified configured entitlements, settled CAD storage quotas, cloud cost limits or conversion authority. Five testers is an eventual enrollment ceiling, not five concurrent sessions. The existing one-session/one-attempt gate is not widened.

Proposed planning ceilings, subject to review and future durable enforcement:

| Dimension | First-30-day pilot proposal |
| --- | --- |
| Enrollment and scenarios | At most five total approved participants; at most 10 synthetic scenario attempts per participant, 50 total. No invitations or enrollment now. |
| Aggregate custody usage | At most 5,000 service requests, 5,000 storage operations and 50 MiB synthetic record payloads across the entire pilot, including qualification, failed attempts, reconciliation and retries. No per-user duplication of this allowance. |
| Restrictive reserve | Within those totals, reserve 1,000 requests, 1,000 operations and 240 KiB for known cleanup/readback. Unknown reconciliation costs deny forward work; reserves are proposals, not proven sufficient provider caps. |
| Run boundary | Any later authorized run stays within the existing 60-minute/two-caller/1,000-request/1,000-operation/10-MiB qualification envelope and its 200/200/48-KiB reserve. Aggregate balance never refreshes; no automatic next run, deadline extension or unknown-outcome forward retry. |
| Billing boundary | Separate durable accounting for setup/build/image/network/logging, compute and retained bytes. Operator review stops new forward work on missing/stale counters, projected envelope exhaustion or uncertain costs; platform billing lag still prevents an all-in guarantee. |

Tier QA uses offline fixture counters near boundaries rather than consuming hundreds of real journeys: Free at 4/5/6 in a synthetic week; Pro at 99/100/101; Team at 499/500/501 and 2/3/4 seats; Tester unlimited entitlement still denied by the finite pilot ledger. Test period changes, plan switches, duplicate commands, rollback/restart, expired windows, mixed participants and concurrent races without resetting pilot reservations. Simulated period rollover must not refresh a live allowance. Deny missing/ambiguous entitlement or usage accounting; no provider calls, checkout, AI generation or conversion are needed for this QA.

Next reviewable source work would specify/implement the separate pilot policy and durable accounting, authenticated executor dispatch, current readback and quarantine/recovery, plus these fixture tests. Existing models are not that executor. Any change to current proof gates requires its own reviewed policy disposition; current documentation authority does not authorize source edits.

## Proposed US$25 allowance: first 30 days only

This proposed allowance covers new Google custody infrastructure only and is **not spending approval or an enforceable all-in ceiling**. Start time remains unbound until a later explicit authorization; no automatic renewal. Suggested planning allocation: US$5 setup/build/image storage; US$8 workload compute/requests; US$4 network/logging/monitoring; US$3 evidence and anti-replay retention; US$5 held for restrictive recovery and cost uncertainty. Allocations total US$25, cannot justify duplicate allowances and are not provider-enforced caps.

Before requesting spending, price actual configurations and account for taxes/currency, build duration, retained images, egress destinations, logs and versions, identity calls where billable, and post-day-30 records. AI generation/conversion, existing Vercel/Convex subscriptions and other product subscriptions are separate and unpriced here. US$25 is not a claim that the entire product or five testers' full tier entitlements are funded.

Stop new pilot work at the earliest of day 30, any usage ceiling, lost accounting or projected exhaustion of the forward allocation; preserve the recovery allocation for restrictive closure. No automatic renewal of usage or budget. Minimal anchors and late-created evidence can keep accruing charges after day 30: quantify and explicitly accept that continuing liability before creating them, and review it at shutdown. If no acceptable retention funding/retirement plan exists, do not start the retained-state pilot. A spending stop cannot authorize deletion or abandonment of recovery. Recurring retention is a separate explicit decision, not hidden renewal of this allowance.

## Cost illustration, not a cap

Public pricing checked October 3, 2026. USD list-price illustration only, ignoring free allowances/discounts. Public tables defaulted to Iowa; the selected `us-east1` SKUs and billing currency must be confirmed before spending. Assume two services, each one vCPU and 0.5 GiB, each active for 3,600 seconds under request-based billing, plus 1,000 total requests: `7200 * (0.000024 + 0.5 * 0.0000025) + 1000 * 0.40 / 1000000 = $0.1822`. This is assumed billable usage, not a maximum-instance enforcement guarantee. [Cloud Run pricing](https://cloud.google.com/run/pricing).

Assume one retained 10 MiB copy for a 730-hour month at the displayed Standard rate `$0.000027397/GiB-hour`: about `$0.000195`. Pricing all 1,000 assumed flat-namespace regional storage operations as Class A at `$0.005/1000` adds `$0.005`. Noncurrent and soft-deleted copies add storage liability. [Storage pricing](https://cloud.google.com/storage/pricing).

Assume 10 MiB ordinary logs at `$0.50/GiB`: about `$0.004883`, before allowances. [Logging pricing](https://cloud.google.com/products/observability/pricing). These modeled components subtotal approximately **$0.1923**. They exclude builds, image storage, egress, identity-service charges where applicable, monitoring, taxes, additional instances/retries, copies and ongoing retention. Review [Cloud Build](https://cloud.google.com/build/pricing) and [Artifact Registry](https://cloud.google.com/artifact-registry/pricing) separately. This is neither a total quote nor spending authority.

Total liability is run usage plus setup/build/network/logging costs plus evidence retention plus enduring anchor storage until proven namespace retirement. Retention duration and deletion authority are undecided; no finite all-in total is established. An estimate below USD10 does not satisfy the standing authorization's enforceable-cap condition.

[Budget alerts](https://docs.cloud.google.com/billing/docs/how-to/budgets) are monitoring, not a spending limit. Current [spend-cap documentation](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps) lists eligible API services including Cloud Run, not Cloud Storage. Enforcement is not instantaneous; in-flight usage/overages are billed, and persistent resources continue accruing charges. Neither feature proves total cost containment or account eligibility here.

## Small next decision and stop plan

Foundation needs no repeated approval. The smallest next decision is whether to **take the bounded sole-operator pilot policy and finite accounting design into source review**, using the proposed five-person/30-day/US$25 planning envelope. This does not ask Vambah to invent an independent administrator. It does not accept residual risk, fund charges or enable a pilot. The review must return an explicit disposition of the unmet independent-custody gate and remaining implementation gaps.

Before any provider mutation, Captain must present the reviewed policy/risk disposition, actual bounded resource/IAM changes, explicit spending decision and retained-state liability. A later setup authorization must identify allowed APIs/resources/roles while keeping admission disabled. A later qualification authorization must separately name its single synthetic run, deadlines, accounting and recovery evidence. Five-person enrollment and any pilot operation remain separately gated after qualification; no automatic refresh. No ceremonial activation phrase or new roadmap phase is needed.

At every later stage, stop on unexpected permissions, identity/policy drift, unknown accounting, missing history, clock uncertainty or failed recovery. Deny forward work; preserve evidence and spent anchors. Complete restrictive recovery, or explicitly record unresolved quarantine, before revoking invocation/impersonation and stopping compute. Name the shutdown operator before a run. Retained storage remains payable. No deletion to evade retention: permanently retire and reject the namespace across verifiers before separately approved anchor deletion after retention. Never delete the shared project/bucket or leave recovery stranded to save cost.

The completed project/billing authorization is exhausted. No current authorization covers further provisioning/spending, credentials/private evidence, API enablement, IAM/federation, token retrieval, provider calls, deployment, irreversible locks, grants, upload sessions, body admission or activation. Later synthetic qualification implies neither production uploads, private CAD, conversion nor commercialization. The next deliverable is Captain review of this uncommitted document. Phase 7 remains open and blocked on actual authority/cost decisions before provider mutation.
