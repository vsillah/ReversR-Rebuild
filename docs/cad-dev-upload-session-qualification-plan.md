# CAD development upload/session qualification plan

Base: `ef27012db68e8ee6a0728d1cc52e9b75c975cf84`, after PR #245.
Branch: `codex/cad-dev-upload-session-qualification-plan`.
Status: source-only planning packet for the next development-only upload/session
qualification slice. Expenses: USD 0.

## Current Position

The synthetic development Auth/session qualification completed and was closed out
in source. Its sanitized evidence hash is
`7cbb352cdefd3d190e30db67cd22c31a3712f5728addfc5024e37511ba161203`; its
receipt hash is
`55f4b45bd74bc051ba8217f2b4946736bc27f5993c064a8e3ca8aa6bcbbd7ee0`.

The active Auth/session qualification source binding is disabled after closeout.
Future development runs require a new reviewed source binding and fresh accepted
evidence.

## Upload Route State

`POST /api/cad/user-import` remains mounted but disabled:

- missing or invalid session: `USER_SESSION_REQUIRED`
- unconfigured upload auth: `USER_AUTH_UNAVAILABLE`
- valid synthetic session while disabled: `USER_UPLOADS_DISABLED`
- denied CAD permission: `USER_UPLOAD_FORBIDDEN`
- rejected cookie origin or CSRF: `ORIGIN_OR_CSRF_REJECTED`

The route still keeps `BODY_ADMISSION_AUTHORIZED` as literal `false`. The disabled
gate runs before body admission, upload parsing, conversion, Sandbox dispatch or
any CAD file handling.

## Next Executable Slice

The next source slice should implement and test a development-only upload-session
qualification executor. It must bind to the completed Auth/session closeout,
target only `reversr-cad-auth-dev` / `majestic-alligator-31`, and exercise only
the reviewed upload-session issue, lookup and revoke sequence with sanitized local
evidence.

Before any body-bearing synthetic upload request, the executor must prove the
disabled route precheck. Upload activation remains out of scope for this planning
packet.

Required properties:

- use development-only synthetic identities and metadata
- issue or inspect only run-owned upload-session records
- revoke without deleting retained users, accounts or upload rows
- keep pre/post route checks fail-closed
- keep no-retry and no-second-run behavior
- write sanitized local evidence
- stop on unknown outcome

Still not authorized:

- production upload activation
- setting `BODY_ADMISSION_AUTHORIZED` to true
- CAD conversion or Sandbox dispatch
- private CAD
- real users or external messages
- provider/resource/env/usage/billing mutation

## Validation

```sh
node --test scripts/cad-dev-upload-session-qualification-plan.test.js
node --test scripts/cad-user-upload-route.test.js scripts/cad-upload-session.test.js scripts/cad-upload-session-store.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

## Next

After this planning packet is merged and fail-closed-smoked, autopilot can create
the source-only executor slice for the development upload-session qualification.
That later slice still must stop before live execution unless its own source,
rollback and evidence gates pass.
