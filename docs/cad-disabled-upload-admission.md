# Disabled CAD upload admission scaffolding

Status: local source and synthetic tests only. Base d0811fc512a9cefdaa805602669f7172c519e82e.
Branch: `codex/cad-disabled-upload-admission`. No expenses or external actions.

The mounted `POST /api/cad/user-import` preserves its existing CORS/method,
credential, current permission and cookie CSRF precedence. The session service
still refreshes the exact bound login on each lookup. Another active login for the
same user cannot substitute. Missing credentials, stale bindings, lost permission
and unavailable authority reject before reading a body. All responses are no-store
and use fixed four-field error envelopes.

A literal false source gate after verification prevents every mounted body read.
There is no environment switch or factory option to open it. Behind that gate,
`cadUserUploadAdmission` validates uncompressed JSON with a 384 KiB streaming cap
and a 10-second body deadline. Declared overflow rejects before subscription;
chunking and dishonest lengths cannot bypass the byte counter. Malformed UTF-8,
JSON, incomplete streams and cancellation yield fixed errors. Buffered chunks and
body listeners are released on completion; a fixed error sink absorbs late transport errors. Early rejection pauses consumption; the
server may close or drain the HTTP connection outside the admission handler.

The exact three fields are fileName, mimeType and contentBase64. Only IGES MIME
variants and generic octet-stream are allowed. The existing pure worker contract
checks safe filenames, extension, canonical base64, 256 KiB decoded size, IGES
record shape and absence of external-reference entity 416. Decoded content and
hash are discarded. This is input validation, not geometry qualification.
Successful validation still ends in 503 USER_UPLOADS_DISABLED. No executor,
provider, logging, telemetry, receipt writer or storage dependency is added.

Tests instrument only an isolated VM copy of the actual router's false literal,
using an in-memory synthetic session service. Production code has no test enable
hook. This exercises HTTP auth-to-parser ordering and valid-input terminal behavior
without authorizing mounted admission. Pure stream tests cover exact byte limits,
chunked overflow, dishonest lengths, malformed inputs, aborts and timeouts. The
unchanged mounted behavior is also exercised with body-read traps and fake enable
options. Synthetic sentinels must never appear in serialized responses.

## Closed prerequisites

The [manifest](../offline/cad-convex/disabledUploadAdmission.json) is offline review
metadata and is never read by the runtime. All prerequisites remain false:
live exact-session evidence, transactional reauthorization at reservation/dispatch,
cross-instance quota/concurrency, an enforceable all-in budget reservation,
provider qualification, independent Sandbox authority, cleanup reconciliation,
rollback qualification and explicit activation. Before any future body gate opens,
shared controls and the authority fence must be implemented and reviewed ahead of
parsing. This patch does not claim concurrent revocation or budget enforcement.

Sandbox dispatch remains absent. Future qualification must preserve the existing
1 vCPU, 2048 MB, deny-all network, 60-second lifetime, 45-second request,
10-second command, 5-second cleanup and worker output ceilings. Admission approval
cannot authorize conversion. No auth/provider configuration, live Auth, enrollment,
private CAD, live store mutation, live Sandbox dispatch, deployment or cleanup was performed.
Validation deviation: the existing worker regression suite was inadvertently included
and performed a local public-cube conversion. This exceeded the no-conversion
instruction. It was not repeated; no private input or live Sandbox was used.

## Validation and next action

Run local regression tests, TypeScript, generated-binding integrity, the source
manifest, leak audit and whitespace validation. Hosted API preflight is excluded:
that script contacts configured endpoints and may exercise providers beyond this
source-only lane. Loopback route tests provide scoped HTTP evidence. No visual
surface changed; browser QA does not apply.

Next: captain reviews the local commit and requests publication-only approval.
Future approval phrase (replace SHA with the reported immutable local commit):

> Approve pushing only commit [full SHA] from codex/cad-disabled-upload-admission to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only disabled CAD upload admission scaffolding and tests. No merge, deploy, live tests, env/provider/auth/resource or usage/billing changes, secrets, enrollment, email/SMS, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch or lane cleanup.


Validation completed locally:

```sh
npm ci --offline --ignore-scripts --no-audit --no-fund
node --test scripts/cad-convex-*.test.js scripts/cad-upload-session.test.js scripts/cad-upload-session-store.test.js scripts/cad-user-upload*.test.js scripts/cad-sandbox.test.js scripts/cad-worker.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

The initial broader run passed 231 tests (including the worker-suite deviation
above). After hardening late transport-error handling, only the six new admission
tests were rerun. TypeScript and five generated bindings passed. Integrity covers
115 files; the source audit covers 101 files with zero leak-pattern matches.
