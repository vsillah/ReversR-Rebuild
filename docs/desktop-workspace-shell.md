# Desktop workspace shell review

The root app shell now uses the browser width at 1024px and above, regardless of whether a CAD preview is selected. Below that breakpoint it retains the existing 600px maximum. Native platforms and the installed-app embedded CAD preview keep the compact shell.

`useDesktopWorkspace` owns the presentation breakpoint. The CAD hook composes it with the existing preview/route gates and retains the same viewer-height calculation. Ordinary workflow phase navigation adopts the compact desktop spacing. Home, Projects, New, Tour and More remain available through existing navigation until a deliberate desktop navigation replacement is designed. CAD's approved desktop chrome, wide viewer, 300px review rail, and source chooser remain unchanged.

Account and policy components retain their own reading-width limits inside the larger shell. The account heading can now wrap beside Refresh; visual review found that its previously unconstrained text could push Refresh off-screen on narrow phones.

## Source changes

- `app/_layout.tsx`: shared desktop shell sizing.
- `app/index.tsx`: general desktop phase-rail spacing; retain ordinary navigation and CAD-only chrome rules.
- `app/account.tsx`: constrain heading copy so its title wraps beside Refresh.
- `hooks/useDesktopWorkspace.ts`: shared web-only presentation breakpoint and embedded-preview exception.
- `hooks/useCadDesktopWorkspace.ts`: compose shared layout with existing CAD admission/route checks.
- `scripts/desktop-shell-layout.test.js`: breakpoint, platform, server-rendering and capability-separation regressions.
- `scripts/desktop-shell-generalization-smoke.js`: browser route/navigation/resize and element-bounds coverage.
- `scripts/cad-native-internal-preview-entry.test.js`: align its source assertion with the shared desktop variable.

## Local review

- Worktree: `/Users/vambahsillah/.codex/worktrees/2898/ReversR-Rebuild`
- Branch: `codex/desktop-shell-generalization`
- Base: `a74584d6f6fc43a20158dd0e75049999145564ff` (main when the lane began).
- Ordinary app: `http://127.0.0.1:5203/?qa=desktop-shell-generalization`
- CAD review: `http://127.0.0.1:5203/?cadPreview=mark-dispenser-v1&cadPhase=design`
- Serve the static export with SPA fallback for `/account`. The local review server is `.local/desktop-shell/serve.cjs`; it returns 503 for `/api/*` and serves no live API.
- Evidence: `.local/desktop-shell/` (ignored local artifacts), including viewport screenshots, `results.json`, `smoke.log`, `tests.log`, `build.log`, and `desktop-shell-walkthrough.mp4`.
- CAD evidence: `.local/desktop-shell/cad/`, including screenshots, `results.json`, and `1366x768-walkthrough.mp4`.
- Walkthrough source/timing: `.local/desktop-shell/record.cjs` and `.local/desktop-shell/review-video/scenes.json`.

## Validation

```sh
npm run typecheck
npm run web:export
node --test scripts/desktop-shell-layout.test.js scripts/cad-internal-tester-preview.test.js scripts/cad-user-import-bridge.test.js scripts/cad-viewer-presentation.test.js scripts/cad-local-iges-preview.test.js scripts/cad-native-internal-preview-entry.test.js scripts/cad-user-upload-route.test.js
node scripts/desktop-shell-generalization-smoke.js
CAD_DESKTOP_URL=http://127.0.0.1:5203 CAD_DESKTOP_EVIDENCE=.local/desktop-shell/cad node scripts/cad-desktop-workspace-smoke.js
git diff --check
```

Typecheck and web export pass; 36 focused tests pass. Shell smoke covers 1366x768, 1440x900, 1024x768, 768x1024, 390x844 and 320x740: Home, Describe, locked Import, empty History, Account, browser return, invalid CAD query and the native-embedded input route. It also resizes a mounted input through 1023, 1024, 390 and 1440px while preserving its synthetic draft. Heading and Refresh bounds are checked directly, beyond document overflow checks.

CAD smoke covers 1366x768, 1440x900, 768x1024, 390x844 and 320x740: model loading, zoom/fit, orientation control containment, front/reset views, source return, public sample selection, details and locked Build. Desktop viewer measurements match the previous layout: 994x472 at 1366x768 and 1068x604 at 1440x900. Tests block external requests and non-GET/HEAD requests; no writes or page errors were observed.

## Remaining review and boundaries

Captain review and human QA are next. Screenshots were visually inspected at desktop, tablet and phone sizes. The integrated Browser preview was opened through the Codex app; its automation and the image viewer were blocked by the session's symlinked writable-root configuration, so local Playwright screenshots and recordings provide the visual evidence.

This is macOS Chromium evidence, not Windows Edge/Chrome or installed-device proof. Native platform selection is covered by focused tests, while the actual installed app still needs device QA. Empty History was exercised; populated reconstruction review queues and live reconstruction/provider workflows were not. Profile save, billing/checkout, scan submission and enrollment were not performed. No live CAD conversion, private CAD, upload, Sandbox dispatch, provider/environment/resource changes or production deployment were performed. This task ends at draft PR handoff, without merge or cleanup.

No migration or environment change is required. Portfolio's two Vercel contexts are not applicable to this repository and were not checked.
