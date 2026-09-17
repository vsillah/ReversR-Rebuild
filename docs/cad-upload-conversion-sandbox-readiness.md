# CAD upload conversion and Sandbox readiness

Status: source-only readiness decision and one-shot runner. No Sandbox was
created and no conversion ran in this lane. Base:
`dcddbcf8b0a0d636749cacc9084c63b7c4f346e9`. Branch:
`codex/cad-upload-conversion-sandbox-readiness`. Expenses: USD 0.

## Decision

Do not repeat a standalone Sandbox proof. The identical public cube fixture was
already converted successfully through the hosted Sandbox executor, and the
executor, Sandbox configuration, guest runner and worker contract are unchanged
from the accepted private-pilot execution boundary.

The open question is narrower: can the newly qualified development upload path
hand the already validated public body to the existing converter once, while the
mounted user route stays disabled? This packet adds a one-shot CLI for that
development-only check.

## Preserved boundaries

- `server/cadUserUploadRouter.js` retains
  `const BODY_ADMISSION_AUTHORIZED = false;`.
- The runner accepts only the checksum-pinned public cube fixture.
- Live execution requires `--live`, a dedicated approval environment flag and
  an exact UTC window no longer than 30 minutes.
- One attempt is allowed. There is no retry or second-run loop.
- The Sandbox stays non-persistent, deny-all networked, one vCPU, 2048 MB and
  limited to a 60-second lifetime.
- Evidence is sanitized, Git-ignored and written with directory mode `700` and
  file mode `600`.
- Production user upload activation, private CAD, real users, store mutation and
  external delivery remain unauthorized.

## Evidence reused

- Upload-path closeout merge: `dcddbcf8b0a0d636749cacc9084c63b7c4f346e9`
- Upload evidence: `29be0ace835239dcaa46ebdb71b247a850b360e072a7043f446b0a418c7e4a8f`
- Upload receipt: `298f25e13ca43aee29432954853bd4cc13924b2c39c3767a70552575f313e847`
- Hosted public fixture matrix:
  `2d982c39c0318f69e074a99c7822d11596dc9b1243c81cd257608cd826ab6b54`
- Fixed public cube:
  `5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3`

## Validation

```sh
node --test scripts/cad-upload-conversion-sandbox-readiness.test.js scripts/cad-sandbox.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
git diff --check
```

The next live action, after merge and production fail-closed verification, is
one development-only public-fixture conversion using the new CLI. It remains a
separate execution event and must stop on any unknown outcome.
