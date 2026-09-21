# CAD public sample set

Status: source-only static public CAD sample set. Expenses: USD 0.

This packet exposes five authorized `.igs` or `.iges` files through the existing
static asset path so a desktop browser or Android device can download more than
one public CAD source for local preview testing.

The manifest is served from:

`/cad-fixtures/public-sample-set/manifest.json`

The tap-friendly download page is served from:

`/cad-fixtures/public-sample-set/`

## Files

| ID | Path | License or authorization |
| --- | --- | --- |
| `mark-dispenser-v1` | `/cad-fixtures/mark-dispenser-v1/Dispenser.IGS` | Source-provider authorized anyone-with-link Vercel preview redistribution. |
| `kantoku-mit-sample` | `/cad-fixtures/public-sample-set/kantoku-mit/sample.igs` | MIT |
| `poseidon-cover-slide` | `/cad-fixtures/public-sample-set/poseidon-bsd/pump-cover-slide.iges` | BSD-2-Clause |
| `poseidon-syringe-brace` | `/cad-fixtures/public-sample-set/poseidon-bsd/pump-syringe-brace.iges` | BSD-2-Clause |
| `vibe-mit-solid` | `/cad-fixtures/public-sample-set/vibe-mit/solid.igs` | MIT |

License files for the vendored MIT/BSD fixtures are copied beside the public
downloads. Mark's dispenser remains bound to its existing authorization manifest.

## Boundaries

This is static public-material access only. It does not activate production
upload, production conversion, Sandbox dispatch, private CAD handling, real-user
enrollment, provider/resource/env mutation, billing changes, or external sends.

The files are useful for device/browser selection and local preview coverage.
They are not evidence that arbitrary CAD formats are production-ready or that a
CAD run has a known customer fee.

## Validation

```sh
node --test scripts/cad-public-sample-set.test.js
git diff --check
```
