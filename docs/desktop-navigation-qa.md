# Desktop workspace navigation QA

Source-only desktop web navigation replaces the mobile bottom bar at >=1024px on ordinary Home, Projects, and reconstruction surfaces. The compact in-flow top bar retains Home, Projects, centered New Reconstruction, Tour, and More. Active buttons expose pressed state. Desktop content no longer reserves mobile bottom-bar space. Projects now renders the existing settings modal so More can complete its action.

The shared desktop breakpoint continues to exclude iOS, Android, and native-embedded CAD preview. The dedicated desktop CAD preview keeps its existing header and viewer/rail layout. No upload/conversion, private CAD, provider, environment, billing, enrollment, or messaging activation is included.

## Validation

Commands from the assigned worktree:

```sh
npm run typecheck
node --test scripts/desktop-shell-layout.test.js
npm run web:export
python3 -m http.server 5205 --directory dist
DESKTOP_SHELL_URL=http://127.0.0.1:5205 DESKTOP_SHELL_EVIDENCE=.local/desktop-navigation node scripts/desktop-shell-generalization-smoke.js
CAD_DESKTOP_URL=http://127.0.0.1:5205 CAD_DESKTOP_EVIDENCE=.local/desktop-navigation/cad node scripts/cad-desktop-workspace-smoke.js
git diff --check
ffmpeg -v error -i .local/desktop-navigation/desktop-navigation-walkthrough.mp4 -f null -
```

Five breakpoint/platform tests pass. Browser smoke passes at 320x740, 390x844, 768x1024, 1024x768, 1366x768, and 1440x900. Coverage includes navigation visibility, all desktop actions, Home/Projects active states, settings opened from Home and Projects, account/return, Describe/Scan/Sample/locked Import, resize draft retention including 1023/1024, invalid preview denial, and compact native-embedded preview. CAD checks cover public-fixture viewer/rail fit, zoom, orientation, source switching, and locked readiness.

All browser contexts block non-local traffic and writes; zero write attempts and zero page errors were recorded. External account reads were blocked. No live workflow/customer-data smoke or device runtime test was run. Native behavior is covered by platform-hook tests and browser embedded-preview checks, not physical-device evidence.

Visual inspection covered all six Home widths, desktop input, dark theme, and 1024px CAD design. At 320px, the Home hero title uses a compact width-specific size so the headline avoids mid-word wrapping while preserving the existing mobile bottom navigation.

## Evidence and review

Evidence is local and ignored by Git under `.local/desktop-navigation/`:

- `results.json`: six-width ordinary navigation results.
- `cad/results.json`: six-width CAD regression results.
- `<width>x<height>-<surface>.png`: actual route screenshots.
- `1366x768-dark.png`: desktop dark theme.
- `desktop-navigation-walkthrough.mp4`: paced 1366x768 H.264 walkthrough, 37.24 seconds, 931 frames, decode-checked.
- `record-walkthrough.cjs`: local-only capture script.

Review URL: http://127.0.0.1:5205 . Enter ReversR, then exercise the top navigation. Resize below 1024px for the original bottom bar. CAD route: `/?cadPreview=mark-dispenser-v1&cadPhase=design`. Embedded route: `/?cadPreview=mark-dispenser-v1&qa=native-internal-upload-render&cadPhase=input`.

Integrated browser control could not start because the session's configured writable root contains a symlink. The app browser-open request was queued; automated evidence used local Playwright. Captain human QA, merge, deployment, and cleanup remain pending. No production deployment verification was performed. Portfolio Vercel contexts are not applicable to this repository.
