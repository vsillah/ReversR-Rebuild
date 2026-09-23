# CAD Auth live-evidence prerequisite binding — source review only

This packet extends the sealed setup merged at `52267ef`. It binds six prerequisite
manifests to exact repository bytes without filling any live binding. The parent
setup and its historical evidence remain unchanged. A valid checker result means
only that the source packet matches the reviewed schema and current source bytes.
`livePrerequisitesSatisfied`, all authority claims, sealing and executability remain
false. Missing live review is represented explicitly; removing a review record or
marking it accepted fails validation.

## Binding and review matrix

| Manifest | Bound source or requirement | Still missing before any future live work |
| --- | --- | --- |
| Provider policy | Disabled adapter, candidate, exact-session binding, pinned lockfile versions | Concrete provider implementation; deployed SDK comparison; issuer, audience, algorithm and signing-key policy; cache invalidation; per-HTTP reservation wrapper |
| Route/body instrumentation | API entrypoint, Express app, user-import route and unmounted guard | Actual installation review, deployed counters, upstream/platform buffering evidence |
| Immutable target | Historical source baseline and source hashes | Immutable deployment identity, commit, source map and independent target attestation |
| Restricted synthetic cohort | U1/L1, U1/L2, U2/L3 and parent schedule hash | Restricted alias mapping, synthetic ownership, per-case lifecycle receipts, separately authorized setup/teardown |
| Custody/reviewer | Seven-day proposed retention, separate observation and disposition | Custodian, distinct independent reviewer, access-controlled store, deletion policy and reviewed disposition |
| Late-grant observer | Candidate cancellation boundary and stop runbook | Reviewed observer implementation, durable consumed-run ledger, partial evidence and escalation policies |

All repository references are prefixed `source-only:`. They are not executable
entrypoints or proof of deployed behavior. Live references stay null. Hashes detect
source drift against this packet; they are not signatures or authorization. Any
regeneration changes the review artifact and requires a new source review.

## Actual route/body binding plan

`api/[...path].js` delegates to `server/index.js`. The app mounts the development
issuer and user-import routers before the general JSON parser. User-import checks
method/origin and its existing upload-session verifier, then returns through a
source-closed admission gate before `validateRequestBody(req)`. This existing
upload-session verifier is not the unmounted production Auth candidate.

A future installation review must trace platform ingress, middleware, CORS and
preflight, early denial, verifier entry, admission denial and parser placement.
Guards must precede body property reads, read/parser calls, stream subscriptions,
pipes and async iteration. Attempt counters stop before the underlying access;
request objects, raw headers and bodies must never enter a collector. Zero bytes
inside the offline guard cannot establish that upstream hosting did not buffer a
request. Platform buffering therefore remains a separate unresolved gate. This
change installs no guard and sends no HTTP request.

## Provider, cohort and observation requirements

Package versions describe source dependencies only. Policy must eventually bind
cryptographic verification and fresh exact-session owner/method identity on every
resolve and refresh, followed by fresh shop membership and CAD permission. JWT
permission claims, cached principals, service credentials and same-user login
substitution cannot confer authority. Every underlying HTTP call, including key
and metadata reads, needs reservation before dispatch, disabled SDK retries and a
shared cancellation/deadline budget. The current candidate does not implement that
transport wrapper and this packet does not substitute for it.

Cohort setup must map each parent lifecycle case to sanitized before/after receipts
and prove independent U1 logins and separate U2 identity. Raw identities and alias
mapping belong only in a future restricted store. No account creation, credential
generation, session deletion, permission mutation or teardown occurs here.

After a future stop, an independently reviewed observer must establish settlement
of already-pending work without late grant publication or side effects, within the
original schedule and budget. Unobserved settlement, interruption or unknown result
consumes the attempt/run and stops. No diagnostic request, restart, second run or
window rollover is allowed. This declarative plan supplies no observer and no
persistent single-run enforcement. Custody preserves only sanitized partial
receipts, with independent review and deletion evidence still required.

## Local validation and handoff

```sh
node scripts/cad-auth-live-evidence-prereq-checker.js --write
node scripts/cad-auth-live-evidence-prereq-checker.js
node --test scripts/cad-auth-live-evidence-prereq.test.js scripts/cad-auth-sealed-setup.test.js scripts/cad-auth-sealed-evidence-card.test.js scripts/cad-auth-live-evidence-plan.test.js scripts/cad-production-verifier-candidate.test.js scripts/cad-production-session-verifier-binding.test.js
node scripts/cad-auth-sealed-setup-checker.js
node scripts/cad-auth-sealed-evidence-card-checker.js
node scripts/cad-auth-live-evidence-plan-checker.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

`--write` regenerates this fixed local review JSON only. The contract manifest has
a separate local `--write` regeneration option. Neither emits a live command card.
Tests mutate every leaf and source binding, reject unknown outcomes and live-looking
references, and exercise accessor/hidden sensitive-field rejection without reading
getters. They do not collect live evidence or prove provider/route behavior.

Captain source review is next. All live prerequisites in the matrix, fresh explicit
approval and any future sealing remain open. Stop before runtime activation,
environment installation, credential generation or executable command issuance.
No merge, deployment, provider tests, upload-session issuance, body admission,
conversion, Sandbox dispatch, private CAD, external messages or commercial-readiness
claim is authorized by this packet. Build/typecheck and live/customer-data smoke
are outside this source-only change; no UI surface changed.
