# Public CAD fixture qualification

Run from the repository root after `npm ci --ignore-scripts`:

```sh
npm run cad:fixtures:qualify
npm run cad:fixtures:qualify -- --write
node --test scripts/cad-fixture-qualification.test.js scripts/cad-sandbox.test.js scripts/cad-worker.test.js scripts/cad-readiness.test.js
git diff --check
```

The authorized MIT fixtures are committed at
`scripts/fixtures/kantoku-mit/sample.igs` and
`scripts/fixtures/vibe-mit/solid.igs`, each alongside its upstream MIT license
and copyright notice. A fresh checkout needs only the locked dependencies;
there is no acquisition command, ignored-cache prerequisite or network fetch
in qualification. The source files are unchanged and their sizes/hashes are checked
before every run. The former cache acquisition script has been removed.

The default qualification command prints JSON without writing a file. `--write` replaces
`docs/cad-fixture-qualification-evidence.json`, including a failed matrix result.
Any failed check or setup failure exits nonzero. Setup errors are suppressed to
avoid echoing local paths or credentials. Check dependency installation and the
pinned fixture hash if setup fails. Matrix failures identify the failing case.
No URL, input path, or token arguments are accepted.

## What runs

The public fixture matrix lives in `scripts/fixtures/cad-public-matrix.json`.
Schema version 2 separates named fixtures from cases. Each case selects a
fixture ID. The runner loads only reviewed package paths or the reviewed vendored MIT fixtures and verifies byte size
and SHA-256 before making requests. It rejects paths outside the reviewed set
and real paths outside the selected source root. Other cases are deterministic in-memory
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
already demonstrated in the activation receipt. The MIT sample also produced 24 vertices and 12 triangles in the local HTTP
run; its pinned fixture uses those exact bounds. Counts live in the matrix
rather than the general geometry validator. Tests also exercise a
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
| kantoku-mit-sample | scripts/fixtures/kantoku-mit/sample.igs | Successful IGES conversion |
| vibe-mit-solid | scripts/fixtures/vibe-mit/solid.igs | Successful IGES conversion |

The first three are public test assets already installed with the dependency.
The fourth and fifth are individually Captain-authorized public acquisitions.
The exact authorized IGES assets and MIT notices are committed for reproducibility. The package cube source
note identifies its upstream GrabCAD origin; the other two are attributed to
the installed package only, without inferring separate authorship or licensing.

Before the authorized acquisition, the recursive installed-dependency inventory
found one IGES file, and the tracked repository inventory found no IGES files. Other package samples are
STEP, BREP or native FreeCAD formats. The two selected STEP files are small
(21,070 and 9,640 bytes) and stay below the request limit, so their rejection
checks exercise the format boundary rather than oversized-request handling.

## Authorized MIT source

- Repository: https://github.com/kantoku-code/CATIA_V5-igs2cat_groupbylayer
- Exact source: https://raw.githubusercontent.com/kantoku-code/CATIA_V5-igs2cat_groupbylayer/main/sample/sample.igs
- License: MIT (SPDX MIT), verified by the Integration Captain through GitHub API metadata before authorization.
- License reference: https://github.com/kantoku-code/CATIA_V5-igs2cat_groupbylayer/blob/main/LICENSE
- Acquired size: 24,948 bytes.
- SHA-256: `f2ebe63992eaf1f91b33d1f1773b3fa0ad5eb2fe66f1a477fb5f86f0427e1893`.
- Local HTTP outcome: ready, 24 vertices, 12 triangles, source hash binding validated, one simulated dispatch with confirmed simulated stop.

The source URL uses upstream main; the immutable SHA-256 pin makes a changed
upstream change require a separately reviewed fixture update. The runner validates the exact authorized URL,
license metadata, size and hash. The upstream copyright and permission notice are included beside the vendored
asset. Qualification requires no acquisition side effect. No CATPart or other source assets were acquired.

## Authorized Vibe_CADing MIT source

- Repository: https://github.com/Masoudjafaripour/Vibe_CADing/
- Exact source: https://raw.githubusercontent.com/Masoudjafaripour/Vibe_CADing/main/src/B-rep/results/solid.igs
- License: MIT (SPDX MIT); upstream notice is Copyright (c) 2025 Masoud Jafaripour.
- License reference: https://github.com/Masoudjafaripour/Vibe_CADing/blob/main/LICENSE
- Acquired size: 12,393 bytes.
- SHA-256: `d1e88b9e5ab38751e22bda59977d4aa37fd523040f75bc8a2f3428b50f562d71`.
- Local HTTP outcome: ready, one mesh, 24 vertices, 12 triangles, source hash binding validated, one simulated dispatch and stop.

The fixture and its notice are committed without modifying upstream bytes.
Exact vertex/triangle bounds remain fixture-specific. This adds a third
source-distinct IGES input; it does not establish shape diversity. All three
sources produce the same counts in these local runs.

Evidence records `three-source-distinct-local-conversions-shape-diversity-unproven`
only after three distinct fixture IDs have successful conversion records.
`successfulIgesSourceCount` counts source IDs rather than cube variants.
`shapeDiversity` remains `unproven`. Each conversion records its fixture and
case IDs, verified source hash, mesh count, vertex count and triangle count.
No raw geometry, source contents or runtime diagnostics enter this evidence.

Render comparison, STL, dimensions, assembly behavior and live hosted execution
remain unproven. This is incremental source diversity, not broad corpus coverage.
The earlier production proof remains in `cad-production-activation-receipt.md`
and `cad-production-activation-smoke-evidence.json`; this report does not replace
or claim to refresh that production receipt.

## Next gate

Captain review and integration come next. Acquisition authority covers only the
two exact MIT samples above. Additional sources need separate acquisition authority. A live matrix run requires a separately
approved bounded provider invocation and secure operator access. This script
intentionally has no live mode. Private CAD, new paid provider usage, production
configuration changes, deployment and user-facing UI exposure remain separate
human gates. No spending was incurred by this local qualification.

The next qualification decisions are a truly shape-diverse small licensed IGES
fixture, a limit decision for a larger official OCCT fixture, or a separately
approved bounded live-provider matrix run. None of these gates is cleared by
adding the Vibe_CADing source.
