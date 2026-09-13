# CAD development auth source assembly

Source-only continuation of the [E/D/T packet](cad-live-dev-edt-approval-packet.md).
No live action is approved by this change. The execution worksheet is
[developmentExecution.json](../offline/cad-convex/developmentExecution.json);
null fields are blockers, never defaults or instructions to discover credentials.
The integrity manifest binds all candidate source and test files.

The Password candidate accepts only signIn for at most two explicitly selected
synthetic existing accounts. Signup, reset, verification, extra parameters and
out-of-cohort email addresses deny. There are no delivery providers or provisioning
functions. `developmentAuthReviewed` remains false and the installed cohort remains
empty. Environment presence alone enables nothing. A later reviewed source change
must bind the cohort and qualification evidence before opening the source gate.
Missing or mismatched issuer/SITE_URL and empty key rows fail closed thereafter.
Presence checking is not cryptographic key-pair qualification.

SITE_URL is explicitly `http://localhost:5001`; no 127.0.0.1 alias is accepted.
The reviewed source consumes it as an exact-origin check. Pinned Auth 0.0.95 also
consumes SITE_URL in `src/server/implementation/redirects.ts` through `siteUrl()`
when the library needs a default redirect. The custom callback allows only `/`
and the exact absolute root, with no query, fragment or native redirect. Password
profile rejects redirectTo parameters. Local logout is the library signOut operation;
there is no new logout endpoint or redirect route. E still requires separate row
review; platform-owned CONVEX_SITE_URL must never be overwritten.

The session reader uses SDK getAuthUserId/getAuthSessionId on server-verified
identity, then point-reads the exact authSessions row and its owner in the same
query snapshot. Wrong owner/session, missing owner/session and expiration deny.
Session deletion is the library revocation signal; library tables remain library-owned.
The Password method depends on an isolated Password-only deployment with verified
empty prior session history. Session rows do not themselves record method provenance.
A later gate must prove that condition; mixed-method or imported sessions are excluded.
Logout/revocation races rely on Convex snapshot/OCC semantics and still need live T
conformance. The fixture tests do not establish remote concurrency behavior.

CAD functions remain internal and there is no CAD HTTP route or service credential
loader. The development service candidate accepts a verified transport receipt with
exact subject, audience, deployment, nonrevoked status and expiration. The verifier
is a trusted host dependency, never a caller-provided claim decoder. A real transport,
credential mechanism and propagation of the separately verified user identity into
internal function context are unresolved review gates. A service identity alone
cannot satisfy the exact-login reader. No deploy key is a runtime credential.

The service candidate bounds each instance to 100 calls and 15 minutes, with one
in-flight operation. A competing client receives RUN_BUSY before dispatch. Existing
gateway deadlines remain at most 800 ms. Every failed call stops the run; write
failures report OUTCOME_UNKNOWN without exposing the underlying error. There are
zero automatic retries. Existing insertIfAbsent indexes prevent duplicate credential
and session insertion transactionally, and revocation is monotonic. These properties
do not make an unknown receipt successful. A fresh process must not resume the run.
Before any future retry, persist a sanitized operator receipt and reconcile the exact
run-owned record and generation under separately approved read authority. A denied
read is not proof that an earlier write did not commit. There is no durable cross-process
run ledger or automatic reconciliation transport in this phase; T remains blocked
until its durable receipt/cohort workflow is reviewed. Reserve cleanup capacity and
stop before UTC resource-limit resets as required by the predecessor packet.

The upload router is unchanged: even a valid upload session receives
USER_UPLOADS_DISABLED. No body parser, conversion or Sandbox path was added.
No CAD data, secrets, env files, provider changes, live tests or expenses are involved.

Local validation commands:

```sh
node scripts/cad-convex-codegen.js --check
node node_modules/typescript/bin/tsc --noEmit
node --test scripts/cad-convex-*.test.js scripts/cad-user-upload-route.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

Next: captain reviews source, then resolves service transport/user-context binding,
synthetic provisioning and durable run receipts, named operator/backup, key generation
review, enforceable budget evidence and U/K/S/E/D/T worksheets. All live gates remain
closed. No push, merge, deployment, UI activation or cleanup is part of this lane.

Local result: 82 tests passed, TypeScript passed, five pinned SDK bindings verified,
63 integrity entries verified and 49 audit files passed with zero leak matches.
No UI changed; browser QA and live provider concurrency were intentionally not run.
Existing pinned dependencies were linked locally from the earlier schema lane;
no dependency installation or lockfile change was needed.

Changed source: convex/auth.ts, convex/auth.config.ts, convex/developmentAuth.ts,
convex/librarySession.ts and convex/_generated/api.d.ts. Added service candidate and
execution worksheet under offline/cad-convex; updated its manifest. Added development
assembly tests and updated auth-assembly/live-readiness tests, source-loader helper,
contract-manifest generator and source audit. This document is the review handoff.

Deterministic-time correction: all three internal query handlers construct the
backend with a deterministic evaluation instant of deadlineAt minus one millisecond
(the final millisecond inside the exclusive gateway deadline). Invalid or nonpositive
deadlines reject before database reads. The backend validates the deadline and passes
it to the session reader as validThrough; a session expiring at or before that horizon
denies. The reader never samples wall time. Exact-session and owner point reads remain
in the same snapshot. Mutations retain their existing elapsed-time checks.

This is snapshot evidence through a supplied horizon, not independent proof of current
wall time. Only the trusted service gateway may consume it for admission, checking
freshness before dispatch and after response. Reusing a cached result or backdating
a deadline outside that gateway is not authorized. The gateway rejects a result that
arrives at the deadline, even if the deterministic query succeeded. Tests exercise
query paths with a throwing clock, invalid horizons and stale gateway responses.
