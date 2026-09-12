# CAD Convex live provider/environment wiring packet

Prepared 2026-09-12 from `6f0427d10732ecb0fb9e3da06ee2f03d5136163f`.
Branch: `codex/cad-convex-live-wiring-packet`; sibling worktree:
`ReversR-Rebuild.worktrees/cad-convex-live-wiring-packet`.
Status: docs/source audit only. All P/E/D/T gates remain closed.

This packet updates the resource facts and next-step sequence in
[the live setup packet](cad-live-convex-auth-setup-packet.md) and
[assembly review](cad-convex-auth-assembly-review.md). Their security contracts
remain applicable. Resource creation is already reported complete; do not repeat R.
No source deployment, provider setup, env wiring or live qualification is claimed.

## Nonsecret resource register

Provenance: resource facts supplied by the RRb Integration Captain in this lane's
2026-09-12 delegation. They are reported dashboard observations, not independently
reverified in this lane. Reconfirm the complete tuple before future mutations.
These identifiers and endpoints are nonsecret and explicitly in scope for review.

| Field | Supplied value / pending evidence |
| --- | --- |
| Team display name | Vambah Sillah’s team |
| Team slug / ID | `vambah-sillah` / `405220` |
| Plan | Existing Professional team/subscription; no billing, payment, plan, subscription or spending-limit changes |
| Project name | `reversr-cad-auth-dev` |
| Project numeric ID | PENDING dashboard verification; do not infer from team ID |
| Deployment name / type | `majestic-alligator-31` / development |
| Deployment numeric ID | PENDING if exposed by dashboard/tooling |
| Region | US East (N. Virginia) |
| Cloud client URL | `https://majestic-alligator-31.convex.cloud` |
| HTTP Actions URL | `https://majestic-alligator-31.convex.site` |
| Last deployment | Reported dashboard text: **Never deployed** |
| Creation nuance | Project creation surfaced the development target automatically; no source deployment was run |
| Operators | Setup, rollback and access-role ownership PENDING confirmation; team display name alone does not establish the operator's role |
| Application destination | Hosting project ID, exact Preview branch or isolated local origin/port PENDING; no Production or all-branches scope |
| Provider / secrets / release | Method choice, secret-store references, live implementation SHA, command/env/test manifests PENDING |
| Usage limit | Existing subscription is context, not an approved incremental cost or enforceable run cap; bounded execution evidence PENDING |

Expense incurred in this lane: $0. No account console, credential, CAD file or
live data endpoint was accessed. Do not alter the existing subscription to satisfy
a future gate. Unknown incremental usage/cap blocks that execution until resolved.

## Recommended immediate decision

For the first isolated synthetic qualification, recommend **Convex Auth Password**
with disposable test identities and no email/SMS delivery or external OAuth client.
This is engineering judgment about reducing setup dependencies, not a production
security recommendation or a claim that exact-session qualification is complete.
It avoids a second provider console and upstream federation session during the
first test. Accept the library's beta/lifecycle risk explicitly at P-selection.
Real-user password recovery, email verification and enrollment remain out of scope.

| Choice | Benefit for this bounded phase | Remaining risk / work |
| --- | --- | --- |
| Password, synthetic only (recommended) | One auth lifecycle; no external client/callback or delivery vendor | Review pinned implementation, signup restrictions, password handling, rate limits and exact-session expiry/logout/revocation; never treat an unverified email as authority |
| Isolated OAuth client, e.g. GitHub | Familiar browser login | Additional client, callback, secret and upstream lifecycle proof; OAuth alone must not be relabeled as verified OIDC |
| Existing managed OIDC tenant | Potential reuse of established ownership | Tenant existence/entitlement, exact originating-session liveness and revocation must be proven; no tenant or provider is selected |
| Defer live auth | Keeps current disabled behavior with no setup work | No live qualification progress |

