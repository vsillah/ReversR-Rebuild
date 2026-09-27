# CAD Auth live-opening runtime mount preparation

Status: source-only, sanitized, disabled by default. This packet prepares the
production route mount needed for a later explicit live opening gate. It does
not activate upload admission, issue upload sessions, issue an executable
command card, admit or read request bodies, dispatch conversion, dispatch
Sandbox work, change provider configuration or claim commercial readiness.

## What changed

The user-import route now imports a live-opening runtime mount wrapper before
request-body validation. The wrapper preserves the existing switch ordering, but
overrides every outcome back to `USER_UPLOADS_DISABLED` while the source gate is
closed. The literal route gate remains:

```js
const BODY_ADMISSION_AUTHORIZED = false;
```

## Runtime binding

The mount models the later live gate requirements without granting authority:

- exact command-card SHA-256 binding;
- immutable current production deployment recheck;
- one-session and one-attempt durable fence;
- independent expiry checks before every effect;
- rollback-first controls;
- post-rollback fail-closed smoke; and
- zero conversion, Sandbox, request-body, external-message or commercialization
  authority.

The committed source packet cannot by itself prove that a production deployment
reference is current after merge. A later live gate must bind the freshly
observed production deployment reference in the approval text and the executable
command card.

## Local validation

Run:

```sh
node scripts/cad-auth-live-opening-runtime-mount-prep-checker.js
node --test scripts/cad-auth-live-opening-runtime-mount-prep.test.js scripts/cad-user-upload-admission.test.js scripts/cad-default-closed-admission-switch.test.js
node scripts/cad-convex-contract-manifest.js
```

If the command runs from a dependency-light worktree, point `NODE_PATH` at the
primary checkout's installed `node_modules`. The broader
`cad-convex-source-audit` is not used as this packet's acceptance check because
it currently stops on an older `cad-production-auth-verifier-acceptance` packet
before reaching this runtime mount.
