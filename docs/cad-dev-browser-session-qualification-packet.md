# CAD development browser/session qualification packet

Status: source/local preparation only; **no run authorized or executed**. Base:
PR #314, merge `aeb437e29fef0eb87b6ff7db3292a247b295bde6`.
Branch: `codex/cad-dev-browser-session-qualification-packet`. Expenses: USD 0.
The companion JSON binds reviewed source with SHA-256 digests. Its null bindings
are intentional blockers, not defaults or values that an executor may infer.

## Existing evidence and its limits

[Source-only harness](cad-dev-browser-session-harness.md) exercises the mounted
`POST /api/cad/dev-upload-session`, canonical session adapter, and disabled
`POST /api/cad/user-import`. Expected: `SESSION_READY`, `canSubmit=false`, then
503 `USER_UPLOADS_DISABLED`, zero body reads, and literal
`BODY_ADMISSION_AUTHORIZED=false`. Missing/revoked session checks precede body
admission; the issuer takes only a frozen header context.

The harness uses Node fetch and manually forwards the cookie. It does **not**
prove browser storage, Secure/HttpOnly/SameSite behavior, browser CORS, deployed
Auth, or real-user readiness. Its `.invalid` origin is a fixture, not a runnable
target. Its reported issuer status and PASS label alone are insufficient: the
future evidence must capture actual statuses and every expected invariant.
No prior Auth run, approval receipt, window, or unknown outcome is renewed here.

## Reviewed target and synthetic Auth acceptance

Before requesting run approval, the captain must fill a separate immutable run
binding with the packet file's SHA-256, exact source commit (including this
packet), run ID, UTC start/end (at most 15 minutes), custodian, and all pending
JSON fields. Hash the packet externally; do not insert a self-referential hash.
Record the run-binding SHA-256 in the approval request.

The accepted target profile is an isolated non-production, same-origin HTTPS
browser page and API using the reviewed Express mounts. Record exact origin and
page route, ownership, source/build identity, and production fail-closed smoke
receipt from the captain. No production alias, external Auth callback, redirect,
real login, shared profile, proxy to production, or default provider/store is
acceptable. Existing HTTPS infrastructure must already be available and reviewed;
this packet permits no deployment, certificate setup, environment change, or
resource provisioning. If unavailable, stop at source preparation.

Accept only a reviewed server-owned synthetic header resolver derived from the
harness, with frozen header input, synthetic user/shop/login-session identity,
expiry and membership checks, and authorization refresh. Bind its source digest
and a synthetic-context acceptance receipt. `cadUploadAllowed=true` is only the
synthetic session entitlement needed to reach the disabled route: upload/body
permission remains false. Production runtime guards must remain effective.
No secrets, credential files, real Auth provider, sign-in, enrollment, or historic
private register may be accessed. The local fixture literal is not a provider
credential and must never be interpreted as one.

Only a future explicitly approved run may issue an ephemeral session into the
isolated in-memory test store. No persistent/shared store mutation is allowed.
The present packet and its static tests mutate no session stores. The future
run must use a fresh disposable browser context, a 60-second maximum session,
no extensions/service workers/automatic reconnect, and zero external egress.
If achieving this requires new runtime code, review that source-only slice first;
this packet is a contract, not a browser runner or an enforcement mechanism.

## One-run procedure and stop conditions

1. Offline preflight: verify source hashes, exact target binding, approval phrase,
   accepted Auth receipt, unused run ID, UTC window, rollback readiness, zero-cost
   evidence, and disabled body/upload gates. Missing or changed values mean
   `STOPPED_PRECHECK`. Never discover a target by sending probes.
2. Mark the run consumed in the local custody ledger **before the first request**.
   One run permits at most one issuer POST and one disabled-import POST. No
   redirects, refreshes, reconnects, network retries, second issuance, or second
   run. The ledger contains only sanitized metadata; no remote store writes.
3. In the integrated Codex Browser, use the exact accepted HTTPS page and the
   canonical adapter. Send a bodyless issuer POST using the accepted synthetic
   header context. Require actual HTTP 200, no-store, valid session envelope,
   `SESSION_READY`, and `canSubmit=false`. The browser must store the host-only
   Secure/HttpOnly/SameSite=Strict cookie itself; never manually forward it.
4. Only after that result, make one bodyless import POST with the browser-managed
   cookie and in-memory CSRF header. Require 503 `USER_UPLOADS_DISABLED`,
   no-store, and server instrumentation showing zero request-body reads across
   both calls. No file picker, CAD file, sentinel payload, FormData, or body parser.
5. Close the disposable context and stop the isolated process to discard the
   synthetic store. Confirm teardown through local process/context receipts;
   make no verification HTTP request. Retain only the sanitized closeout.

