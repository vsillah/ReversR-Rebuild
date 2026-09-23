# CAD Auth live-evidence collection proposal

Status: **source-only planning complete; live collection blocked and unauthorized**.
The [machine packet](cad-auth-live-evidence-packet.json) is a pending plan, not a
collector or provider acceptance receipt. Its checker always reports
`readyForLiveCollection: false`. This change leaves all runtime sources unchanged.

## Candidate and deployment provenance

| Reference | Reviewed value | Meaning |
| --- | --- | --- |
| Acceptance contract | [PR #383](https://github.com/vsillah/ReversR-Rebuild/pull/383), merge `b885f1f9a569b5bfa5627858cbb1542342b7da43` | Twelve required categories |
| Candidate harness | [PR #384](https://github.com/vsillah/ReversR-Rebuild/pull/384), head `96b465bc8f27b4b7a0b79a7ac2c932f07dfa53a8`, merge `dc7d733cff6d94841725e721cc8e7b0da7be4cff` | Inert candidate; no production provider adapter |
| App deployment | GitHub deployment `6613179379`, Production, status success at `2026-09-23T11:49:34Z` | GitHub metadata only, bound to #384 merge |
| Deployment URL | [Immutable app deployment](https://reversr-6ubf0dy2w-vsillahs-projects.vercel.app) | Reference only; no request made by this lane |
| Vercel record | [G5sHvxfktoKGwrretFWpQ4EvMcQ2](https://vercel.com/vsillahs-projects/reversr/G5sHvxfktoKGwrretFWpQ4EvMcQ2) | App release record, not provider verification |
| Source SDK pins | Convex `1.45.0`, Auth `0.0.95`, Auth Core `0.41.3` | Package source pins; deployed SDK attestation remains missing |

GitHub PR, commit-status and deployment-status metadata were inspected on
2026-09-23. No live URL, Auth endpoint, provider setting or environment value was
queried. Provider adapter source, provider deployment, collection deployment,
collector commit/digest and provider policy receipt remain null. Inventing those
references or reusing the app deployment as provider proof would invalidate review.

The candidate injects `readAuthenticatedSession` and `readAuthorization`; both
need a concrete reviewed implementation. `convex/librarySession.ts` is explicitly
development/password scoped and is not production auth-method evidence. A service
credential at `/cad/upload-session-gateway` is not an authenticated login context.
The current production entrypoint does not import the offline candidate.

## Proposed window and exact collection gate

Proposed UTC window: **2026-09-24 14:00:00 through 14:30:00 UTC**. This is a fresh
proposal, not a scheduled job. No historical approval or window carries forward.
Late approval or unfinished prerequisites require a new reviewed proposal; no
rollover, renewal, second run or retry is authorized.

Exact approval phrase:

> Approve one synthetic-only ReversR CAD Auth evidence collection attempt for cad-auth-live-evidence-v1, source dc7d733cff6d94841725e721cc8e7b0da7be4cff, 2026-09-24T14:00:00Z through 2026-09-24T14:30:00Z, only after the exact provider adapter, collection deployment, cohort and instrumentation receipts are reviewed and bound; no setup changes, upload-session issuance, upload bodies, conversion, Sandbox, private CAD, real users, external messages or retry.

The phrase alone cannot open the gate. Before requesting it, the Captain must:

1. Review a concrete source-only provider adapter and collector, with immutable
   commits/digests, verified identity semantics, policy references and zero-write
   behavior. No collector is implemented here. A production method mapping must
   be reviewed before any positive case; infer no auth method from profile data.
2. Obtain sanitized receipts identifying exact provider and collection deployments,
   existing synthetic cohort/fixtures, actual-route instrumentation, custodian and
   reviewer. Deploying instrumentation, provisioning fixtures, creating/logging in
   users, logout/revocation/deletion and membership changes need their own authority.
   They cannot be smuggled into a read-only collection approval.
3. Bind those receipts, the final packet Git commit and SHA-256 to a separately
   reviewed execution packet and validator. All six pending prerequisites must
   have evidence. This pending packet and the PR #383/#384 templates stay unchanged.
4. Present that complete packet and the exact phrase in the Captain task before
   the window. If the reviewed source/window changes, replace the phrase and obtain
   fresh approval. A generic proceed or a successful local checker is insufficient.

This lane stops before those actions. The immediate next safe action is Captain
source review of this proposal, followed by preparation of missing adapter,
collector and receipt artifacts. Do not ask Vambah to provide secrets or raw IDs.

## Synthetic cohort and bounded procedure

Keep the existing technical cohort key stable, but use the separate collection
alias `cad-auth-evidence-synthetic-v1`. The legacy cohort name gives no authority
to involve its namesake or any real user. Plan two synthetic users A/B, allowed
shop-X and denied shop-Y, simultaneous logins A1/A2, replacement fixture A3 and
B1. Only opaque aliases enter evidence. Existing fixture receipts must cover
missing owner, deleted/mismatched session, removed membership/permission,
expiry and revocation. No accounts, sessions or fixtures have been created here.

After a future gate passes, the reviewed collector would perform one bounded
matrix traversal: provenance review, positive identity controls, substitution and
negative cases, lifecycle receipt review, isolated fault cases, route ordering,
then custody/reviewer closeout. Each planned resolve/refresh is a distinct case
observation, not a retry. Precondition setup is not part of the traversal.

Limits: one attempt; zero retries; at most 256 candidate operations, 2,048 provider
read calls, eight actual-route requests and two concurrent operations. Candidate
operations have an 800 ms deadline. A 100 ms scheduler tolerance is for recording
completion latency only; it cannot extend authority or start a late read. Counts
include nested reads and verification/key requests. The future collector must
stop before dispatch when a limit is exhausted. No new spend is authorized.

Refresh uses an in-memory synthetic session reference with verified identity
fields, never an issued upload session. A positive verifier result is an
observation only. Permission loss has a source-specific result: resolve returns
null; refresh can return `cadUploadAllowed:false`. That result must be rejected
by any future consumer. Treating every non-null result as authority fails review.

Every PR #384 case has a stimulus, expected observation and evidence class in the
packet. Missing observations remain NOT_COLLECTED/BLOCKED. Lifecycle transitions
cannot be proven from an after-state alone: require separately authorized,
source-bound before/after receipts. Exact-clock, hung-reader and fault-injection
results stay synthetic; they never count as provider behavior. Token-policy
fixtures must isolate the intended check (for example, valid test signatures but
wrong audience where supported), without exporting signing keys. A malformed
signature alone cannot prove issuer or audience enforcement. Unavailable fixtures
block those cases; do not manipulate provider configuration to manufacture them.

## Actual route and body-ordering instrumentation plan

Reviewed source chain: `vercel.json` → `api/[...path].js` → `server/index.js` →
`server/cadUserUploadRouter.js` → `server/uploadSession.js` for
`POST /api/cad/user-import`. The CAD route is mounted before generic CORS and
`express.json`. The deployed proxy/ingress must also be included in future review.

These are separate credential boundaries: the candidate consumes a login bearer;
the upload route consumes an upload-session credential. The source candidate is
not mounted there, and this packet cannot authorize a new composition or issuer.
A provider grant does not establish successful upload-route authentication.

A separately reviewed instrumented deployment must report request sequence IDs,
header counts, middleware entry/exit, verification outcome and body-access
attempt counters for getters, read/resume/pipe, async iteration, data/readable
listeners and parsers. Place probes before the first application middleware and
at the candidate/session/admission boundaries. Count attempts before delegating;
traps may abort before a forbidden read. Never attach a data listener to measure
zero, log header values, or consume bytes for instrumentation. Record infrastructure
buffering separately; application counters cannot prove proxy behavior.

All planned route requests are bodyless. Denied/malformed/cancelled/timed-out
cases require zero attempted body accesses, bytes, issuance and dispatches.
Counters start at zero and are captured through cancellation/late-completion
observation. A zero-length request alone proves no nonempty-payload ordering;
keep the restriction explicit and retain the separate body-admission gate.

The valid-session/closed-route case remains blocked for live route evidence:
it cannot be reached by minting an upload session under this proposal. An
isolated router test with a synthetic service can expect 503
`USER_UPLOADS_DISABLED`, but must retain its synthetic evidence label.
Service-envelope JSON and local getter-trap tests cannot fill actual-route slots.

## Evidence custody and stops

The packet includes a blank receipt schema. A future validator must accept only
reviewed enums, aliases, counts, source/deployment refs and UTC times. Each receipt
binds the candidate/provider/collector/approved-packet commits and digests,
cohort receipt, expected/observed outcome, timing, call/body/side-effect counters
and reviewer disposition. Hash sanitized bytes with SHA-256 after validation;
never hash credentials as a substitute for redaction.

The Captain names a restricted destination and independent reviewer before
collection. No raw replies, credentials, cookies, headers, env values, raw account
IDs, personal data, private exceptions or CAD enter logs, Git, public artifacts,
chat or screenshots. Do not save raw material for later sanitization. Reject an
unexpected output schema before persistence and stop. Sanitize at the producer.
Keep completed receipts separate from these immutable pending source templates.
Review within seven days, retain approved sanitized summaries/digests, and apply
the separately approved custody deletion policy to temporary sanitized detail.

On any missing receipt, source/deployment drift, failed/unclassified case,
unexpected identity, deadline/call/window overrun, body-access attempt, mutation,
issuance or dispatch: stop dispatch, abort reads, discard ephemeral bindings and
request-local credentials, and record only a sanitized stop reason and partial
counts. Expected negative cases count as success only when they match their
reviewed denial outcome. Infrastructure failure does not authorize another try.

Rollback for this source-only/read-only scope means stopping the collector and
keeping all gates closed. It grants no permission to change env flags, revoke
sessions, redeploy or alter provider settings. Instrumentation teardown, if one is
separately installed later, belongs to its own approved custodian/runbook receipt.
An absent rollback receipt blocks collection. Any subsequent run needs a new gate.

## Local validation

```sh
node scripts/cad-auth-live-evidence-packet-checker.js
node --test scripts/cad-auth-live-evidence-packet.test.js scripts/cad-production-verifier-candidate.test.js scripts/cad-production-verifier-evidence.test.js scripts/cad-production-auth-verifier-acceptance.test.js scripts/cad-production-session-verifier-binding.test.js scripts/cad-gateway-exact-session-bridge.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

The checker reads fixed repository sources only. It rejects extra fields,
completed receipts, approvals, window edits and source drift; UTC window status
is advisory and never grants execution. No provider tests, environment reads,
secrets, runtime activation, uploads, conversion, Sandbox or customer-data smoke
are required for these checks. No application/UI changes; build/typecheck and
browser QA are not part of this planning slice. Expenses: US$0.
