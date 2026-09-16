# CAD upload admission development body-admission packet

Status: source-only body-admission packet. No live run happened. Base:
`3be095edb1c8968c9a6e49b9feef355a2f0e3690`, after PR #280. Branch:
`codex/cad-upload-admission-development-body-admission-packet`. Expenses:
USD 0.

This packet binds the successful activation-preview closeout to the next
development-only body-admission source slice. It does not open the mounted route
or authorize a live run. The mounted production route must keep:

```js
const BODY_ADMISSION_AUTHORIZED = false;
```

The next executor may only use an isolated VM route copy where that literal is
temporarily replaced for one bounded development run. It may not edit or mount a
tracked production route, dispatch conversion, dispatch Sandbox work, use
private CAD, use real users, read secrets or send external messages.

## Inputs

- Activation-preview closeout:
  `offline/cad-convex/uploadAdmissionDevelopmentActivationCloseout.json`
- Qualification closeout:
  `offline/cad-convex/uploadAdmissionQualificationCloseout.json`
- Run manifest:
  `docs/cad-upload-activation-run-manifest.json`
- Public fixture SHA-256:
  `5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3`

## Run criteria for the next source slice

- Bind an exact future UTC window before execution.
- Use only one attempt, no automatic retry and no second run.
- Use the public synthetic cube fixture only.
- Read a body only inside an isolated route copy.
- Keep mounted production body admission closed before and after the run.
- Write sanitized ignored evidence under `.local/` with directory mode `700` and
  file mode `600`.
- Never record `contentBase64`, raw credentials, private CAD or private paths.
- Stop on unknown outcome.
- Preserve rollback target `USER_UPLOADS_DISABLED`.

## Validation

```sh
node --test scripts/cad-upload-admission-development-body-admission-packet.test.js scripts/cad-upload-admission-development-activation-closeout.test.js scripts/cad-upload-admission-qualification-closeout.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Next safe action

Prepare the source-only development body-admission executor and tests. That next
source slice must still stop before live execution until it has a merged source
packet, green checks, production fail-closed smoke and a current bounded window.
