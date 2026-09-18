# CAD development browser/session local runner

Status: source-only local runner review. No browser qualification run, server
start, browser launch, network request, local certificate generation, secret
read/write, upload activation, body admission, conversion, Sandbox dispatch,
private CAD, real-user flow, provider/resource/env change, usage/billing change,
retry, second run, or cleanup is authorized.

## Purpose

PR #317 allowed the existing private binding validator to accept a reviewed
`local-loopback-https` target. This packet adds the next source-reviewed runner
surface around that validator.

The runner accepts only an ignored, mode-locked private binding file and prints a
sanitized local execution plan. It does not start the server, open Chromium, send
requests, or create TLS material. Execution remains blocked until a later gate
accepts one exact private binding and grants one explicit live-run authority.

## Runner contract

```sh
node scripts/cad-dev-browser-session-local-runner.js --plan .local/cad-convex/browser-session-qualification-runs/<runId>/run-binding.json
```

The binding file must remain under a `0700` directory with mode `0600`. The
target must be an HTTPS loopback origin with `target.kind` set to
`local-loopback-https`. Reviewed preview targets are intentionally rejected by
this local runner gate.

The sanitized plan includes:

- run ID, source commit, target origin and route;
- binding SHA-256;
- start/end window;
- exact one-issuer-request and one-disabled-upload-request limits;
- request-body and body-read limits fixed at zero;
- no retry, no second run, and no redirects;
- all authority flags false.

The runner rejects `--execute` and `--execute-approved-once` in this packet. That
keeps the source review separate from live browser execution.

## Validation

```sh
node --test scripts/cad-dev-browser-session-local-runner.test.js scripts/cad-dev-browser-session-runner-binding.test.js
node --check scripts/cad-dev-browser-session-local-runner.js
node --check scripts/cad-dev-browser-session-local-runner.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

## Next

After merge and production fail-closed smoke, the next safe gate is to assemble
and accept one ignored private local-loopback HTTPS run binding. A later explicit
approval must name the accepted binding digest, source commit, exact UTC window,
and one-run authority before any browser/session qualification can execute.