Review-only references retrieved 2026-09-12:
[Convex Auth introduction](https://labs.convex.dev/auth) describes beta status;
[Password configuration](https://labs.convex.dev/auth/config/passwords) documents
the Password provider and separate recovery/verification configuration;
[OAuth configuration](https://labs.convex.dev/auth/config/oauth) describes provider
client setup. References are not setup commands or authority to configure anything.
Recheck selected-provider guidance against pinned Convex 1.45.0, Auth 0.0.95 and
Auth Core 0.41.3 before implementation; no package upgrade is proposed.

## Current source blockers and sequence

`convex/auth.ts` has no login providers; `convex/auth.config.ts` has no trusted
issuers. `convex/librarySession.ts` always throws `AUTH_UNAVAILABLE`.
`offline/cad-convex/previewRuntime.js` rejects live mode and accepts only synthetic
`.invalid` origins. Never insert the real endpoints into that synthetic config.
The synthetic session hook is not a runtime verifier. Environment values alone
cannot enable login or CAD authority. User upload routes stay disabled.

Sequence: captain reviews/publication gate → P-selection → separate reviewed
local implementation → P-configuration if applicable → E → D → T.
P-selection is a decision receipt, not console or source configuration authority.
Password has no external provider-console action: mark that P subgate N/A after
selection, and review its local configuration in the implementation commit.
An OAuth/OIDC choice instead requires the exact P-configuration manifest/approval.

Before E, the next implementation lane must deliver a scoped, reviewed source SHA
with provider and issuer assembly, method evidence, trusted exact user/session
verification, owner/liveness checks in the authority snapshot, service-caller
authentication, membership provisioning and redirect policy. Review replay,
unknown-commit/no-blind-retry handling, generation invalidation and rollback.
Do not weaken immediate revocation to make a candidate pass. If the candidate
cannot satisfy the contract, keep authority unavailable and return the failed
requirement to the captain. This documentation commit is not deployable live auth.

## Environment-name/value worksheet

No env file is created. Values below are proposed destination bindings, not installed
configuration. E requires reviewed consuming code and a complete name/scope manifest.
Record nonsecret checksums of manifests only; never hash secrets into public receipts.

| Name / source setting | Proposed value or source | Exact destination / blocker |
| --- | --- | --- |
| `CONVEX_DEPLOYMENT` | PENDING exact selector from approved pinned tooling; target name is `majestic-alligator-31` | Dedicated local tooling only; verify full selector, do not guess prefix or run auto-setup |
| `CONVEX_URL` | `https://majestic-alligator-31.convex.cloud` | Proposed server client; consumer and isolated destination PENDING |
| `EXPO_PUBLIC_CONVEX_URL` | `https://majestic-alligator-31.convex.cloud` | Proposed Expo client public URL; exact Preview branch/local build PENDING |
| `CONVEX_SITE_URL` | `https://majestic-alligator-31.convex.site` | Platform-provided value on this development deployment; verify without overwriting |
| `SITE_URL` | PENDING exact approved app origin, or documented N/A for selected flow | This development deployment only; no inferred/wildcard preview origin |
| `JWT_PRIVATE_KEY` | PENDING fresh deployment-specific key from approved secret-store reference | This development deployment secret editor only; pinned formatting review required |
| `JWKS` | PENDING corresponding public key set | Same development deployment; verify pairing without printing private key |
| OAuth client ID/secret names | N/A for recommended Password path; PENDING exact selected-provider names otherwise | This development deployment only; no external client created here |
| `applicationID` / trusted issuer | Proposed `convex` / the verified HTTP Actions origin | Reviewed `auth.config.ts` source, not env flags; remains empty now |
| Service transport settings | PENDING exact names, verifier and secret-store references | Server-only destination; admin/deployment keys are not runtime credentials |
| CAD upload activation | No authorized setting | Remains closed; no enablement boolean or live loader introduced |

For OAuth only, assemble and verify callback
`https://majestic-alligator-31.convex.site/api/auth/callback/<verified-provider-id>`.
The provider ID remains unresolved, so this is not an approved callback. For Password
without delivery/federation, record external callback/client/logout-console rows N/A.
In either path, approve exact app return/logout routes and redirect validation.
No wildcard origins, production callbacks or native deep links. Sign-out UI alone
does not prove originating-session revocation. Do not use Auth auto-initialization,
implicit env discovery, automatic redeploy, or a production deploy key.

## Operator checklist before any future action

1. Open the Convex dashboard in the in-app Browser. Select team **Vambah Sillah’s
   team**; verify slug `vambah-sillah` and ID `405220` in team details.
2. Select existing project **reversr-cad-auth-dev**. Record its displayed ID and
   the operator's role in the nonsecret receipt; do not select Create Project.
3. In the deployment selector, choose **development / majestic-alligator-31**.
   Confirm region **US East (N. Virginia)**. Stop if any element differs or is hidden
   until read-only evidence resolves it; never accept a similar project name.
4. Copy the displayed client and HTTP Actions endpoints independently. Compare both
   exactly to this register; `.cloud` and `.site` have different purposes.
5. Before the first D, verify **Last deployment: Never deployed**. If it changed,
   stop and reconcile the actor/source receipt; do not overwrite unknown work.
   After D, require the approved source/deployment receipt instead of that text.
6. Confirm the existing Professional subscription context without changing it.
   Verify the scoped usage bound/expiry; an alert alone is not an enforceable cap.
7. For E, open that deployment's Settings → Environment Variables (labels may vary).
   Recheck the selector immediately before saving. For app values, separately open
   the approved host project and exact branch-scoped Preview environment or isolated
   local destination. Record prior presence/version and names only; no secret capture.
8. For D, compare branch, source SHA, function and env manifests and exact command
   manifest with the approved tuple. Review pinned CLI help before proposing the
   command; never let a command create resources or choose a target interactively.
9. Execute only the approved gate, then return sanitized names/IDs, timestamp,
   configuration/deployment version and usage evidence. No tokens, test passwords,
   private CAD filenames, real-user profiles or token-bearing screenshots.
10. Stop on mismatch or missing evidence. Return the failed field and the dashboard
    location needed to resolve it. Do not retry, broaden scope or proceed to the
    next gate based on a generic “proceed”.

## Exact approval phrases

Templates are not approvals. The P-selection phrase is ready to present after
packet review. Other bracketed fields are unresolved reviewed values/manifests;
replace all of them with verified concrete values before requesting execution.
Known team/project/deployment values must stay populated. Each gate is independent.

**P-selection — recommended decision only**

> Approve selecting Convex Auth Password for disposable synthetic auth/session qualification only in reversr-cad-auth-dev, development deployment majestic-alligator-31, team vambah-sillah (405220), accepting the pinned library's beta/lifecycle risk for that bounded evaluation. This records a method decision only. No source/provider/auth configuration, resource creation, env wiring, deployment, live tests, production changes, real-user enrollment, email/SMS delivery, private CAD, CAD upload activation, conversion, Sandbox dispatch or Supabase/other-store mutation.

**P-configuration — conditional external provider only; N/A for Password**

> Approve only [exact create/configure action and client ID/name] in [verified provider/tenant and operator] for reversr-cad-auth-dev, development deployment majestic-alligator-31, team vambah-sillah (405220), using callback/origin/logout manifest [checksum and exact URLs], cost bound [verified terms/cap/expiry] and rollback [exact scoped manifest]. No Convex resource creation, source changes, env wiring, deployment or tests. No production, private CAD, CAD upload activation, conversion, Sandbox dispatch, email/SMS delivery or Supabase/other-store mutation.

**E — exact environment rows only**

> Approve setting only [exact names and name/scope manifest checksum] for reviewed implementation commit [SHA] on reversr-cad-auth-dev, development deployment majestic-alligator-31, team vambah-sillah (405220), and [verified isolated app destination/branch or explicit none], from [approved secret-store references], with rollback [prior versions/absence and permitted restore actions]. No resource/client creation, provider/auth source or console configuration, deployment, issuer/upload activation or live tests. No production env changes, billing/subscription/spending-limit changes, private CAD, conversion, Sandbox dispatch or Supabase/other-store mutation.

**D — development source deployment only**

> Approve deploying only reviewed implementation commit [SHA], source/function manifests [checksums], using exact command manifest [checksum and command], to reversr-cad-auth-dev, development deployment majestic-alligator-31, team vambah-sillah (405220), US East (N. Virginia), within [enforceable usage cap/expiry], with rollback [reviewed disabled source and exact procedure]. No app-host deployment, resource creation, provider-console changes, env changes or live tests. Only the reviewed development auth source is installed; CAD uploads remain disabled. No production, billing/subscription/spending-limit changes, private CAD, conversion, Sandbox dispatch or Supabase/other-store mutation.

**T — bounded synthetic live conformance only**

> Approve running only synthetic auth/session conformance manifest [checksum and commands] at reviewed implementation commit [SHA] on reversr-cad-auth-dev, development deployment majestic-alligator-31, team vambah-sillah (405220), and [verified synthetic harness origin], using [disposable cohort IDs], limited to [duration, transaction count, enforceable cost cap and retention], permitting only [enumerated Convex synthetic auth/session/authority writes and cleanup actions]. No real-user records, provider/env configuration, resource creation, deployment or billing/subscription/spending-limit changes. No production, private CAD or CAD bytes, CAD upload activation, conversion, Sandbox dispatch, email/SMS delivery or Supabase/other-store mutation.

T must exercise exact-session owner/expiry/logout/revocation, stale/wrong identities,
membership disable/regrant, wrong-origin/replay denial, key rotation if authorized,
outage/timeouts, two-client races, unknown commits and restoration without revived
authority. A test needing configuration, redeployment or restore beyond its enumerated
actions stops for the relevant gate. Assert disabled-route rejection before body
reads and zero conversion/Sandbox dispatch. No CAD bytes are needed. Capture only
sanitized receipts. A successful login or local tests cannot substitute for T.

Rollback is not blanket cleanup permission. Before E/D/T, prepare prior config
versions and a reviewed disabled release. Because the target has never been deployed,
there is no assumed prior cloud release to restore: name the disabled source and
explicit rollback deployment authority, or stop and leave the gate closed. Resource
deletion, unrelated data restoration and branch/worktree cleanup remain separate.

## Validation and handoff

The source-audit file list and offline integrity manifest include this packet.
Validation commands, executed locally from the worktree (results in captain handoff):

```sh
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
node --test scripts/cad-convex-*.test.js scripts/cad-provider-store-contract.test.js scripts/cad-upload-session*.test.js scripts/cad-user-upload-route.test.js
git diff --check
```

The manifest writer only regenerates the local integrity artifact. Audit checks
private-key/token/home-path/CAD-content patterns with matched content withheld.
Also scan the staged additions for credential assignments and CAD file extensions,
and validate changed docs' relative Markdown links. Typecheck covers the audit-list
maintenance; no application or Convex runtime code is changed. No UI, live auth,
remote concurrency, preview deployment or production verification is claimed.

Completed scope: populated resource register, separated P decision/configuration,
E/D/T templates, operator checks and source-audit coverage. Next safe step: captain
reviews the local commit and obtains the publication phrase below. Next human
decision after review: P-selection. Live implementation, E/D/T and upload/production
activation remain pending. Preserve this branch/worktree until separate cleanup.

> Approve pushing only commit [reviewed SHA] on branch codex/cad-convex-live-wiring-packet to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the docs/source-only CAD Convex live provider/environment wiring packet. This does not merge, deploy, change production env vars, configure provider/auth settings, enable CAD uploads, dispatch CAD conversion, mutate Supabase/other stores, use private CAD, or cleanup the branch/worktree.
