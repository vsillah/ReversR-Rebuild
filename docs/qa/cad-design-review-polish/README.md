# CAD review visual polish

Base: main `b7fae4dd6b5e45e037dfda655801c382c27e1ba4`. Branch: `codex/cad-design-review-visual-polish`. The source-complete recording improvements from PR #306 (`679a7ba86acc826466dd45f09de486b9870b8e2d`) are carried forward as `fb2b961`. PR #306 remains open and unchanged; this product-polish PR is intended to supersede it once the Captain accepts the new result. Neither PR is merged or marked ready.

## What changed

Compared actual Type, Scan, Sample, and Import implementations in `PhaseOne.tsx`, then visually inspected all four ordinary Input modes at 1440/768/390/320. CAD now uses their theme typography, icon-led headers, surface/border treatment, and primary-action hierarchy. A single phase surface contains the content; there are no nested status cards or badge stacks.

- Input shows the authorized file and acquisition state with disabled upload always visible. Access, status checking, and certification caveats expand on demand.
- Inventory uses compact X/Y/Z dimensions and units, component count, and a visible unverified-parts blocker. Provenance, confidence, byte/vertex/triangle counts, and the complete parts caveat remain in Source & inventory details.
- Design leads with the model, qualification status, and a visible geometry-review/Build-lock warning. Source metadata and the original IGES action follow; Front/Left/Top/Drawing remain image-first links. Full warnings, provenance, and certification limits expand below.
- Build presents the three prerequisites and disabled output action, with full warnings in a disclosure and clear recovery to Design or Inventory.

All existing source/reference action labels and test IDs remain. Disclosures expose expanded state and their controlled content, support Enter, and remove collapsed content from the accessibility tree. The viewer implementation, stable phase rail, URLs/history, import selection logic, capabilities request logic, conversion gates, material, grid, and orientation controls are unchanged.

## Exact review route

`http://127.0.0.1:5196/?cadPreview=mark-dispenser-v1`

The integrated Browser runtime is still unavailable because the session's configured Documents/ReversR writable root contains a symlink. Visual evidence uses local Playwright with nonlocal and API requests blocked. Shell escalation only works around the sandbox initialization failure; no configuration was changed.

## Validation

```sh
node --test scripts/workflow-phases.test.js scripts/cad-internal-tester-preview.test.js scripts/cad-viewer-presentation.test.js
npm run typecheck
npm run accessibility:preflight
EXPO_OFFLINE=1 npm run web:export
python3 -m http.server 5196 --bind 127.0.0.1 --directory dist
node scripts/cad-review-polish-smoke.js
CAD_PHASE_EVIDENCE=/private/tmp/cad-polish-phase node scripts/cad-phase-progression-smoke.js
CAD_PUCK_URL='http://127.0.0.1:5196/?cadPreview=mark-dispenser-v1' CAD_PUCK_EVIDENCE=/private/tmp/cad-polish-viewer node scripts/cad-orientation-puck-smoke.js
node scripts/cad-polish-walkthrough.js
CAD_PHASE_QA=docs/qa/cad-design-review-polish CAD_PHASE_FRAMES=/private/tmp/cad-polish-frames node scripts/cad-phase-walkthrough-frames.js
git diff --check
```

Passed 16 focused safety/phase/viewer tests, typecheck, accessibility preflight, and offline export. Browser polish, phase, and viewer suites pass at 1440/768/390/320 × 1000; viewer clearance also passes at 855×904. Browser tests exercise all changed actions, four disclosures with keyboard expansion/collapse, visible blockers, download filename, four reference links, both Build recovery actions, Input service failure/retry, ordinary Import picker and clearing, history/reload, and overflow checks. Existing safety assertions were retained; the phase smoke opens the new Import disclosure before checking status. No browser page errors or write requests occurred in the CAD sweep. The inherited phase suite additionally checks its synthetic public-cube fallback; the recording uses only the authorized public dispenser.

`polish-results.json`, `phase-results.json`, and `viewer-results.json` contain current results. Representative screenshots include `1440-design.png`, `390-design.png`, `320-references.png`, and the corresponding Input, Inventory, Build, and expanded-disclosure images. Ordinary mode comparison screenshots use `*-ordinary-{type,scan,lucky,import}.png`.

## Human QA evidence and limits

`walkthrough.mp4` presents desktop then mobile with brief side text outside the app content. It includes Input, Inventory, Design, Build, the original IGES download, all four references, the actual opened Drawing popup, source/warning disclosures, and locked recovery. `walkthrough-scenes.json` indexes those scenes. `video-verification.json` records the final MP4 hash and extracted frame times.

This is local public-fixture evidence, not live production or customer-data QA. No production upload/conversion, private CAD, Sandbox dispatch, provider/auth/resource/env/billing changes, real users, enrollment, external messaging, manual deployment, merge, or cleanup. Vercel – portfolio and Vercel – portfolio-staging do not apply to ReversR and were not checked. Next gate: Captain review, then Vambah's Human QA. Keep the task, both PRs, branches, and worktree open.

### Encoded video verification

Final MP4: 312.32 seconds, 1000×1000 at 25 fps. Extracted 77 frames covering every named scene, ten-second intervals across the full timeline, and the final frame. Visually inspected all six timeline contact sheets plus full-resolution source/reference, expanded-warning, and final-state frames. Confirmed original IGES download, all four labeled references, actual opened Drawing and return, all disclosures, locked Build recovery, and explanatory side text without overlap. Samples are committed in `video-samples/`. The mobile opened-image view is the browser's fitted overview; the desktop popup shows the full drawing sheet at readable scale.

| Content | Desktop seconds | Mobile seconds |
| --- | ---: | ---: |
| source-download | 63.87 | 219.16 |
| reference-front | 72.52 | 227.72 |
| reference-left | 79.10 | 234.26 |
| reference-top | 85.69 | 240.79 |
| reference-drawing | 92.27 | 247.32 |
| opened-drawing | 100.38 | 255.37 |
| geometry-warnings | 111.48 | 266.39 |
| build-recovery | 139.26 | 294.06 |

Light-theme browser QA only; no native-device or live production smoke. No cost incurred.
