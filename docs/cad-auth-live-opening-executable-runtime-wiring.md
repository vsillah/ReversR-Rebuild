# CAD Auth live-opening executable runtime wiring

Status: source-only, disabled by default, production closed.

This packet adds the missing route-level body gate and runtime wiring needed for
a later exact live-opening gate. It does not issue an executable command card,
enable upload sessions, activate production upload, read a request body, run
conversion, dispatch Sandbox work, collect live evidence, change provider
configuration, read secrets, send external messages, enroll users, or claim
commercial readiness.

## Runtime shape

The user-import route now boots through
`cadLiveOpeningExecutableRuntimeBootstrap`. The bootstrap installs only a
default-closed wiring object. With no exact executable command card and no
durable adapter, it returns `USER_UPLOADS_DISABLED` before request-body
validation.

The route still keeps the source literal:

```js
const BODY_ADMISSION_AUTHORIZED = false;
```

That literal is not flipped by this work. A later live gate must provide an
exact executable command-card binding and a reviewed durable adapter before the
route body gate can authorize validation. Missing gate, stale deployment,
digest mismatch, bad principal/session binding, expired window, adapter failure
or unknown outcome all stop closed.

## Bound controls

The executable wiring requires:

- exact UTF-8 JSON and canonical SHA-256 match for the executable command card;
- immutable current production deployment recheck;
- one durable run claim and one durable attempt claim;
- independent expiry checks before every effect;
- rollback armed before opening the body gate;
- cleanup after the admission attempt; and
- post-rollback fail-closed smoke with zero body reads and zero session grants.

The cleanup path is installed in the route, but it is not active by default. The
source-only tests exercise the gate directly with synthetic receipts and verify
the production route still denies before parsing.

## Validation

Run:

```sh
node scripts/cad-auth-live-opening-executable-runtime-wiring-checker.js
node --test scripts/cad-auth-live-opening-executable-runtime-wiring.test.js scripts/cad-user-upload-route.test.js scripts/cad-auth-live-opening-runtime-activation.test.js
```

This branch stops at a draft PR. Merge, deployment and any live opening remain
separate gates.
