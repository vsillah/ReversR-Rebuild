# CAD development browser/session local runner

Status: source-only local executor review. No browser qualification run is
authorized by this packet. Server start, browser launch, loopback network
request, local certificate use, evidence writing and teardown require a later
explicit one-run approval that names the exact binding and acceptance receipt
digests. No local certificate generation, secret read/write, upload activation,
body admission, conversion, Sandbox dispatch, private CAD, real-user flow,
provider/resource/env change, usage/billing change, retry, second run, or
cleanup is authorized by this source packet.

## Purpose

PR #317 allowed the existing private binding validator to accept a reviewed
`local-loopback-https` target. This packet adds the next source-reviewed runner
surface around that validator.

The runner accepts only an ignored, mode-locked private binding file. Its plan
mode prints a sanitized local execution plan. Its execution mode is present for
source review, but requires `--execute-approved-once` plus the exact binding
SHA-256 and local acceptance-receipt SHA-256 from a future approval gate.
Execution remains blocked until that later gate accepts one exact private
binding and grants one explicit live-run authority.

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

Future execution, after separate approval, uses:

```sh
node scripts/cad-dev-browser-session-local-runner.js --execute-approved-once .local/cad-convex/browser-session-qualification-runs/<runId>/run-binding.json --binding-sha256 <BINDING_SHA256> --acceptance-receipt-sha256 <ACCEPTANCE_RECEIPT_SHA256>
```

The executor starts only the run-owned local HTTPS target from the binding,
opens one fresh Chromium context with persistent profile, extensions and service
workers disabled, sends one bodyless issuer POST, then one bodyless disabled
upload-route POST using the browser-managed HttpOnly cookie and CSRF token. It
writes sanitized evidence and a sanitized receipt under the ignored run
directory. It stops on any unexpected status, body read, open upload gate, stale
window, digest mismatch, or missing acceptance receipt. It does not record raw
authorization, cookies, CSRF token, private key, or CAD file content.

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
and accept one ignored private local-loopback HTTPS run binding for the merged
source commit. A later explicit approval must name the accepted binding digest,
acceptance receipt, source commit, exact UTC window, and one-run authority before
any browser/session qualification can execute.
