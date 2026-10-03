# Phase 7: consolidated host and custody setup proposal

2026-10-03. **Proposal only; no setup or activation authority.** Recommend reusing the existing Convex project and production slot, workload OIDC for service authentication, and a separately administered AWS custody service backed by S3 Object Lock. The custody resource, identities, budget and policies remain unselected/unapproved. This advances the existing Phase 7 decision; it creates no new roadmap phase.

## Observed metadata and local source

Provider facts below are attributed to the captain's read-only dashboard/deployment review supplied to this lane. This document did not independently query providers. Local source was checked at `ce76eeea8d182b542375ccd205233cbc05f9b5e3` on `codex/cad-auth-controlled-upload-durable-host-source-implementation`.

| Surface | Reported observation | Limit |
| --- | --- | --- |
| Vercel | Project `reversr`, `prj_Geremoki2OhowX1579EolsuPWXPy`; team `vsillahs-projects`, `team_e1YXCCGoccmBLfbBfXGhwbd4` | Inventory, not service-role authentication |
| Production deployment | Ready at `b4a310f84186697c8cb2d751c21bf79265969cad`; `dpl_EsLZUfJK8s6FGLGTBchViTMtuQfw`; [exact target](https://reversr-msuj27lt5-vsillahs-projects.vercel.app); GitHub deployment `6827732705` success | Does not contain or qualify these local host candidates |
| Convex | Team `vambah-sillah`, project `reversr-cad-auth-dev`; dev `majestic-alligator-31` showed deployed 18 days ago; production `wry-tapir-206` showed Never deployed | Production slot exists; no deployed production host code established |
| Storage/integrations | `upstash-kv-claret-coin` offered Connect; Resend/Upstash/Supabase integration names visible | Availability only; no independently qualified custody store confirmed |
| Access | Existing Google SSO allowed Convex inventory; Vercel connector returned team-scope 403 but dashboard worked | Connector reauthentication is not a necessary setup action here |

No tables, logs, env values, keys, private evidence or CAD were inspected. Source still denies: `convex/cadUploadSessionGateway.ts:127–147` authenticates a configured service envelope but never dispatches; `convex/auth.config.ts:3–5` derives development issuer configuration; `offline/cad-convex/controlledUploadHostBridge.ts:5–9` and `controlledUploadAuthorityContinuity.ts:78–80` reject host/custody authority. Principal rows are metadata, not proof. These bytes remain unchanged.

## Recommended host and identity design — unapproved

Reuse `wry-tapir-206` as the eventual durable host; use a separately bounded non-production environment for qualification. Inventory age does not establish that the existing dev deployment is disposable or suitable. Confirm isolation before using it. Convex HTTP actions can call internal queries/mutations but require explicit request parsing; this permits a narrow authenticated entry with fixed operation dispatch. It does not make normal clients able to invoke internal functions. [Convex HTTP actions](https://docs.convex.dev/functions/http-actions).

Evaluate Vercel workload OIDC for the writer. Proposed exact issuer is `https://oidc.vercel.com/vsillahs-projects` **if team issuer mode is confirmed**; proposed audience is `https://vercel.com/vsillahs-projects`; subject is `owner:vsillahs-projects:project:reversr:environment:production`. Require the observed owner/project IDs, exact environment, issuer signature/JWKS, algorithm allowlist, and `iat`/`nbf`/`exp` validation. Reject development/preview tokens at production. These are proposed policy values, not observed token claims or installed settings. Custom audience or global issuer mode requires a separately reviewed exact policy. [Vercel OIDC reference](https://vercel.com/docs/oidc/reference), [API verification](https://vercel.com/docs/oidc/api).

**Project-wide OIDC does not distinguish functions or grant roles.** Do not assign five roles to the same subject based on caller headers, role strings or request paths. Exact deployment/commit approval remains a separate binding; project/environment claims alone do not attest the approved code.

| Role | Proposed distinct execution identity | Permission boundary |
| --- | --- | --- |
| Writer | Approved Vercel production workload | Forward operations only; no approval creation or custody administration |
| Recovery | Separate protected automation identity | Close/revoke/mark unknown only; never restore spent authority |
| Grant custodian | Separately approved protected workflow identity | Install one independently approved binding; cannot self-review evidence |
| Independent reader | Custody-owned readback identity under separate administration | Verify committed state and fresh anchors; cannot create grants |
| Smoke verifier | Separate protected verification workflow identity | Only approved empty-request smoke and evidence submission |

For GitHub workload identities, require exact `https://token.actions.githubusercontent.com` issuer, selected audience, repository/owner IDs, protected environment, approved ref and reusable workflow identity pinned to an approved immutable revision. GitHub documents `job_workflow_ref` and customized subjects; choose exact workflow/repository values before implementation, with no broad repository-wide trust. Separate workflow names alone do not establish independent administrators or reviewers. No workflow identity has been assigned by this proposal. [GitHub OIDC reference](https://docs.github.com/en/actions/reference/security/oidc).

## Independent custody candidate — no resource confirmed

Recommend one small custody service in a separately administered AWS account, with an S3 versioned journal under Object Lock compliance retention. Its independence from Convex restore and documented retention controls make it a practical candidate to evaluate. AWS documents protection of locked object versions during retention; delete markers can still obscure current versions. Object Lock alone is not a monotonic ledger or an authenticated freshness guarantee. [S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html).

Required service behavior:

- Irreversibly reserve one-use approval/run/session identities; append spent/revoked/unknown anchors with epoch, sequence, prior-anchor linkage and exact binding. Never turn missing history into an unused slot.
- Return fresh authenticated high-water reads bound to the requesting operation, nonce and deployed policy; reject cached, replayed, lower-epoch, incomplete or unverifiable histories. A writer's own receipt or self-hash is insufficient.
- Serialize conditional reservation/append and readback; classify lost responses as unknown without redispatch. S3 conditional writes are available, but a multi-record atomic protocol and recovery strategy still need implementation and qualification. [S3 conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html).
- Deny destructive/version-hiding operations to workloads; verify locked version identities, detect pointer/restore regression, audit administration, and fail closed on inaccessible records, keys, clock or custody service. The application writer cannot administer or roll back this resource.
- Approve retention duration, owner, cost and retirement procedure. Preserve minimal anti-replay anchors beyond evidence expiry for as long as any old grant could be presented; retire an authority namespace permanently before approved anchor deletion. Short-lived evidence retention must not silently erase spent history.

No AWS account, bucket, service endpoint, administrator or trust binding is confirmed. Selection/provisioning remains unresolved. Existing Upstash, local files and the Convex database must not be promoted to nonrollbackable custody without independent evidence. No credentials are requested in this document.

## One future setup scope with staged acceptance

This is a consolidated proposal for later authorization, not permission to execute these stages now.

| Stage | Work and acceptance gate |
| --- | --- |
| Source integration | Approve named identity/policy owners, exact non-secret trust values and custody protocol; implement real adapters and bounded parsing. Validate forged/expired/wrong-role identities, immutable binding, one-use reservation, failure persistence and zero admission on uncertainty. Keep runtime entry and upload admission disabled. |
| Bounded non-production qualification | Separately authorize isolated resources, configuration, workload permissions, finite duration and explicit budget. Exercise independent identities, concurrency, crash/lost responses, restore/replay/deletion, expiry/revocation and recovery using synthetic metadata. No private CAD or production upload sessions. Independent reviewers accept provider evidence before advancing. |
| Exact production code/config deployment, admission disabled | Separately authorize deployment of reviewed source to the existing Convex production slot and matching Vercel code/config. Verify exact commit/deployment/resource/identity policy, independently read-back custody, rollback feasibility and closed-route behavior under an expressly scoped smoke approval. No admission enablement or real grant/session creation is implied. |
| Separately approved one-shot activation | Only after all blockers and evidence gates pass: review actual bounded session/grant inputs, window, ceilings, retention, rollback and recovery duty; obtain separate exact activation authority. No hashes, executable command card or live approval phrase are invented here. |

**Hard blockers before activation:** trusted UTC upper-bound and monotonic guards; a defined revocation-to-stream linearization protocol with no unchecked awaited gap; proxy/prebuffering behavior; independently current user/login/upload generations; persistent quarantine when history is ambiguous or writes fail; independent receipt/smoke evidence; and historical rollback incompatibility (`SCHEMA_FORMAT_UNSUPPORTED`, `fixtureCompatible=false`). A lease, timer, signature, build or deployment alone does not close them. Source references: `docs/cad-auth-controlled-upload-durable-host-integration-design.md:52–64`, `docs/cad-auth-controlled-upload-authority-continuity.md`, and `offline/cad-convex/rollbackBaseline.json`. The historical baseline must not be rewritten to manufacture compatibility.

Current exclusions: provider/configuration changes; credential reads/generation; private evidence/data; deployment; upload-session issuance; actual grant installation; new ingress or runtime switches; activation/body reads; conversion/Sandbox; smoke/live requests; external messages; push/PR/merge. **Cost incurred: US$0.** No recurring or unknown spend is approved, and no sub-$10 cap is assumed. Future provisioning requires a reviewed total/usage limit, retention liability and shutdown/retirement cost plan; budget alerts alone are not a spending cap.

## Decision and local validation

Captain/Vambah must select the custody administrator/resource and exact role identities/policies, approve the finite qualification scope/budget, and accept a concrete time/revocation handoff design. Those are the next decisions; they can be recorded using non-secret references without exposing tokens or private evidence.

This change adds only this proposal. Local validation commands:

```sh
git diff --check
node scripts/cad-auth-controlled-upload-durable-host-source-checker.js
node scripts/cad-auth-controlled-upload-authority-continuity-checker.js
git diff --cached --check
git diff --cached --name-status
```

Stop rather than alter any predecessor source-binding packet/checker to accommodate this document. Phase 7 remains source-complete for the bounded candidates, host-unqualified and admission-disabled. Public provider documentation was consulted on 2026-10-03; no provider CLI, configured service, credential or private corpus was accessed.