Any unexpected status, cookie failure, auth failure, body read, source/target
mismatch, cost uncertainty, absent rollback, or requirement for broader authority
stops the sequence. A known failure is `STOPPED_KNOWN_FAILURE`. A timeout,
connection loss, cancellation after dispatch, missing instrumentation, uncertain
issuance, or unconfirmed teardown is `OUTCOME_UNKNOWN`: consume the run, attempt
only already-approved local teardown, record uncertainty, and return to the
captain. **Stop on unknown outcome; no retry and no second run.** If issuance may
have happened, skip the import POST. Never call an unknown run successful.

## Evidence, custody, and rollback

The run-binding receipt and sanitized closeout are separate from this plan.
Allowlist evidence: schema/version, run ID, packet/binding/source digests, public
non-production origin, UTC timestamps, terminal outcome, actual HTTP statuses,
allowlisted error codes, session-ready/can-submit flags, cookie stored/returned
and attribute booleans, optional SHA-256 cookie digest, request counts, body-read
count, disabled gates, zero external/provider operations, measured cost USD 0,
and local teardown confirmations. Unknown measurements remain null and force
`OUTCOME_UNKNOWN`; never substitute planned values for observations.

Exclude raw Authorization/Cookie/Set-Cookie headers, CSRF values, session/user/
shop IDs, response bodies, credentials, private CAD, account data, HAR, traces,
and unfiltered console/network screenshots. Keep cookie/CSRF in memory only;
never read cookies through JavaScript to work around HttpOnly. Sanitize before
saving or displaying anything. A custodian may retain allowlisted JSON and a
screen-only clip of session-ready/disabled UI, reviewed for leakage before sharing.
Use a local custody directory mode 0700 and evidence files 0600. Record artifact
paths and digests, retention decision and owner; raw credential artifacts have
zero retention. No evidence is sent externally by this lane.

Rollback is defined before approval: close the run-owned browser context, stop
only the isolated run-owned process, discard its in-memory store and synthetic
resolver, and confirm default source still injects no development adapters.
Never kill a shared process, revoke real users, edit a deployed environment,
mutate a persistent store, or clean branches/worktrees. TTL is defense in depth,
not proof of teardown. Unconfirmed custody/teardown is an unknown outcome and
blocks further runs. The captain's prior production smoke receipt must confirm
the default mounted route fails closed (`USER_AUTH_UNAVAILABLE`, no-store,
no issued cookie); this lane performs no production request.

## Exact next approval phrase

First the captain reviews a fully populated binding and rollback/cost receipts
and presents the substituted phrase below. Every angle-bracket field must be
replaced with the accepted value. This template, generic “proceed,” old approval,
and approval with unresolved fields authorize nothing.

> Approve exactly one development-only CAD browser/session qualification run <RUN_ID> for source commit <SOURCE_COMMIT>, packet SHA-256 <PACKET_SHA256>, and run-binding SHA-256 <BINDING_SHA256>, bound to PR #314 merge aeb437e29fef0eb87b6ff7db3292a247b295bde6, at <EXACT_HTTPS_ORIGIN> on <EXACT_BROWSER_ROUTE> during <START_UTC> through <END_UTC>, using accepted synthetic Auth receipt <AUTH_RECEIPT_SHA256> and rollback/custody receipt <ROLLBACK_RECEIPT_SHA256>. Permit only one bodyless session issuance and at most one bodyless disabled-import check with an isolated ephemeral test store and sanitized evidence, at USD 0. Keep BODY_ADMISSION_AUTHORIZED=false and uploads disabled. No production, private CAD, real users, conversion, Sandbox, provider/resource/env/persistent-store mutations, secrets or secret reads, usage/billing changes, or email/SMS/Slack. Stop on unknown outcome; no retry, no second run; perform only the accepted local teardown.

Success qualifies only development browser/session handling with uploads still
disabled. The next gate is captain review of the sanitized closeout. Upload
admission, live Auth, conversion, Sandbox, private CAD, and real-user exposure
each remain separately closed. No UI/build/deployment claim follows from this
packet; no application source has changed.

## Local validation

```sh
node --test scripts/cad-dev-browser-session-qualification-packet.test.js
NODE_PATH=./node_modules node --test scripts/cad-dev-browser-session-harness.test.js scripts/cad-dev-auth-session-issuer-bridge.test.js scripts/cad-upload-session-browser.test.js scripts/cad-user-upload-route.test.js
node --check scripts/cad-dev-browser-session-qualification-packet.test.js
git diff --check
```

These are local/static and synthetic loopback regression tests only, not the
future browser run. No dependency install, live endpoint, or provider is required.

Validation recorded for this packet: 5 static packet tests and 36 existing local
regression tests passed; JavaScript syntax and whitespace checks passed. No UI,
real browser session, live workflow, customer data, deployment, or production
smoke was run. Production smoke receipt and all run bindings remain pending.
