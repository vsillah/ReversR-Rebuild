# CAD phase progression review

Qualified fixture review now opens in Design. Input and Inventory are complete and can be revisited without resetting the fixture. Design stays active while viewing earlier phases. Build remains locked; selecting it explains the missing manufacturing prerequisites and offers a return to Design or Inventory.

Phase names stay Input, Inventory, Design, Build across input modes. The model represents complete, active, locked, and skipped explicitly. No CAD phase is skipped for these fixtures. `cadPhase=input|inventory|design|build` preserves the fixture query and other URL state; absent/invalid phase defaults to Design. Browser back/forward and reload retain the selected phase. Opening Build never grants access to outputs.

## Review route and evidence

- Local: `http://127.0.0.1:5196/?cadPreview=mark-dispenser-v1`
- Exact Build recovery route: `http://127.0.0.1:5196/?cadPreview=mark-dispenser-v1&cadPhase=build`
- `walkthrough.mp4`: replacement source-complete review at 1440px desktop then 390px mobile. The 600px desktop app lane is framed in a 640px-wide video; mobile is padded without shrinking text. Each supplied reference has a six-second hold; source download has eight seconds; Inventory and Build prerequisites have ten seconds each. Actual Drawing popup video is inserted between opening the reference and returning to the app. The desktop popup crop retains the complete drawing sheet and removes surrounding blank space. No product code changes.
- `walkthrough-scenes.json`: source and final-video timestamps for every review scene.
- New screenshots include `*-source-download.png`, `*-reference-{front,left,top,drawing}.png`, `*-opened-drawing.png`, source acquisition/Inventory, geometry warnings, and both Build recovery paths.
- Screenshots: `{1440,768,390,320}-{design,input,inventory,build}.png`, plus desktop/mobile expanded viewer screenshots.
- `phase-results.json`, `viewer-results.json`: machine-readable checks.

## Validation

Passed:

```sh
node --test scripts/workflow-phases.test.js scripts/cad-internal-tester-preview.test.js scripts/cad-viewer-presentation.test.js
npm run typecheck
npm run accessibility:preflight
EXPO_OFFLINE=1 npm run web:export
CAD_PHASE_EVIDENCE=/private/tmp/cad-phase-final node scripts/cad-phase-progression-smoke.js
CAD_PUCK_URL='http://127.0.0.1:5196/?cadPreview=mark-dispenser-v1' CAD_PUCK_EVIDENCE=/private/tmp/cad-phase-viewer-final node scripts/cad-orientation-puck-smoke.js
node scripts/cad-phase-walkthrough.js
git diff --check
```

16 focused tests. Browser phase and viewer suites at 1440, 768, 390, and 320 × 1000; additional viewer clearance check at 855 × 904. Checked all phase rail controls, Input-to-Design action, generated inventory/source navigation, locked Build and both recovery paths, disabled upload/output actions, service-status failure and retry, source download, all four reference links, history, reload, synthetic cube, and invalid phase fallback. Browser suites block all external requests; phase suite observed zero write requests. No browser page errors or horizontal overflow.

Preserved PR #304 viewer implementation unchanged: neutral material, view-aligned grid, orientation controls, no persistent unscaled-grid warning. Pixel checks cover all six fixed views, model fit/contrast, grid visibility, color stability, and reset; interaction checks cover zoom, rotation, touch pinch, keyboard expand/Escape, and no auto-rotation. Production hostname was simulated entirely from local files: fixture absent and upload disabled. This is not a live production smoke.

Visual review caught and fixed the model being pushed below metadata and an 855 × 904 bottom-navigation collision. The final model leads the Design view, and the selected phase's hint follows navigation while completion/active states remain stable.

## Limits and next gate

Public Dispenser.IGS and synthetic cube only. No new CAD upload/conversion, private CAD, provider/auth/env/resource/billing changes, Sandbox dispatch, production data writes, real users, or external messages. No manual deployment or merge. Build approval and manufacturing output generation remain unavailable in this fixture preview. No live workflow/customer-data smoke or native-device QA was run.

