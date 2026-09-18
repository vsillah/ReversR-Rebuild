# CAD development browser/session harness

Base: `6d08c57bf55c9c67399e5a36fb80bbe8d842917b`, after PR #313.
Branch: `codex/cad-dev-browser-session-harness`.
Status: source-only development browser/session harness for the mounted CAD
session issuer route.
Expenses: USD 0.

## What Changed

`scripts/cad-dev-browser-session-harness.js` adds a local in-process Express
harness for `POST /api/cad/dev-upload-session`. The harness injects a synthetic
development-only auth adapter into `cadDevAuthSessionIssuerBridge`, calls the
mounted route through the canonical browser upload-session adapter, and then
uses the returned cookie/CSRF pair against `/api/cad/user-import`.

The expected result is intentionally closed:

- the browser adapter reports `SESSION_READY`
- `canSubmit` remains `false`
- `/api/cad/user-import` returns `USER_UPLOADS_DISABLED`
- `BODY_ADMISSION_AUTHORIZED` remains literal `false`
- no request body is read before the session and disabled-upload gates
- sanitized evidence records only a cookie digest, never the cookie value or CSRF
  token

The harness also verifies the default mounted route stays unavailable when no
explicit development adapters are injected.

## Preserved Boundaries

- no live development run
- no production upload activation
- no upload body admission
- no CAD file reads
- no conversion or Sandbox dispatch
- no private CAD
- no provider, resource, environment, secret, usage, or billing changes
- no real users, enrollment, email, SMS, or Slack
- no retry or second run

## Validation

```sh
node --test scripts/cad-dev-browser-session-harness.test.js scripts/cad-dev-auth-session-issuer-bridge.test.js scripts/cad-upload-session-browser.test.js scripts/cad-user-upload-route.test.js
node --check scripts/cad-dev-browser-session-harness.js
node --check scripts/cad-dev-browser-session-harness.test.js
git diff --check
```

## Next Gate

After this source-only packet merges and production fail-closed smoke passes, the
next CAD Import gate is a development-only browser/session qualification using a
reviewed non-production target and accepted synthetic Auth context. It must still
stop before upload body admission, production upload activation, CAD conversion,
private CAD, Sandbox dispatch, provider/resource mutation, or real-user use.
