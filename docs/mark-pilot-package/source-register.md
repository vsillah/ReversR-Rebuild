# Source register and claim ledger

This file keeps source observations separate from the manufacturer-facing
guidance. It contains no private CAD, recipient address, credential, or raw
private corpus content.

## Immutable source binding

- Branch: `codex/mark-pilot-package`
- Commit: `487a4d72369dda9e6afa9332763a14bb8285cef8`
- Tree: `65c8647d15383eccf4c78e5b92e3fd3c3ac5cf4c`
- Merge subject: `feat: add manufacturer CAD welcome tour`
- Merged PR reference in Git history: `#517`

The worktree matched this commit and tree with no local changes before package
authoring.

## Current implementation sources

| Source | What it supports |
| --- | --- |
| [`app/index.tsx`](../../app/index.tsx) | Six tour steps, 18 subtasks, local resume state, Dispenser fixture binding, phase focus, restart/exit behavior, and locked manufacturing decision copy |
| [`components/ManufacturerTourGuide.tsx`](../../components/ManufacturerTourGuide.tsx) | Visible guide, progress, public-fixture badge, subtask gating, restart, exit, and final hold action |
| [`utils/cadInternalTesterPreview.js`](../../utils/cadInternalTesterPreview.js) | Production hostname allowance, `mark-dispenser-v1` route, source facts, imported geometry facts, reference images, STL facts, and warnings |
| [`components/CadDesignReview.tsx`](../../components/CadDesignReview.tsx) | Separate original/derived downloads, source and review fingerprints, and source-to-derived display |
| [`public/cad-fixtures/mark-dispenser-v1/manifest.json`](../../public/cad-fixtures/mark-dispenser-v1/manifest.json) | Redistribution authorization record, exact source and derived hashes, source binding, dimensions, component count, watertightness, and reference hashes |
| [`scripts/cad-manufacturer-tour.test.js`](../../scripts/cad-manufacturer-tour.test.js) | Static regression for tour facts, privacy boundary, source/STL distinction, and manufacturing-limit copy |
| [`scripts/cad-manufacturer-tour-smoke.js`](../../scripts/cad-manufacturer-tour-smoke.js) | Browser flow for all six steps, controls, restart/resume, source/STL details, Build hold, responsive viewports, and no write requests |

## Public fixture facts

| Artifact | Bytes | SHA-256 | Recorded role |
| --- | ---: | --- | --- |
| `Dispenser.IGS` | 701,346 | `1e52b301cf33bc241cd0d3d039691236ab45116f439197820f690b424750f0b8` | Original IGES source; units recorded as millimeters |
| `dispenser-derived.stl` | 131,784 | `9b5bfa4b86d6976ae87e6f023b3a243d4b04966b2337b224203bb630e7b8096e` | Derived display/inspection mesh, bound to the source SHA-256 |

Recorded source bounds are `55.7403 × 69.417713 × 114.825561 mm`.
The display mesh records 2,634 triangles, four connected components, and
`watertight: false`.

The manifest records source-provider authorization for anyone-with-link Vercel
preview redistribution. It does not record a general fabrication license or
prove underlying design ownership.

## Production route observation

Observed read-only on October 11, 2026:

`https://reversr.vercel.app/?cadPreview=mark-dispenser-v1&cadPhase=input`

The route loaded the ReversR CAD Input screen with `Use public sample
Dispenser.IGS`. The reconstruction menu exposed `Tour`. Selecting it opened
step 1 of 6 with these visible signals:

- `SOURCE IDENTITY`;
- `Begin with the file you were given`;
- `Public Dispenser.IGS fixture · no upload`;
- three source subtasks;
- progress `0 / 18`;
- disabled Next until all three step subtasks are checked.

This confirms the production entry and the visible start action. It does not
prove a deployment-to-commit identity from Vercel metadata, and it does not
create an external-send receipt.

## Claim ledger

| Claim | Status | Evidence boundary |
| --- | --- | --- |
| The production URL opens the public Dispenser workspace | Verified in merged source and live production UI | Read-only browser observation; no private file and no external write |
| The URL auto-starts the manufacturer tour | Unsupported | No tour query parameter is parsed. The user must open the reconstruction menu and select `Tour`. |
| The tour uses the public Dispenser fixture | Verified | `MANUFACTURER_TOUR_PREVIEW` binds `MARK_DISPENSER_RESULT` |
| The tour uses or requests Mark's private file | Rejected by scope and copy | Tour copy says public fixture; guide contains no file request; this package forbids private selection |
| The original and STL are distinct | Verified | Separate filenames, hashes, roles, download choices, and source binding |
| The STL has traceable lineage to this source | Partly verified | Manifest records `sourceSha256`; exact converter version, settings, operator, and timestamp are absent |
| The displayed dimensions are manufacturing-verified | Unsupported | They are imported bounding-box observations only |
| Four components equal four manufactured parts | Unsupported | Source calls them connected geometry components, not a certified bill of materials |
| The STL is print-ready | Rejected | Manifest says the mesh is not fully watertight; no slicer or process qualification exists |
| Starting the tour sends CAD to a provider | Rejected for the tour path | It reads public assets and does not activate private upload or provider conversion; ordinary page/public-asset requests still occur |
| Closing the guide deletes private CAD | Not applicable | No private CAD enters the tour. Closing saves only tour progress on the device. |
| Successful viewing or conversion means manufacturing readiness | Rejected | Build remains locked and the decision is hold for engineering and manufacturing review |

## Stale evidence excluded from current route claims

[`docs/cad-public-material-preview-path.md`](../cad-public-material-preview-path.md)
records an earlier state in which the production hostname was blocked. The
current merged route source allows `reversr.vercel.app`, and the current
production UI was observed directly. The older document remains useful for the
fixture authorization and limitation history, but not for today's host-access
claim.

## Artifact separation

- Raw, public source facts and live observations stay in this register.
- Derived manufacturer guidance stays in
  [manufacturer-concerns-and-limitations.md](manufacturer-concerns-and-limitations.md).
- Live-use materials stay in the facilitator script, feedback questions,
  privacy language, and runbook.
- Private session notes, consent records, and any later file references must
  remain outside this public package.