Integrated Browser automation could not initialize because this session's Documents/ReversR writable root is a symlink. The Codex Browser-open request was queued; visual inspection used the local Playwright screenshots and MP4 frames. The local build initially had no routes with symlinked dependencies; copying installed dependencies into this isolated worktree fixed route resolution. Neither workaround changes repository runtime configuration.

Next: Integration Captain review of the draft PR and human QA of the attached MP4/exact fixture route. Keep this branch, worktree, and task open. Vercel – portfolio and Vercel – portfolio-staging are not applicable to this ReversR repository and were not checked.

## PR #305 replacement walkthrough validation

Re-recorded from merge commit `b7fae4dd6b5e45e037dfda655801c382c27e1ba4` on `codex/cad-phase-source-walkthrough`. Runtime components remain unchanged.

Fresh checks:

```sh
node --test scripts/workflow-phases.test.js scripts/cad-internal-tester-preview.test.js scripts/cad-viewer-presentation.test.js
npm run typecheck
npm run accessibility:preflight
EXPO_OFFLINE=1 npm run web:export
python3 -m http.server 5196 --bind 127.0.0.1 --directory dist
CAD_PHASE_EVIDENCE=/private/tmp/cad-phase-source-smoke node scripts/cad-phase-progression-smoke.js
CAD_PUCK_URL='http://127.0.0.1:5196/?cadPreview=mark-dispenser-v1' CAD_PUCK_EVIDENCE=/private/tmp/cad-source-viewer node scripts/cad-orientation-puck-smoke.js
node scripts/cad-phase-walkthrough.js
git diff --check
```

All 16 focused tests, typecheck, accessibility preflight, offline export, phase regression at 1440/768/390/320, and viewer regression at those widths plus 855×904 passed. Fresh phase/viewer result JSON replaces prior evidence. The inherited phase suite also checks its synthetic cube fallback; the replacement walkthrough uses only the authorized public dispenser fixture. All browser contexts block nonlocal requests; the recorder blocks API calls and non-GET requests. Download confirms the public `Dispenser.IGS` filename. Existing regression verifies all four reference links, navigation history, and locked recovery.

Integrated Browser initialization was attempted on the exact route but failed before navigation because the configured Documents/ReversR writable root is a symlink. Local Playwright browser capture and direct screenshot/video-frame inspection provide the visual evidence. Local shell commands required escalation solely to work around that sandbox initialization error. No permissions, environment configuration, credentials, or product behavior were changed.

### Final encoded MP4 review

`walkthrough.mp4` is 266.80 seconds (4:26.80), 640×1000, 25 fps. Ran `node scripts/cad-phase-walkthrough-frames.js`: extracted 66 frames consisting of all named scenes, ten-second intervals across the entire timeline, and the final frame. Inspected five full-timeline contact sheets and full-resolution targeted encoded frames; representative samples are committed under `video-samples/`. The video hash and complete sampling index are in `video-verification.json`.

Confirmed in the encoded MP4 on both desktop and mobile:

| Content | Desktop seconds | Mobile seconds |
| --- | ---: | ---: |
| Original IGES download control | 48.76 | 181.35 |
| Front reference | 57.43 | 189.91 |
| Left reference | 64.02 | 196.44 |
| Top reference | 70.60 | 202.97 |
| Drawing reference | 77.18 | 209.50 |
| Opened Drawing in actual browser popup | 85.29 | 217.56 |

Each reference hold lasts six seconds, and the source download hold lasts eight seconds. The popup is visibly followed by the app reference grid. Desktop opened Drawing shows the full sheet at readable scale; the mobile browser's native image-fit view is an overview, with the full desktop sheet available earlier in the same video. Inventory metadata/confidence warning, geometry warnings, locked output control, both recovery controls, and final Design-active state were also visually confirmed. Brief real loading transitions are retained; they are followed by loaded model views.

The compact framing pass used the original browser-recorded segments; the saved recorder now applies this same framing directly. No product files changed. No ready/merge/deployment/cleanup performed. Next gate: Integration Captain review and Human QA of this replacement evidence.
