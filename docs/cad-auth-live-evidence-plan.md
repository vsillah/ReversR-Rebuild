# CAD Auth live evidence collection planning gate

Status: **source-only; blocked before live collection**. This packet prepares the
PR #383/#384 candidate for a future bounded evidence decision. It implements no
provider adapter, collector, credential reader, route instrumentation or runtime
switch. All observations and acceptance flags remain pending/false. A passing
checker validates this plan only.

## Source and deployment references

- Acceptance contract: [PR #383](https://github.com/vsillah/ReversR-Rebuild/pull/383),
  merge `b885f1f9a569b5bfa5627858cbb1542342b7da43`.
- Candidate: [PR #384](https://github.com/vsillah/ReversR-Rebuild/pull/384),
  merge `dc7d733cff6d94841725e721cc8e7b0da7be4cff`.
- GitHub deployment `6613179379` names that exact candidate merge, environment
  `Production`, success at `2026-09-23T11:49:34Z`. Vercel ref
  `G5sHvxfktoKGwrretFWpQ4EvMcQ2`; immutable URL
  `https://reversr-6ubf0dy2w-vsillahs-projects.vercel.app`.
- Metadata was read through GitHub on 2026-09-23. The deployed app was not
  contacted. A successful source deployment does not establish provider wiring,
  Auth acceptance, route instrumentation, or collection authority.
- Source pins: Convex `1.45.0`, Auth `0.0.95`, Auth Core `0.41.3`.
  Deployed provider versions and policy are unverified. The concrete provider
  adapter, collector, instrumentation and collection deployment refs remain
  null because those implementations are absent from this candidate.

The [machine-readable packet](cad-auth-live-evidence-plan.json) binds the existing
acceptance/evidence packets, candidate, request binding, bridge, gateway, upload
session verifier/store/router, Express entrypoint, Vercel entrypoint/config and
lockfile by SHA-256. It also binds this guide, checker and mutation tests. Existing
PR #383/#384 pending packets stay unchanged. Future collected receipts belong in
a separate reviewed format/validator; these source templates reject completion.

## Blockers to resolve before requesting executable authority

1. Review a concrete read-only `readAuthenticatedSession` and `readAuthorization`
   provider implementation. Pin its source and deployed SDK/policy references.
   Require cryptographic verification, fresh exact-session/owner and shop reads,
   nonblocking I/O, cancellation and a deadline no greater than 800 ms. A service
   credential, caller identity or development password assumption is insufficient.
2. Review a collector and separate receipt validator, including its exact case
   schedule, expected result codes, fault-isolation strategy and request ceilings.
   No executable live commands are supplied here. The candidate remains
   `configured: false`; direct review composition must never issue a session.
3. Review the instrumentation design below and bind it to an exact immutable
   collection target. Installing or deploying it requires its own source/setup
   approval. Reusing the production deployment above as a live target is blocked.
4. Seal the synthetic cohort mapping and lifecycle evidence prerequisites in a
   restricted command card. Provisioning accounts, changing membership or
   permissions, signing in, logging out, revoking/deleting/replacing sessions and
   changing provider settings are separate setup actions, not read-only collection.
5. Name the restricted custodian and independent reviewer, record approved
   location/retention refs, and seal the command card by digest. Include exact
   candidate, adapter, collector, instrumentation, immutable target, case schedule,
   synthetic mapping, allowed observations and stop conditions. No private values
   or raw mappings belong in the repository or public PR.
6. Captain rechecks all references and presents the sealed card with a fresh
   window to Vambah. Only then can the proposed phrase below be considered.
   Missing prerequisites prevent execution even if the phrase has been supplied.

The later provider implementation may change candidate semantics. Any candidate,
route, collector or deployment drift requires a revised source packet and review;
this proposal cannot be transferred to that implementation silently.

## Synthetic identities and evidence cases

Use only the existing internal cohort reference
`rrb-ref:cad-upload-internal-mark-test-cohort-v1`. Evidence aliases are U1 and U2;
U1 has two distinct concurrent logins L1/L2 and U2 has L3. S1 is the permitted
synthetic shop; S2 is unauthorized for U1. No real user or actual account identifier
is included. A custodian must verify these aliases against an approved restricted
mapping before collection. This plan creates no identities or credentials.

Every PR #384 case has a concrete expected observation in the JSON packet, with
resolve and refresh coverage retained. Inspector-only cases use those paths as
coverage labels; they do not require extra requests. Identity substitutions use
fresh independent request closures. Refresh inputs are synthetic binding objects;
the `sessionId` field is a nonissued synthetic marker, never an upload credential.
Successful review grants stay in collector memory and cannot reach an issuer.

Permission loss has distinct semantics: resolve denies; refresh can return a
current grant with `cadUploadAllowed=false`, which downstream verification must
deny. Do not count such a grant as accepted upload authority.

Lifecycle claims need correlated pre/post observations from the same exact login
and membership, together with separately authorized setup receipts and provider
cache semantics. A preprovisioned dead credential alone proves only its current
denial. This collection grants no mutation authority. If correlated lifecycle
proof cannot be obtained read-only, mark the case blocked and obtain separate
setup authority; do not quietly perform the mutation or mark the category passed.

Deadline, malformed-result and failure cases need an isolated, reviewed fault
mechanism around the collector. Do not break the live provider or alter its
clock/configuration. Injected faults establish composition behavior only; provider
cancellation and no-write guarantees need independent provider-backed observation.
A synthetic test cannot be relabeled live proof. JavaScript cannot preempt a
synchronously blocked event loop or undo dependency side effects.

## Actual route and body-ordering instrumentation plan

Trace `api/[...path].js -> server/index.js -> createCadUserUploadRouter` for
`POST /api/cad/user-import`. The mount currently precedes general CORS/body parsing.
The route consumes **upload-session credentials**. Login bearer transport in the
candidate is a separate boundary; sending a login bearer to this route does not
exercise a successful production login verifier. Gateway envelope parsing also
does not establish upload-body ordering.

The future observer must be installed at the earliest reviewed request boundary,
before middleware or provider calls. Record only monotonic event sequence numbers,
case aliases, elapsed times and counters. Record attempted `req.body` getter access,
`read`, `resume`, `pipe`, async iteration, `data`/`readable` subscriptions and parser
invocations by wrapping those operations; the observer must never subscribe to or
consume the stream itself. Trip a terminal stop before the original read/parser
can execute. Do not log header values, payloads or provider exception contents.
Record verifier start/end/abort/deadline, response completion, pending-read
settlement and any late-grant attempt. Require zero body-access attempts, zero
parser invocations and zero application bytes read on denied, malformed,
cancelled and timed-out paths. Null counters mean unobserved, never zero.

Only bodyless requests are contemplated here. `requestBodyBytesToSend=0` is not
proof of safety for a nonempty stream. An empty response or client-side trace
cannot prove middleware ordering. Reviewed instrumentation, deployment/source
binding and explicit hosting pre-handler buffering analysis are required. If the
platform cannot expose that boundary, document the unknown and block that claim.
Sending a canary payload or reading bytes to measure them requires a separate gate.

`BODY_ADMISSION_AUTHORIZED` must remain false even after valid candidate authority.
There is no issued upload session for the actual route's positive path, and no
production-mounted candidate. Therefore `closed-after-valid-verifier` cannot be
claimed as live actual-route evidence in this packet. Source-only route injection
may support review but cannot fill a live receipt. Missing route integration is a
blocker, not permission to install one or issue a token.

## Evidence custody and review

Capture only the allowlisted receipt fields in the JSON template. Keep expected
results, actual observations and reviewer disposition separate. Bind every future
receipt to exact source/deployment versions, case/path/phase, UTC start/end,
monotonic duration, synthetic mapping ref, sanitized counters/result code,
sanitized evidence reference and SHA-256 digest. Inspector cases must explicitly
say inspection; composition faults must explicitly say injected fault.

Sanitize at capture. Never capture bearer values, cookies, raw headers, secrets,
account records, private CAD, raw provider exceptions or private filesystem paths.
No HAR, browser storage dump, raw SDK debug logs or credential hashes. Keep any
operator-owned authenticated context ephemeral and request-local; this lane must
not read/export its secrets. Public evidence uses aliases and references only.

A designated custodian keeps sanitized artifacts in a restricted user-owned store,
checks digests after sanitation and records access/reviewer disposition. Proposed
retention is seven days, followed by custodian-confirmed deletion under the sealed
card. Retention location and people remain unbound. Stop on accidental sensitive
capture; restrict the artifact, report only a sanitized incident, and request any
credential-remediation action separately. No automatic public receipt publication.

## Proposed window, single attempt and stop behavior

Proposed fresh window: **2026-09-24 15:00:00–15:30:00 UTC**. This is a proposal,
not a reservation, scheduler or authorization. Exactly one run; one observation
per scheduled case/path/phase; no retries or resumed second attempt. Upper ceilings
are 160 logical operations, 320 reader invocations and 640 provider HTTP requests;
SDK/transport retries are zero. These ceilings never authorize unscheduled calls.
The future collector must enforce them, including metadata/key retrieval, and stop
before exceeding them. No additional diagnostic calls are allowed. Lifecycle
before/after phases and the one concurrency pair must be declared in the sealed
schedule. They are distinct planned observations, not retries. Unscheduled calls
are forbidden. A failure or unknown outcome consumes the run and stops collection.

Before the window opens, collect nothing. At expiry, stop and invalidate unused
authority. If prerequisites are not complete before the start, reseal a fresh
window and request a new exact approval; never roll the window forward silently.
The offline checker can keep validating the archived source plan after expiry,
but reports `proposalWindowStillFuture=false` and always `executable=false`.

Stop on missing prerequisites, source/target drift, cohort mismatch, sensitive
capture, any body read/access attempt or parser invocation, session issuance or
write attempt, unexpected authority, failed cancellation/deadline, case failure,
interruption, unknown outcome or a retry request. Abort pending collector reads;
record sanitized partial evidence and verify no late grant through the reviewed
observer. Rollback means stopping the collector and discarding ephemeral bindings.
No environment toggle, provider mutation, credential revocation or deployment
rollback is authorized. If containment needs one, report its exact separate gate.

Exact proposed live-collection approval phrase:

> Approve one read-only synthetic CAD Auth evidence collection for plan cad-auth-live-evidence-plan-v1, candidate dc7d733cff6d94841725e721cc8e7b0da7be4cff, during 2026-09-24T15:00:00Z through 2026-09-24T15:30:00Z, only after the Captain seals and reviews the exact provider, collector, instrumentation, target deployment and synthetic cohort references. No setup changes, upload sessions, upload-body reads, activation or retries.

This phrase is not currently actionable: the prerequisite refs are unbound. To
advance, open this PR's Files changed view, review this guide and JSON, then have
the Captain complete the separate source/setup review and present the sealed card.
Confirm its exact source refs, UTC window, synthetic scope and zero-write/body-read
limits; send the exact phrase in the Captain task only when those match. If the
candidate or window changes, use the newly reviewed phrase. Verifier acceptance,
runtime activation and upload admission still require independent later decisions.

## Local validation and handoff

```sh
node scripts/cad-auth-live-evidence-plan-checker.js
node --test scripts/cad-auth-live-evidence-plan.test.js scripts/cad-production-verifier-candidate.test.js scripts/cad-production-verifier-evidence.test.js scripts/cad-production-auth-verifier-acceptance.test.js scripts/cad-production-session-verifier-binding.test.js scripts/cad-gateway-exact-session-bridge.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

These commands read fixed repository sources and use local synthetic dependencies.
No network/provider validation, application startup, deployment, env/secret reads,
provider/resource/billing changes, session issuance, upload bodies, conversion,
Sandbox, private CAD or external messages are authorized. Build/typecheck and live
workflow/customer-data smoke are outside this source-only change. The existing
unrelated admission-test expectation mismatch is untouched. Vercel Portfolio and
Portfolio-staging contexts do not apply to ReversR. Expenses: US$0.

Next: Captain source review of the draft PR, then prerequisite source/setup gates
and a sealed approval card. No merge, runtime activation or cleanup in this lane;
no claim of production Auth acceptance or commercial readiness.
