# CAD public sample render matrix

Status: source-only evidence register. Expenses: USD 0.

This register ties the public sample download set to the existing renderer
qualification evidence so internal testers have more than one sample source
without implying production upload, production conversion, private-CAD handling
or commercial readiness.

The machine-readable matrix lives at:

`docs/cad-public-sample-render-matrix.json`

It binds:

- `public/cad-fixtures/public-sample-set/manifest.json`
- `docs/cad-fixture-qualification-evidence.json`
- `public/cad-fixtures/mark-dispenser-v1/manifest.json`

## Sample coverage

| Sample | Download path | Renderer evidence |
| --- | --- | --- |
| Mark dispenser | `/cad-fixtures/mark-dispenser-v1/Dispenser.IGS` | Public preview display mesh bound to the Mark dispenser manifest; not re-rendered by this matrix. |
| Kantoku MIT sample | `/cad-fixtures/public-sample-set/kantoku-mit/sample.igs` | Local OCCT fixture case `kantoku-mit-sample-import`, 6 meshes, 24 vertices, 12 triangles. |
| Poseidon pump cover slide | `/cad-fixtures/public-sample-set/poseidon-bsd/pump-cover-slide.iges` | Local OCCT fixture case `poseidon-cover-slide-import`, 1 mesh, 232 vertices, 200 triangles. |
| Poseidon pump syringe brace | `/cad-fixtures/public-sample-set/poseidon-bsd/pump-syringe-brace.iges` | Local OCCT fixture case `poseidon-syringe-brace-import`, 1 mesh, 1,419 vertices, 2,450 triangles. |
| Vibe MIT solid | `/cad-fixtures/public-sample-set/vibe-mit/solid.igs` | Local OCCT fixture case `vibe-mit-solid-import`, 1 mesh, 24 vertices, 12 triangles. |

## Boundary

This is still public-material, source-only evidence. It does not activate live
upload, production conversion, Sandbox dispatch, private CAD handling, real-user
enrollment, provider/resource/env mutation, billing changes or external sends.

This register also does not prove arbitrary CAD compatibility, dimensional
certification, manufacturing quality or per-run commercial cost. Those remain
separate commercialization-roadmap gates.

## Validation

```sh
node --test scripts/cad-public-sample-set.test.js scripts/cad-public-sample-render-matrix.test.js scripts/cad-fixture-qualification.test.js
git diff --check
```
