# CAD development Auth configuration gate

Base: `88ccc6f771823240816d0fd88f450dcff766d694` (PR #186).
Branch: `codex/cad-live-dev-auth-config-gate`; assigned worktree suffix:
`ReversR-Rebuild.worktrees/cad-live-dev-auth-config-gate`.
Status: source/local review only; no live approval or execution. Expense: $0.

This packet continues [source assembly](cad-live-auth-source-assembly.md),
[E/D/T planning](cad-live-dev-edt-approval-packet.md),
[configuration qualification](cad-live-dev-convex-auth-qualification.md),
[readiness](cad-convex-live-auth-readiness.md),
[wiring](cad-convex-live-wiring-packet.md), and
[setup](cad-live-convex-auth-setup-packet.md). Earlier claims that SITE_URL is
unresolved, that no exact-session reader exists, or that up to eight identities
are allowed are superseded for this candidate by PR #186: exact local origin,
source-gated session reader, maximum two identities. This is still not live proof.

The new [worksheet](../offline/cad-convex/developmentConfigurationGate.json) is
intentionally closed: evidence fields must stay null, all permissions false,
and the cohort empty. Its pure local inspector rejects unknown fields and any
changed constant, including evidence strings, environment values and commands.
A valid worksheet means only that the source packet is intact. It cannot ingest
approval receipts. Later evidence belongs in a separate private operator register;
changing this contract requires source review, never filling it with secrets.
The existing developmentExecution.json remains historical planning context, not
execution authority. Its old base/rollback SHAs are not verified cloud releases.

## Source-backed decisions and evidence before configuration

| Item | Current source-backed candidate | Evidence required before any live configuration |
| --- | --- | --- |
| Destination | Team `vambah-sillah`, team ID `405220`; project `reversr-cad-auth-dev`; development `majestic-alligator-31` | Fresh dashboard observation, immutable project and deployment IDs if exposed, region, role, release, UTC time and opaque receipt. If IDs are unavailable, stop and resolve identity evidence; never substitute team ID. |
| Endpoints | Client `https://majestic-alligator-31.convex.cloud`; issuer/HTTP Actions `https://majestic-alligator-31.convex.site` | Read independently from the exact deployment, bind both to the identity receipt; no suffix substitution. These values are inherited observations, not refreshed here. |
| SITE_URL | `http://localhost:5001` in convex/developmentAuth.ts; package.json web-preview specifies port 5001 | Confirm isolated harness binds exactly this origin and source SHA. The script's port is not proof of a running auth harness. No 127.0.0.1 alias, wildcard, HTTPS preview or native deep link. |
| Source consumer | developmentConfiguration checks exact SITE_URL and CONVEX_SITE_URL; developmentRedirect accepts only `/` or exact absolute root | Source checksum and negative redirect checks. Pinned Auth 0.0.95 implementation/redirects.ts also calls siteUrl(), which reads SITE_URL for default return handling. It is required for this candidate, not N/A. |
| Provider P | Password ID `password`, applicationID `convex`; no external OAuth client/callback or delivery provider | Explicit method and beta-lifecycle acceptance; isolated Password-only deployment and empty prior session history proof. Provider selection alone grants no console or source mutation. |
| Cohort | Empty; later maximum two existing synthetic `cad-test-*` accounts under `auth-test.invalid` | Exact opaque cohort/run IDs, unique fixture addresses, named provisioning owner, reviewed provisioning and revocation commands, vault password references, 15-minute session TTL. Current source rejects signup/reset/verification and has no provisioning implementation. |
| Source gates | developmentAuthReviewed=false; developmentPassword([]); empty providers/issuers | Later separately reviewed source change for cohort and auth gate. E installs rows only and must not open this source gate. |
| Exact session | SDK identity plus originating session/owner point reads through supplied deadline horizon | Live expiry/logout/revoke and method-provenance tests; trusted gateway freshness checks. Source tests are not remote concurrency evidence. |
| Service | Internal CAD functions; local service candidate only | Reviewed transport and service credential mechanism, exact subject/audience, verified user-context propagation, durable run ledger and unknown-commit reconciliation. No deploy/admin key as runtime authority. |
| Operator | None appointed in this packet | Named executor and backup, accepted custody/rollback responsibility, verified access, receipt location and UTC expiration. Account admin status alone is insufficient. |

In the later authorized read-only evidence pass: open the in-app Browser to Convex
dashboard, select the named team, project and development deployment, compare all
identifiers, then inspect release, Settings / Environment Variables, Authentication,
Usage Limits and diagnostics. Capture names, presence and nonsecret IDs only.
Stop on mismatch or unexplained existing state. Return sanitized receipt references
to the captain; never send environment values, profiles, tokens or raw auth traces.
No dashboard inspection or provider API request is performed in this lane.

## Environment row manifest and custody

Only these three proposed E rows belong to the exact development deployment above.
Each row needs prior absence/version, approved new custody/version reference,
consumer SHA, operator, UTC expiry and an individually authorized rollback action.
Do not store row values or secret hashes in this worksheet or Git.

| Name | Scope / consumer | Future evidence | Rollback |
| --- | --- | --- | --- |
| JWT_PRIVATE_KEY | Development deployment secret; pinned Auth RS256 PKCS8 signer and source presence guard | K receipt, reviewed generator checksum, matching key-pair validation, restricted vault item/version, presence only | Remove only this newly installed row, or restore its approved prior vault version |
| JWKS | Same development deployment; Auth verification set and source presence guard | Matching signer version, reviewed public schema/algorithm; no key contents needed in receipt | Restore/remove this row in coordination with signer and session invalidation |
| SITE_URL | Same development deployment; exact-origin guard and Auth return handling | Exact `http://localhost:5001`, source consumer and return allowlist evidence | Restore approved previous origin/version or remove newly installed row |

CONVEX_SITE_URL is platform-owned: inspect only, never overwrite. CONVEX_DEPLOYMENT
is a future tooling selector, not an E row or runtime credential. CONVEX_URL,
EXPO_PUBLIC_CONVEX_URL, OAuth rows, deploy keys, service credentials, app host rows,
API settings and upload switches are excluded. No production or all-branch scope.
Password requires no external provider-console change in this packet; an unexpected
provider-console requirement returns to P review instead of broadening E.

K preparation must name an existing approved encrypted vault or OS credential
store, exact restricted item location, custodian/backup and access/recovery policy.
Review the local generator source/checksum and pinned signer format before approval.
After K only, use OS entropy, restrictive permissions, local sign/verify validation,
and value-free receipts; no stdout, shell argument, history, clipboard, screenshots,
telemetry, synced scratch copies or chat disclosure. Remove transient copies using
the approved procedure. This lane creates neither generator nor keys. Do not run
Auth initialization: it can combine key generation, env mutation and source edits.
Synthetic passwords need separate named custody items and explicit generation scope.

## Usage, command and rollback manifests

U remains unresolved. The proposed incremental all-in ceiling is US$5, with no
recurring commitment. Before E/D/T, verify current rates, existing usage, tax/fees,
all billable dimensions and enforceable coverage/lag. Zero usage and alerts are
insufficient. A metered estimate is not a cap. Unsupported precision or missing
metrics in the predecessor's proposed limits must be resolved without silently
rounding up. Limit installation/change requires its separate U approval; none here.
Keep diagnostics S separate, including client-log redaction evidence.

T planning bounds: one run, 15 minutes, two identities, two clients, at most 100
initiated logical operations, one in-flight operation per service candidate,
zero automatic retries. Account for backend fan-out and both clients against a
single run budget; per-instance counters alone do not enforce that aggregate.
Reserve cleanup capacity within the approved total and stop before a UTC reset.
No process restart/resumption after failure. Unknown writes require a durable
sanitized receipt and separately approved read reconciliation, never blind replay.

No runnable live command exists in this packet. Before D/T, a reviewed command
manifest must contain absolute pinned executable/version/checksum, exact argv,
working directory/branch/implementation SHA, independently verified destination
selector, approved credential reference mechanism, timeout, operation accounting,
expected result codes, redaction behavior and rollback command. No implicit default
project selection, interactive setup, watch mode, initialization or latest-package
install. Never put secrets into argv. Fill D and T separately, with checksums.

Required T command cases and acceptance:

1. Explicitly authorized provisioning of only the two run-owned synthetic accounts,
   with no signup endpoint, email or SMS. Abort if prior auth history is unexplained.
2. Existing-account sign-in; deny wrong cohort, extra parameters, signup, reset,
   verification and wrong return origins. Verify exact issuer/audience and expiry.
3. Wrong owner/session, deleted/expired/replaced session, membership disable/regrant,
   service mismatch, stale response and replay all deny; no positive authority cache.
4. Two-client insertion/revocation races, timeouts and unknown writes stop safely,
   retaining counts and opaque outcomes. A later reviewed harness must reconcile
   trusted user identity with internal function calls; do not expose CAD functions.
5. For the reviewed route fixture: missing session gives USER_SESSION_REQUIRED,
   unverifiable token gives USER_AUTH_UNAVAILABLE, valid session still gives
   USER_UPLOADS_DISABLED before body access; zero CAD bytes, conversion or Sandbox.
6. Approved exact-cohort revocation/deletion, retained-record accounting and final
   usage receipt. Cookie/CSRF checks apply if the reviewed transport uses cookies;
   transport absence is a blocker, not an excuse to claim a pass.

C cleanup is a separate live-state gate, not Git cleanup. Prepare exact run IDs,
record selectors/count bounds and library-supported revocation/removal operations;
no manual auth-table edits or table-wide deletes. Maximum synthetic retention is
24 hours with an exact UTC deadline; sanitized private receipts expire after the
approved 30 days. Provider log/backup retention is separate, and committed source
has Git history. An unavailable cleanup path blocks T before it begins.

E rollback is row-specific. D rollback needs a reviewed disabled source SHA and
schema/data compatibility proof; the recorded never-deployed state does not supply
a previous cloud release. Redeployment does not itself revoke sessions or undo data.
C must enumerate invalidation, row restoration, any explicitly allowed rollback
deployment and unused vault-version removal in dependency order. Retain protective
usage limits. On failure stop, report exact retained cohort/count/deadline to the
owner, and do not broaden deletion or raise limits. Resource deletion, billing and
branch/worktree cleanup remain excluded.

## Future approval phrases

These are templates, not approval requests or executable commands. Before presenting
one, replace every bracket with verified values from a reviewed private register,
including full implementation and packet SHAs, manifest checksums, named operator
and expiry. Missing fields block that gate. Approval is external to the committed
worksheet and cannot make its inspector return executable=true.

K — secret generation/storage only:

> Approve one local generation and storage of the development-only RS256 signing pair [and explicitly enumerated synthetic-password items, or none] for team vambah-sillah (405220), project reversr-cad-auth-dev, development majestic-alligator-31 [immutable IDs], from packet [SHA] on codex/cad-live-dev-auth-config-gate, using generator [path/checksum] and custody/transient-removal manifest [checksum], executed by [operator/backup] into existing vault [opaque location/version policy] before [UTC expiry]. No env/provider configuration, deployment, live tests, deploy keys, enrollment, email/SMS, resource or billing change, production, private CAD, uploads, conversion or Sandbox dispatch.

E — development rows only (P selection must already be recorded):

> Approve installing only JWT_PRIVATE_KEY, JWKS and SITE_URL under row manifest [checksum], from approved custody references [opaque versions], for reviewed source [SHA] and packet [SHA] on codex/cad-live-dev-auth-config-gate, only in team vambah-sillah (405220), project reversr-cad-auth-dev, development majestic-alligator-31 [immutable IDs], by [operator/backup] before [UTC expiry], within verified budget [cap/evidence], with row-specific rollback [checksum]. Password selection receipt [reference] authorizes no external provider-console changes. No CONVEX_SITE_URL overwrite, source-gate opening, provider/auth-console mutation, secret generation, deploy keys, deployment, live tests, enrollment, email/SMS, resource/billing changes, production, private CAD, uploads, conversion or Sandbox dispatch.

D — development deployment only:

> Approve one deployment of reviewed source [SHA] from [exact branch/worktree] with source/function/command manifests [checksums], packet [SHA], solely to team vambah-sillah (405220), project reversr-cad-auth-dev, development majestic-alligator-31 [immutable IDs], executed by [operator/backup] before [UTC expiry] within [verified cap/usage receipt], with explicitly authorized disabled rollback [SHA/command/checksum and compatibility evidence]. No env/provider or limit changes, key generation, deploy keys, provisioning, tests, app/production deployment, resource/billing changes, email/SMS, private CAD, upload activation, conversion or Sandbox dispatch.

T — synthetic live qualification only:

> Approve one synthetic Auth/session run at deployed source [SHA], packet [SHA], command/provisioning/cohort manifests [checksums], on team vambah-sillah (405220), project reversr-cad-auth-dev, development majestic-alligator-31 [immutable IDs], by [operator/backup], with at most two synthetic identities, two clients, 100 aggregate initiated operations including reserved cleanup, 15 minutes, zero retries, before [UTC expiry], within [enforceable all-in cap]. Permit only enumerated run-owned synthetic writes and cleanup [manifest/actions/deadline], with durable receipt/reconciliation policy [checksum]. No real users, delivery, env/provider/resource/limit/billing changes, key generation, deployment, production, private CAD, upload activation, CAD bytes, conversion or Sandbox dispatch; no Supabase or unrelated-store mutation.

C — exact live cleanup only:

> Approve only cleanup manifest [checksum/exact ordered actions and bounded record selectors] for run [opaque ID] at source [SHA], packet [SHA], on team vambah-sillah (405220), project reversr-cad-auth-dev, development majestic-alligator-31 [immutable IDs], by [operator/backup] before [UTC deadline] within [remaining enforced cap]. Permit only listed session revocation, run-owned record removal, row/version restoration and disabled rollback deployment [explicit SHA/command or none]. No table-wide deletion, manual library-table edits, unrelated vault/store changes, limit raising, resource/billing changes, production, enrollment, delivery, private CAD, uploads, conversion, Sandbox dispatch or branch/worktree cleanup.

No external provider mutation is currently justified. If later selected, prepare a
separate P phrase naming exact provider/tenant/client/action/callback manifest,
source SHA, owner, cost and rollback, before requesting it. Generic approval of
this packet cannot authorize that unselected action.

## Local validation and handoff

Run only the following local checks with existing pinned dependencies:

```sh
node --test scripts/cad-convex-*.test.js scripts/cad-user-upload-route.test.js
node scripts/cad-convex-codegen.js --check
node node_modules/typescript/bin/tsc --noEmit
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

The inspector has no runtime imports or I/O; mutation tests reject every changed
leaf, missing/extra field, populated evidence, cohort enrollment and true gate.
VM tests forbid environment/network/filesystem/provider capabilities. The expanded
source audit includes these artifacts and rejects runtime references to the new
inspector. Pattern scans supplement review; they cannot detect all possible secrets
in arbitrary prose. Existing route/source tests retain disabled admission behavior.
No runtime/backend/UI code changed; live behavior and browser QA are untested.

Completed phase: source-backed configuration specification and closed worksheet.
Next: captain reviews the local commit; separately gathers authorized evidence and
resolves implementation/custody/budget gaps before any live phrase is actionable.
Keep the task/worktree open. Publication is the next human gate, separately scoped
by full local commit SHA; no push, PR, merge or cleanup was performed here.

Validation receipt: all 85 focused tests passed with the exact test command above
using `--test-reporter=dot`; TypeScript and all five local generated bindings passed.
The 67-file integrity manifest and 53-file source/leak audit passed. Initial fixture
listeners were blocked by sandbox EPERM on loopback; the same local suite passed
with reviewed loopback permission. No live provider was contacted. Existing pinned
dependencies were reused through an ignored symlink; no install or lockfile change.
Whitespace validation passed. No UI, remote concurrency or deployment proof claimed.
