# CAD live Convex/Auth setup packet — preview/development only

Prepared 2026-09-12 from `ec16dab8b1f435ff456be863643cc881f1dcd847`
(PR #177). Branch: `codex/cad-live-convex-auth-setup-packet`.
Worktree: sibling `ReversR-Rebuild.worktrees/cad-live-convex-auth-setup-packet`.
Status: preparation only; all live gates below are closed. This document changes no
runtime behavior. It supersedes the combined auth/environment approval wording in
[the synthetic preview packet](cad-convex-preview-setup.md) for future live setup.
Historical SQL/provider alternatives are not an instruction to provision them.

## Source inventory and review boundary

| Merged scope | Current source/contract | What it does not prove |
| --- | --- | --- |
| #164 | `docs/cad-import-ux.md`: metadata-only Import entry | Upload or conversion readiness |
| #165–166 | `docs/cad-user-upload-contract.md`, `docs/cad-upload-session-foundation.md` | Live user authentication |
| #167–169 | `docs/cad-upload-issuer-store.md`, disabled `server/cadUserUploadRouter.js`, rejected commercial-auth tests | Mounted issuer or durable authority |
| Verified-login and provider design sequence before #173 | `docs/cad-verified-login-store.md`, `docs/cad-provider-decision-packet.md` | Provider selection/console configuration; historical SQL is not an active migration |
| #173 | `server/convexUploadSessionStore.js`, `docs/cad-convex-store-design.md` | Live transport; the store is an injected port |
| #174–175 | `offline/cad-convex/{backend,gateway,sessionAdapter,admissionHarness}.js` | Real gateway identity, remote transactions, or upstream revocation |
| #176 | `convex/schema.ts`, `convex/cad.ts`, `convex/librarySession.ts`, local `_generated` bindings | Cloud deployment or qualified Auth assembly |
| #177 | `offline/cad-convex/previewRuntime.js` and its tests | Any live mode or automatic env selection |

Inspected schema first using the Convex expert/reviewer checklists. The schema uses
library `authTables`, typed users/authSessions IDs, user and membership generation
records, digest-only upload credentials, and indexed lookup paths. Six registered CAD
functions are internal, with argument and return validators. Five are on the gateway
allowlist; `cad:changeAuthority` is excluded. The backend avoids unbounded collect and
filter scans. Policy provisioning needs an independently authorized operator path.

`convex/auth.ts`, `convex/auth.config.ts`, and `convex/http.ts` now have a
disabled source-only assembly; see [the assembly review](cad-convex-auth-assembly-review.md).
Login providers and trusted JWT issuers remain empty.
`readExactLibrarySession` always throws `AUTH_UNAVAILABLE`. Generated bindings come
from pinned local SDK templates, not a live deployment receipt. Pins are Convex
1.45.0, Convex Auth 0.0.95 and Auth Core 0.41.3. No SDK upgrade is proposed.
The skill's deployment verification step is excluded by this lane's explicit scope;
local checks cannot replace that later qualification.

The synthetic configuration has exactly `mode`, `target`, `deploymentUrl`,
`issuerUrl`, `appOrigin`, `applicationId`. Only synthetic `.invalid` HTTPS origins,
`applicationId: 'convex'`, and local/preview targets pass structural inspection.
Live mode returns `LIVE_AUTH_UNQUALIFIED`. Fresh trusted verification is required per
operation; it is not an env flag. Even accepted synthetic configuration reports
`liveAuthReady: false` and `uploadsEnabled: false`. Do not put live URLs into it.

## Destination/value register — fill before any live approval

All actual account/resource/provider values below are **PENDING, unverified**.
No console or billing account was inspected. Obtain values in the in-app Browser;
record nonsecret identifiers only in a private operator register. Public review uses
opaque record IDs and a checksum of the name/scope manifest, never secret hashes.

| Record | Exact value/evidence needed | Destination check |
| --- | --- | --- |
| Owner | Account owner, setup operator, backup/rollback operator, access roles | Confirm ownership in team settings; no unrelated team's resource |
| Convex | Team ID, project ID/name, deployment ID/name/type, supported region | Dashboard project and deployment selector must both match; development only |
| Application | Hosting team/project ID, preview branch scope and exact origin; optional local origin/port | No Production or all-branches scope; preview protection retained |
| Backend endpoints | Dashboard deployment client URL and HTTP Actions URL | Record independently; same deployment; no guessed URL substitution |
| Auth choice | Approved library lifecycle/beta risk, method/provider ID, tenant/client IDs | Isolated test client; no production account reuse |
| Authority policy | Synthetic users/shops, provisioning owner, login/session TTL, revocation semantics | No browser-supplied owner, role, session-liveness or permission claims |
| Service identity | Caller verifier, key owner/rotation, audience, replay policy and bounded envelope | Design/implementation pending; a deployment/admin key is not runtime auth |
| Release | Reviewed source SHA, function manifest SHA-256, env-name/scope manifest SHA-256 | Future live assembly must be reviewed; this doc commit is not deployable auth |
| Recovery | Previous disabled release/config version, key revocation and session invalidation plan | No rollback to permissive/legacy fallback |
| Cost | Verified plan, currency, taxes/fees, recurring terms, enforceable cap and expiry | Unknown price or alert-only budget blocks execution |

Cost incurred by this lane: $0. At execution, verify the current account plan and
limits directly. The standing below-$10 authorization applies only to a known total
strictly below US$10 with an enforceable metered cap and no recurring commitment;
it does not open resource, data or configuration gates. Record receipt/usage,
cap enforcement and remaining recurring obligations. Do not split workloads.

## Environment-name and scope manifest

This is a specification, not an env file. **No CAD live env loader exists.**
Rows marked proposed need reviewed consuming code before wiring. Record each row's
approved destination, source secret-store reference, access roles, presence check,
and prior version/absence for rollback. Never export env values to logs or chat.

| Name/configuration | Required value | Scope/status |
| --- | --- | --- |
| `CONVEX_DEPLOYMENT` | Exact approved development selector | Future local deployment tooling only; not runtime authority |
| `CONVEX_URL` | Dashboard client endpoint for that deployment | Proposed server client wiring; no consumer added here |
| `EXPO_PUBLIC_CONVEX_URL` | Same reviewed client endpoint | Proposed Expo client build value; public URL only, no credential |
| `CONVEX_SITE_URL` | Dashboard HTTP Actions origin | Convex-provided deployment value; verify, do not overwrite |
| `SITE_URL` | Exact approved preview app origin, or separately reviewed local origin/port | Convex development deployment; OAuth redirect target; password-only may not need it |
| `JWT_PRIVATE_KEY` | Fresh deployment-specific signing key | Convex development secret only; never client/build exposure |
| `JWKS` | Public verification key set matching the signing key | Same Convex deployment; verify pair without logging private material |
| `AUTH_<PROVIDER>_ID`, `AUTH_<PROVIDER>_SECRET` | Approved test client identifier/secret | Conditional OAuth names: finalize from selected provider; e.g. GitHub uses `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET`, not selected by this packet |
| `applicationID` in `auth.config.ts` | Literal `convex` for proposed Convex Auth assembly | Source configuration, not an env variable; issuer is `CONVEX_SITE_URL` |
| Gateway origin/service credentials | Exact name list is PENDING until transport design review | Server secret store only; no invented enablement boolean |
| Upload activation | No setting authorized | Route remains permanently disabled; env changes cannot substitute for reviewed code |

Do not add `CONVEX_DEPLOY_KEY` to the application or browser. Any future CI deployment
credential requires its own scoped environment manifest and deployment authority.
Avoid automatic Auth initialization: it combines source and env changes. Review the
pinned implementation's key formatting requirements before a later key installation;
never paste PEM into shell history or run key generators that print secrets to logs.

Official references checked 2026-09-12: [manual Auth setup](https://labs.convex.dev/auth/setup/manual)
for signing keys and auth/http assembly; [OAuth setup](https://labs.convex.dev/auth/config/oauth)
for callback shape and provider variable examples; [deployment environment variables](https://docs.convex.dev/production/environment-variables)
for destination scoping. Recheck selected provider documentation at execution.
Current generic setup examples differ from the repo's Auth Core pin; examples do not
authorize upgrading or copying Vite-specific env names into this Expo app.

## Callback, origin and logout worksheet

1. Record exact HTTPS preview app origin and any distinct API origin. For local-only
   tests, record the exact loopback host and port separately; no wildcard origin.
2. Record the actual Convex HTTP Actions origin from its dashboard. The proposed OAuth
   callback is `<HTTP Actions origin>/api/auth/callback/<approved provider ID>`.
   Fill every segment before approval. It is not the app origin or `.cloud` client URL.
3. Record the post-login return URL as an exact allowlisted app route. Future redirect
   validation must reject external origins, credentials, protocol-relative URLs and
   unexpected ports; no arbitrary `redirectTo` from a request.
4. Record allowed web origins/CORS only where the selected provider or gateway needs
   them. Keep callback URLs, web origins and post-login paths separate. Use exact
   entries; no wildcard preview domains or production callbacks.
5. Record the exact post-logout app URL and, if supported, upstream logout callback.
   Convex sign-out, upstream provider logout, and CAD credential revocation are separate
   behaviors. Provider-specific logout endpoint/parameters remain PENDING. A redirect
   to a signed-out screen is not evidence the originating session was revoked.
6. Review secure cookie attributes, credentialed CORS and CSRF for the chosen transport;
   test wrong-origin and missing-CSRF failures. Native deep links are outside this web
   preview setup; adding one requires its own allowlist and review.
7. Success evidence: sanitized URL/name manifest, displayed destination IDs and checksums;
   no token-bearing callback captures, profiles or unredacted screenshots.

## Implementation prerequisites and operator sequence

Before live execution, a separate implementation review must deliver the full
`auth.ts`/`auth.config.ts`/`http.ts` assembly and qualified exact-login reader; keep
library tables library-owned. Verify authenticated identity and originating session
owner/liveness in the same authority snapshot, not merely JWT validity. Preserve
internal references, validators, bounded indexed reads and generation invalidation.
Review membership provisioning, replay protection, service caller authentication,
unknown-commit handling, no blind retry, and live two-client races/restore tests.

For each gate: fill the register, present its complete phrase, receive that approval,
then open the named destination in the in-app Browser. Recheck owner/project/type
immediately before saving. Stop on mismatch. Complete only that gate and return its
sanitized receipt. Suggested order: resource R; local implementation review; provider
P and environment E independently; deployment D; synthetic conformance T. Provider
and environment setup do not permit deploying even if the console suggests doing so.

- R: Convex dashboard → approved team → project creation → compare name, region,
  plan/cap → create only after approval. Return resource IDs/type and cost receipt.
- P: approved provider console → exact test client → callback/origin/logout settings.
  Client creation must be explicitly included if needed. Save only the URL manifest;
  return configuration version and IDs. Do not complete production setup prompts.
- E: Convex dashboard → exact development deployment → Settings → Environment Variables;
  separately, approved host project → Settings → Environment Variables → branch-scoped
  Preview. UI labels may differ: verify displayed destination. Enter only approved
  rows in the secret editor. No automatic redeploy. Return names/presence/scope only.
- D: captain verifies SHA and manifests and reviews exact pinned CLI help/command
  against the destination; then deploys only the approved target. No generic command
  is supplied here because implicit project selection can hit the wrong environment.
- T: execute the reviewed synthetic test manifest; no CAD bytes. Return denied/allowed
  authority results, route codes, zero body reads/dispatch, rollback and usage receipts.

## Rollback and fail-closed acceptance

Record previous configuration presence/version before any E change. On mismatch,
verification outage, replay, late acknowledgement or failed revocation, stop the
harness and deny issuance; never grant cached authority or fall back to commercial
identity. Under the approved rollback manifest, restore/remove only changed preview
rows, revoke the scoped test client/key, invalidate test sessions, and restore the
reviewed disabled deployment if deployment rollback was explicitly authorized.
Resource deletion and data restoration need their own reviewed authority; do not
assume deleting a resource cancels a subscription. Retain sanitized receipts only.

Required synthetic/local assertions (existing tests): missing/malformed/live config
cannot construct live authority; unverified/failed/timed-out checks cannot issue;
wrong/expired/revoked login and changed membership deny; valid synthetic authority
still reaches `USER_UPLOADS_DISABLED` before body access. Default user route expects
`USER_SESSION_REQUIRED` without a credential and `USER_AUTH_UNAVAILABLE` for an
unverifiable syntactic credential. Protected conversion route remains `UNAUTHORIZED`
without service authorization. These are expected contracts, not new production probes.
Later T must prove remote revocation, concurrency and unknown-commit behavior explicitly.

## Exact future approval phrases

Templates are not approvals. Replace every bracket with verified concrete values;
an unresolved field keeps that gate closed. Each phrase includes the common boundary:
**preview/development only; no production, private CAD, conversion, Sandbox dispatch,
Supabase/other-store mutation or upload activation.** Read that boundary with each
phrase when presenting it, rather than omitting exclusions for brevity.

**R — resource creation only**
> Approve creating only Convex development project [name] in team [ID], region [region], owned by [owner], on [verified plan/recurring terms] within [enforceable total cap/expiry], per packet [SHA]. No deployment, provider configuration, environment wiring or tests. Preview/development only; no production, private CAD, conversion, Sandbox dispatch, Supabase/other-store mutation or upload activation.

**P — provider console only**
> Approve only [create/configure, specify] test client [name/ID] in [provider/tenant], owned by [owner], for [method/lifecycle-risk decision], with exact callback/origin/logout manifest [checksum and URLs], cost [verified cap/terms] and rollback [manifest]. No Convex resource creation, env wiring, deployment or tests. Preview/development only; no production, private CAD, conversion, Sandbox dispatch, Supabase/other-store mutation or upload activation.

**E — environment wiring only**
> Approve setting only name/scope manifest [checksum and names] for reviewed commit [SHA] on [Convex development ID] and [host project/Preview branch or local environment], from [approved secret-store references], with rollback [manifest]. No resource/client creation, provider-console change, deployment, issuer activation or tests. Preview/development only; no production, private CAD, conversion, Sandbox dispatch, Supabase/other-store mutation or upload activation.

**D — deployment only**
> Approve deploying reviewed commit [SHA], function/source manifests [checksums], using exact command manifest [checksum], to [development deployment/preview project and branch], within [cap/expiry], with rollback [disabled release and procedure]. No resource, provider or env changes and no tests. Preview/development only; no production, private CAD, conversion, Sandbox dispatch, Supabase/other-store mutation or upload activation.

**T — synthetic live qualification only**
> Approve only synthetic auth/session conformance manifest [commands/checksum] at commit [SHA] on [exact development destinations], using [synthetic identity/cohort IDs], bounded by [cap, duration, transaction limit, retention], including rollback [exact permitted actions]. No real-user records, CAD bytes, resource creation, provider/env changes or deployment. Preview/development only; no production, private CAD, conversion, Sandbox dispatch, Supabase/other-store mutation or upload activation.

Upload activation is a later independent product/code/deployment decision; use the
separate A packet in [the historical gate checklist](cad-provider-setup-checklist.md)
only after replacing destination/provider assumptions with the qualified Convex design.
Its required fields are exact commit/deployment/cohort, conformance receipts, limits,
enforceable budget, admission/worker manifests, rollback owner and expiry. It does not
authorize file submission. Each conversion would require a separate exact C packet.
Production resource/env/deployment approval must also be separately prepared; none is
requested here.

## Local validation receipt

Passed 2026-09-12: 71/71 existing focused tests; TypeScript; five pinned generated
bindings; 33-file contract manifest; 19-file source/leak audit and runtime isolation.
Commands from this worktree root:

```sh
node --test scripts/cad-convex-*.test.js scripts/cad-provider-store-contract.test.js scripts/cad-upload-session*.test.js scripts/cad-user-upload-route.test.js
npm run typecheck
npm run cad:convex:codegen:check
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

The existing source audit covers its fixed source list, not this new document. A
separate local scan of this packet checks private-key/token/private-path/CAD-content
patterns and relative Markdown targets. The final staged diff must contain only this
Markdown file; tracked runtime, bindings, manifest and evidence remain unchanged.
Tests reuse the sibling schema-functions node_modules via an ignored local symlink;
no install or env file is involved. The sandbox's symlinked root prevented startup;
reviewed shell escalation allowed canonical-worktree commands and loopback tests.
No test failure occurred. Full release CI was not rerun for this documentation-only
change; focused route coverage, typecheck and static checks passed. No UI, viewport,
live auth/store concurrency, hosted preview or production validation is claimed.

Completed: concrete preview setup and approval packet. Next: captain reviews this
local commit, then obtains exact publication authority below. Live execution still
requires populated owner/destination/provider/cost records and the implementation
qualification above. No resource, env/provider mutation, deployment, upload, private
CAD, Sandbox, Supabase action or expense occurred. Keep this task open.

Publication template (replace the SHA after local commit review):

> Approve pushing only commit [full reviewed SHA] from codex/cad-live-convex-auth-setup-packet to vsillah/ReversR-Rebuild and opening a draft PR against main for the documentation-only preview/development Convex/Auth setup packet. No merge, deployment, resource creation, provider/auth or env configuration, Supabase/other-store mutation, private CAD, conversion, Sandbox dispatch or user-upload activation.
