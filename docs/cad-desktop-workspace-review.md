# Desktop CAD workspace review

Scope: presentation only. The existing accepted CAD preview route uses the full browser width at 1024px and above. Native embedded preview and narrower screens keep the existing shell. Production upload, conversion, sessions and admission gates are unchanged.

Design review gives the model the remaining width beside a 300px independently scrollable source/reference/details rail. Change source stays in the title row; readiness remains accessible at the top of the rail. Desktop hides the bottom navigation and guest-credit upsell. Input uses a compact source chooser with the existing sample/local-preview actions. No new transport or CAD dispatch is introduced.

## Local review

- Worktree: `/Users/vambahsillah/.codex/worktrees/f772/ReversR-Rebuild`
- Branch: `codex/cad-desktop-workspace`
- Static preview: `http://localhost:5199/?cadPreview=mark-dispenser-v1&cadPhase=design`
- Build: `npm run web:export`
- Serve: `python3 -m http.server 5199 --directory dist`
- Screenshots, JSON measurements, MP4: `.local/cad-desktop-workspace/` (ignored, local evidence)

At 1366x768 the viewer is 994x472; at 1440x900 it is 1068x604. Both fit below the phase rail with controls inside the frame. Narrow-screen review captured at 390x844 and 320x740, plus tablet at 768x1024.

## Validation

- `npm run typecheck`
- `npm run web:export`
- `git diff --check`
- `node --test scripts/cad-internal-tester-preview.test.js scripts/cad-user-import-bridge.test.js scripts/cad-viewer-presentation.test.js scripts/cad-local-iges-preview.test.js scripts/cad-native-internal-preview-entry.test.js scripts/cad-user-upload-route.test.js` — 31 passing.
- `CAD_DESKTOP_URL=http://localhost:5199 node scripts/cad-desktop-workspace-smoke.js` — five viewport sizes; model loading, viewer/puck bounds, source selection, zoom/orientation, locked Build, no horizontal overflow, zero writes or page errors.
- `CAD_PHASE_URL='http://localhost:5199/?cadPreview=mark-dispenser-v1' node scripts/cad-phase-progression-smoke.js` — all four widths, history/reload, phase navigation, downloads and reference links.
- `CAD_PUCK_URL='http://localhost:5199/?cadPreview=mark-dispenser-v1' node scripts/cad-orientation-puck-smoke.js` — all views, rotation, zoom, keyboard, touch pinch, control bounds; simulated production preview stayed closed.
- Additional browser check: normal root, invalid preview, and native-embedded preview retain the 600px shell; resizing 1366→390→1440 restores the appropriate layout.

## Remaining review

Captain/human QA should inspect the desktop rail scroll, source return, orientation and zoom on Windows Edge/Chrome. Automated Chromium ran on macOS; this is not Windows or installed-native-device proof. No private CAD, live workflow/customer data, uploads, Sandbox runs, production deployment or merge were performed. Neither Vercel context was checked; this task stops at a draft PR. The Metro development preview failed to load the 3D model locally; the exported static build passed, and is the review surface.
