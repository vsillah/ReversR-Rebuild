# Public CAD fixture qualification

Run from the repository root after `npm ci --ignore-scripts`:

```sh
npm run cad:fixtures:qualify
npm run cad:fixtures:qualify -- --write
node --test scripts/cad-sandbox.test.js scripts/cad-worker.test.js scripts/cad-readiness.test.js
git diff --check
```

The default command prints JSON without writing a file. `--write` replaces
`docs/cad-fixture-qualification-evidence.json`, including a failed matrix result.
Any failed check or setup failure exits nonzero. Setup errors are suppressed to
avoid echoing local paths or credentials. Check dependency installation and the
pinned fixture hash if setup fails. Matrix failures identify the failing case.
No URL, input path, or token arguments are accepted.

## What runs

The public fixture matrix lives in `scripts/fixtures/cad-public-matrix.json`.
The runner reads only the pinned public cube from the installed OCCT package;
it verifies SHA-256 before making requests. Other cases are deterministic
in-memory mutations. The path-rejection case uses a synthetic string and never
opens a file at that path.

A loopback Express server mounts the production Sandbox router with a fresh
synthetic token and isolated configuration. The real Sandbox executor receives
a local provider substitute. Successful conversions execute the existing OCCT
worker through its transport-denying test entrypoint. No Sandbox SDK dispatch
or live credentials are used. Cleanup and resource metadata from the substitute
are simulated and cannot attest provider isolation, memory limits or cleanup.

Checks cover capabilities, absent and invalid auth, public cube conversion,
IGES extension and CRLF variants, malformed JSON/base64/IGES, absent source,
unsupported formats and transforms, path rejection, decoded-source and JSON
limits plus one byte, and six missing/invalid configuration states. Rejected
requests must not dispatch conversion. Successful responses must bind to the
submitted source hash, contain valid indices and finite coordinates, report
24 vertices and 12 triangles for this cube, and retain unqualified confidence.
Those geometry counts are fixture assertions, not production acceptance rules.

## Evidence and scope

The evidence contains fixed case IDs, HTTP statuses, pass flags, public fixture
and matrix hashes, package version and simulated dispatch counts. It excludes
raw request/response bodies, diagnostics, errors, source contents and local
paths. A sentinel check tests the allowlisted evidence shape; every HTTP
response and the final report are also checked for synthetic token/path leaks.

This broadens contract coverage, not independent model or visual coverage.
The three successful cases share one cube geometry. Independent public IGES
models, render comparison, STL and dimensional fidelity remain future work.
The earlier production proof remains in `cad-production-activation-receipt.md`
and `cad-production-activation-smoke-evidence.json`; this report does not replace
or claim to refresh that production receipt.

## Next gate

Captain review and integration come next. A live matrix run requires a separately
approved bounded provider invocation and secure operator access. This script
intentionally has no live mode. Private CAD, new paid provider usage, production
configuration changes, deployment and user-facing UI exposure remain separate
human gates. No spending was incurred by this local qualification.
