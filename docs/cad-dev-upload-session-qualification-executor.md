# CAD development upload/session qualification executor

Base: `352a3b08928f6b03dee8ef02f878a388c1184bf1`, after PR #246.
Branch: `codex/cad-dev-upload-session-qualification-executor`.
Status: source-only executor implementation for the next development-only
upload-session qualification gate. Expenses: USD 0.

## Boundary

This packet implements the reviewed executor shape only. It does not authorize a
live run and does not activate uploads. The production user import route still
keeps `BODY_ADMISSION_AUTHORIZED = false`, so a valid synthetic upload session
must stop at `USER_UPLOADS_DISABLED` before body parsing, CAD bytes, conversion
or Sandbox dispatch.

## Source Binding

The executor binds to:

- Auth/session closeout evidence
  `7cbb352cdefd3d190e30db67cd22c31a3712f5728addfc5024e37511ba161203`
- Auth/session closeout receipt
  `55f4b45bd74bc051ba8217f2b4946736bc27f5993c064a8e3ca8aa6bcbbd7ee0`
- Upload-session planning packet
  `docs/cad-dev-upload-session-qualification-plan.json`
- Development deployment identity `majestic-alligator-31`

## Executor Sequence

The executor validates a future private register, then uses injected development
adapters to:

1. issue one synthetic upload session,
2. run a disabled `POST /api/cad/user-import` precheck with zero body reads,
3. verify the credential through the upload-session verifier,
4. perform a bounded direct lookup,
5. revoke the session without deleting retained state,
6. verify the revoked credential is denied,
7. return sanitized evidence only.

The fixture path exercises the same sequence with in-memory test adapters. It
keeps CAD uploads disabled and records no raw credential.

## Still Not Authorized

- live development run
- `BODY_ADMISSION_AUTHORIZED = true`
- production upload activation
- CAD files, private CAD, conversion or Sandbox dispatch
- real users or external messages
- provider/resource/env/usage/billing mutation
- automatic retry or second run

## Validation

```sh
node --test scripts/cad-dev-upload-session-qualification-executor.test.js
node --test scripts/cad-dev-upload-session-qualification-plan.test.js scripts/cad-upload-session.test.js scripts/cad-upload-session-store.test.js scripts/cad-user-upload-route.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

## Next

After this source-only packet is merged, deployed and production-smoked
fail-closed, the next gate is restricted evidence/register acceptance for one
development-only upload-session qualification run. That later gate must name the
exact UTC window, accepted private register digest, sanitized evidence
destination and rollback custody before any live development action.
