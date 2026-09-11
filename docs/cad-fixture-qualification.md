# Public CAD fixture qualification

Run from the repository root after `npm ci --ignore-scripts`:

```sh
npm run cad:fixtures:qualify
npm run cad:fixtures:qualify -- --write
node --test scripts/cad-fixture-qualification.test.js scripts/cad-sandbox.test.js scripts/cad-worker.test.js scripts/cad-readiness.test.js
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
Schema version 2 separates named fixtures from cases. Each case selects a
fixture ID. The runner loads only reviewed package paths and verifies byte size
and SHA-256 before making requests. It rejects paths outside the reviewed set
and real paths outside the package. Other cases are deterministic in-memory
mutations. Adding a source requires reviewing its provenance, adding its path
to the code allowlist, and recording its format, size and hash in the matrix. The path-rejection case uses a synthetic string and never
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
counts within the contract limits, and retain unqualified confidence. Optional
per-fixture vertex/triangle ranges supplement those general checks. The cube
retains exact bounds of 24 vertices and 12 triangles because those values were
already demonstrated in the activation receipt. Those counts live in the
matrix rather than the general geometry validator. Tests also exercise a
non-cube mesh, invalid indices, non-finite coordinates and count mismatches.

## Evidence and scope

The schema version 2 evidence contains fixed case IDs, HTTP statuses, pass
flags, per-fixture IDs/formats/sizes/hashes, the matrix hash, package version and
simulated dispatch counts. Consumers of the former top-level fixture hash and
size must now use the fixtures array. It excludes
raw request/response bodies, diagnostics, errors, source contents and local
paths. A sentinel check tests the allowlisted evidence shape; every HTTP
response and the final report are also checked for synthetic token/path leaks.

## Local source inventory

Inventory on the installed `occt-import-js` 0.0.23 package and repository found:

| Fixture ID | Package-relative source | Coverage |
| --- | --- | --- |
| cube | test/testfiles/cube-10x10mm/Cube 10x10.igs | Successful IGES conversion and mutations |
| rounded-cube-step | test/testfiles/rounded-cube/rounded-cube.step | HTTP 415 UNSUPPORTED, zero dispatch |
| conical-surface-step | test/testfiles/conical-surface/conical-surface.step | HTTP 415 UNSUPPORTED, zero dispatch |

These are public test assets already installed with the dependency. No CAD
files were downloaded or copied into the repository. The package cube source
note identifies its upstream GrabCAD origin; the other two are attributed to
the installed package only, without inferring separate authorship or licensing.

The recursive installed-dependency inventory found one IGES file, and the
tracked repository inventory found no IGES files. Other package samples are
STEP, BREP or native FreeCAD formats. The two selected STEP files are small
(21,070 and 9,640 bytes) and stay below the request limit, so their rejection
checks exercise the format boundary rather than oversized-request handling.

This broadens contract coverage, not independent successful IGES or visual
coverage. The three successful cases still share one cube geometry. Evidence
explicitly records `independentIgesCoverage: pending-no-additional-local-iges`.
Independent public IGES models, render comparison, STL and dimensional fidelity
remain future work.
The earlier production proof remains in `cad-production-activation-receipt.md`
and `cad-production-activation-smoke-evidence.json`; this report does not replace
or claim to refresh that production receipt.

## Next gate

Captain review and integration come next. To broaden successful IGES coverage,
the Captain must authorize acquisition of a named public source (including its
provenance/license review), or identify an already-approved local public source.
This slice cannot cross the network-CAD acquisition gate. A live matrix run requires a separately
approved bounded provider invocation and secure operator access. This script
intentionally has no live mode. Private CAD, new paid provider usage, production
configuration changes, deployment and user-facing UI exposure remain separate
human gates. No spending was incurred by this local qualification.
