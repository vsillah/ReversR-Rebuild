# CAD development browser/session HTTPS target binding

Status: source-only target-binding refinement. No browser qualification run,
server start, browser launch, upload activation, body admission, conversion,
Sandbox dispatch, private CAD, real-user flow, provider/resource/env change,
secret read, usage/billing change, retry, second run, or cleanup is authorized.

## Decision

The safest near-term browser/session target is local loopback HTTPS, not
production and not a shared preview. The PR #316 validator previously rejected
loopback completely. This update keeps that fail-closed default, but permits
loopback only when the binding explicitly declares `local-loopback-https` and
supplies the local TLS, browser-isolation, custody, cost, rollback, and disabled
gate evidence.

That means ordinary `localhost` or `127.0.0.1` is still rejected. A binding must
prove:

- HTTPS origin only;
- loopback host with an explicit high port;
- a run-owned certificate digest and private-key digest;
- private-key mode `0600`;
- no trust-store mutation;
- fresh Chromium context with HTTPS errors ignored only for the run-owned local
  certificate;
- no persistent profile, extensions, or service workers;
- one issuer request, one disabled upload request, zero request bytes, zero body
  reads, no retry, and no second run.

## Boundaries

This change does not generate TLS material, store secrets, start a server, open a
browser, or execute the qualification. It only lets the ignored local binding
validator distinguish an accepted local HTTPS target from unsafe localhost use.

Production remains forbidden. Uploads remain disabled. Body admission remains
disabled. Conversion and Sandbox remain disabled. Private CAD and real users
remain outside scope.

## Validation

```sh
node --test scripts/cad-dev-browser-session-runner-binding.test.js
node --check scripts/cad-dev-browser-session-runner-binding.js
node --check scripts/cad-dev-browser-session-runner-binding.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

## Next

After merge and production fail-closed smoke, the next safe gate is source/local
assembly of one ignored local loopback HTTPS binding plus a source-reviewed
browser runner. The live browser/session qualification still requires a separate
accepted binding and explicit one-run authority.
