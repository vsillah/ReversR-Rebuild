# Public CAD fixture qualification

Run from the repository root after `npm ci --ignore-scripts`:

```sh
npm run cad:fixtures:qualify
npm run cad:fixtures:qualify -- --write
node --test scripts/cad-fixture-qualification.test.js scripts/cad-sandbox.test.js scripts/cad-worker.test.js scripts/cad-readiness.test.js
git diff --check
```

The authorized fixtures are committed at
`scripts/fixtures/kantoku-mit/sample.igs` and
`scripts/fixtures/vibe-mit/solid.igs`, plus the two files under
`scripts/fixtures/poseidon-bsd/`, each directory alongside its upstream license
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
fixture ID. The runner loads only reviewed package paths or the reviewed vendored MIT/BSD fixtures and verifies byte size
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
| poseidon-cover-slide | scripts/fixtures/poseidon-bsd/Pump Cover Slide.iges | 232 vertices, 200 triangles |
| poseidon-syringe-brace | scripts/fixtures/poseidon-bsd/Pump Syringe Brace.iges | 1,419 vertices, 2,450 triangles |

The first three are public test assets already installed with the dependency.
The remaining four are individually Captain-authorized public acquisitions.
The exact authorized IGES assets and license notices are committed for reproducibility. The package cube source
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

## Authorized Poseidon BSD-2-Clause sources

Repository: https://github.com/pachterlab/poseidon

Both files are pinned to commit `5a139fed350bbf5d775ffa9650f465e557b6ccb0`.
License: BSD-2-Clause, retained verbatim beside the files. License URL:
https://github.com/pachterlab/poseidon/blob/5a139fed350bbf5d775ffa9650f465e557b6ccb0/LICENSE

License SHA-256: `5188559ecc761ecb869ed20b8eccce9cb43cb93b4afec9b62530b3f49b3af9b6`.

| Fixture | Bytes | SHA-256 |
| --- | ---: | --- |
| Pump Cover Slide.iges | 48,357 | `054992f5b7cd0fc3cd2f2f2ac8358b329708b7573a6ee154d9ddf128b1ff0402` |
| Pump Syringe Brace.iges | 40,824 | `ffa127dfd22931f5b518b466a49dca91b4d35fa1361ead8dba37dd6b7868a60c` |

Exact raw sources:

- https://raw.githubusercontent.com/pachterlab/poseidon/5a139fed350bbf5d775ffa9650f465e557b6ccb0/HARDWARE/pump/iges/Pump%20Cover%20Slide.iges
- https://raw.githubusercontent.com/pachterlab/poseidon/5a139fed350bbf5d775ffa9650f465e557b6ccb0/HARDWARE/pump/iges/Pump%20Syringe%20Brace.iges

The route returns one mesh per fixture, with 232 vertices / 200 triangles for
the slide and 1,419 vertices / 2,450 triangles for the brace. Both remain below
the existing 64 KiB input cap. No limit change is needed for this slice.

Per-fixture matrix assertions check the exact counts plus min/max bounds on
all three axes, using an absolute tolerance of 0.00001 in the returned coordinate
space. These expected values came from the Captain's local probe and were
confirmed through the HTTP runner. They detect displacement or geometry drift;
they are not dimensional certification or source-fidelity proof.

Evidence now records five distinct successful IGES fixture inputs, with
`shapeDiversity: demonstrated-for-local-poseidon-fixture-conversion-only` only
when both Poseidon cases pass their counts, bounds, hashes and dispatch checks.
`successfulIgesFixtureCount` counts fixture IDs, not upstream repositories.
The two Poseidon fixtures share one repository, commit and license; they are
two fixture inputs from the same provenance group. Repeated cube variants count
as one fixture.

The two pump parts materially broaden local fixture shapes beyond the earlier
24-vertex / 12-triangle samples. This does not qualify arbitrary CAD models.
Each conversion records fixture/case IDs, verified source hash, mesh/vertex/
triangle counts and bounds. Raw source and geometry stay out of the evidence.

Live hosted public matrix execution is recorded in
`docs/cad-live-hosted-public-fixture-matrix-evidence.json`. That evidence covers
the five successful public IGES fixture inputs, seven successful hosted Sandbox
dispatches, expected no-dispatch failures for malformed/unsupported/auth/gate
cases, fixed 1 vCPU / 2048 MB / 60s / deny-all-network runtime metadata, and
confirmed cleanup for every hosted dispatch. It does not use private CAD files.
The opt-in live runner is `scripts/cad-live-hosted-fixture-matrix.js`; it
requires both `--live` and `CAD_FIXTURE_MATRIX_APPROVED=true`, and it writes
only allowlisted evidence fields. It may use explicit `VERCEL_*` credentials or
the local Vercel CLI auth plus the linked `.vercel/project.json`.

Private CAD readiness, arbitrary-model source fidelity, render/STL behavior,
dimensional certification and manufacturing-quality output remain unproven.
The earlier production proof remains in `cad-production-activation-receipt.md`
and `cad-production-activation-smoke-evidence.json`; this public matrix report
does not replace or broaden that production receipt beyond the fixture matrix.

## Next gate

Captain review and integration come next. Acquisition authority covers only the
four exact vendored samples above. Additional sources need separate acquisition authority. Private CAD, new paid provider usage, production
configuration changes, deployment and user-facing UI exposure remain separate
human gates.

The next decisions are a private-CAD pilot gate, a broader fixture/visual
fidelity slice, or a separately approved limit decision for a larger official
OCCT sample. Public fixture matrix qualification does not clear those gates.
