# CAD phase progression review

Qualified fixture review now opens in Design. Input and Inventory are complete and can be revisited without resetting the fixture. Design stays active while viewing earlier phases. Build remains locked; selecting it explains the missing manufacturing prerequisites and offers a return to Design or Inventory.

Phase names stay Input, Inventory, Design, Build across input modes. The model represents complete, active, locked, and skipped explicitly. No CAD phase is skipped for these fixtures. `cadPhase=input|inventory|design|build` preserves the fixture query and other URL state; absent/invalid phase defaults to Design. Browser back/forward and reload retain the selected phase. Opening Build never grants access to outputs.

## Review route and evidence

- Local: `http://127.0.0.1:5196/?cadPreview=mark-dispenser-v1`
- Exact Build recovery route: `http://127.0.0.1:5196/?cadPreview=mark-dispenser-v1&cadPhase=build`
- `walkthrough.mp4`: paced desktop then mobile, showing all phases, orientation controls, references, and Build recovery. Cropped desktop to the real 600px content lane; mobile padded without scaling. Source is actual browser video.
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
