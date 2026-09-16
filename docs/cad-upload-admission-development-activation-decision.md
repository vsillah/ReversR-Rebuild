# CAD upload admission development activation decision

Status: source-only decision packet. It prepares the next source implementation
slice and authorizes no execution. Base:
`6b596b9890f835e15685910c48f793dcf4fa7b8c`. Branch:
`codex/cad-upload-admission-activation-decision`. Expenses: USD 0.

## Accepted input

The latest upload admission qualification closeout is accepted as the input for
this decision:

- Decision: `UPLOAD_ADMISSION_EXECUTOR_GATE_EXECUTED`
- Evidence SHA-256: `cb4619a7b0c34731047f6493a4c74d5e1ffb3cf598c1a7a6117e0525318f9ffd`
- Receipt SHA-256: `176440f7c579ff709dcd8ca30ea3dad41200d7c01658a10064ccfeafc66024b4`
- Public fixture SHA-256: `5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3`
- Public fixture bytes: `11562`

That closeout proved an isolated development route copy can validate the public
IGES body and still terminate at `USER_UPLOADS_DISABLED`. It did not enable the
mounted production route.

## Current guards

- `server/cadUserUploadRouter.js` must retain
  `const BODY_ADMISSION_AUTHORIZED = false;`.
- `server/cadUploadAdmissionRuntimeBridge.js` remains unmounted.
- The current terminal code remains `USER_UPLOADS_DISABLED`.
- Conversion and Sandbox dispatch remain unauthorized.
- Private CAD, real users, external messages, env/provider/resource changes,
  usage/billing changes and secret reads remain unauthorized.

## Future development-only bounds

A future source-only executor may be prepared for one development-only activation
attempt only if it preserves these bounds:

- Target: `reversr-cad-auth-dev` / `majestic-alligator-31`
- Fixture: public synthetic cube only
- Max attempts: 1
- Automatic retry: false
- Second run: false
- All-in cap: USD 50
- Stop on unknown outcome
- Stop before conversion and Sandbox
- No retained-state deletion
- Rollback first action: close admission before drain or reconciliation

## Missing before any run

- source-only development activation executor
- exact UTC execution window
- sanitized local evidence destination
- preflight proving the mounted production route remains disabled
- rollback receipt proving admission closure before reconciliation

## Next safe action

Create `codex/cad-upload-admission-development-activation-executor` as a
source-only executor/test packet. It may exercise the reviewed runtime bridge in
development-only form, but it must keep the mounted production route disabled and
stop before live execution, production upload activation, conversion, Sandbox,
private CAD, real users or external delivery.

## Validation

```sh
node --test scripts/cad-upload-admission-development-activation-decision.test.js scripts/cad-upload-admission-qualification-closeout.test.js scripts/cad-upload-admission-runtime-bridge-source.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
