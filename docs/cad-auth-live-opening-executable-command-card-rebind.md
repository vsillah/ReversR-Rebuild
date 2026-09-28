# CAD Auth executable command-card rebind

Status: source-only, no live opening, production closed.

This packet refreshes the executable runtime opening materials after PR #433. It
binds the current production deployment, an exact bounded session reference and
a proposed UTC window, then computes the SHA-256 for a reviewed executable
command-card byte draft.

It does not issue a command card, issue an upload session, activate production
upload, read a request body, run conversion, dispatch Sandbox work, collect live
evidence, change provider configuration, read secrets, send external messages,
enroll users or claim commercial readiness.

## Bound target

- Main commit: `f330ba5e934c28c05428ecd26cf4e04c58bbb790`
- Production deployment:
  `https://vercel.com/vsillahs-projects/reversr/BsEHweLAyEPADhnTPkw6WsEsonJK`
- Route: `https://reversr.vercel.app POST /api/cad/user-import`
- Cohort: `rrb-ref:cad-upload-internal-mark-test-cohort-v1`

## Runtime contract

The packet preserves the PR #433 disabled-by-default runtime wiring. The command
card bytes are review material only. A later live-opening gate must repeat the
packet SHA, deployment reference, exact command-card SHA, bounded session
binding and UTC window before any executable command-card, upload-session or
request-body gate can be used.

## Validation

Run:

```sh
node scripts/cad-auth-live-opening-executable-command-card-rebind-checker.js
node --test scripts/cad-auth-live-opening-executable-command-card-rebind.test.js scripts/cad-auth-live-opening-executable-runtime-wiring.test.js
```
