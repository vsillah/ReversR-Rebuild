# CAD development browser/session runner binding

Status: source-only binding prep. No browser run, live request, upload
activation, conversion, Sandbox dispatch, production mutation, private CAD, real
user, provider/resource/env change, secret read, retry, second run, or cleanup is
authorized by this packet.

## Purpose

PR #315 created the browser/session qualification contract, but it deliberately
did not create a runnable qualification. The existing Node harness proves the
route chain and disabled upload boundary with manual cookie forwarding. It does
not prove browser-owned cookie storage, Secure/HttpOnly/SameSite behavior, a
reviewed same-origin HTTPS target, or an accepted run binding.

This slice adds an inert runner-binding validator:

- `scripts/cad-dev-browser-session-runner-binding.js`
- `scripts/cad-dev-browser-session-runner-binding.test.js`
- `docs/cad-dev-browser-session-runner-binding.json`

The validator inspects one ignored local binding file and emits only sanitized
metadata. It does not start a server, open a browser, send a request, create an
Auth session, mutate a store, or arm the qualification.

## Binding Rules

The accepted binding must live under an ignored local custody directory with
directory mode `700` and file mode `600`. The binding must include:

- the run ID and exact source commit;
- SHA-256 digests for the PR #315 packet Markdown and JSON;
- a non-production same-origin HTTPS origin and exact browser route;
- a synthetic server-owned header resolver acceptance receipt;
- rollback, custody, zero-cost, and production fail-closed smoke receipts;
- limits of one issuer request, one disabled upload request, zero request-body
  bytes, zero body reads, no redirect, no retry, and no second run.

The validator rejects the production domain, non-HTTPS targets, unresolved packet
digests, malformed windows, nonzero cost, enabled body admission, upload
activation, conversion, Sandbox, private CAD, real users, provider/resource/env
mutation, usage/billing changes, external messages, and cleanup authority.

## Validation

```sh
node --test scripts/cad-dev-browser-session-runner-binding.test.js
node --check scripts/cad-dev-browser-session-runner-binding.js
node --check scripts/cad-dev-browser-session-runner-binding.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

These commands are source/static validation only. The next live-like step still
requires a populated ignored binding, independent acceptance, and a separate
single-run approval or autopilot gate that names the accepted values.

## Next

After this source-only slice merges and production fail-closed smoke passes, the
next gate is local restricted binding assembly and acceptance for one
development-only browser/session qualification attempt. If a reviewed
non-production HTTPS target is unavailable, stop at binding prep.
