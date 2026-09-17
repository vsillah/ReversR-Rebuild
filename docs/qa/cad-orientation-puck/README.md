# CAD orientation puck review

Source-only follow-up to approved PR #302 / 62108bc5a47ecad7126315c91eb81918277d5f99.

Branch: `codex/cad-orientation-puck`
Worktree: `/Users/vambahsillah/.codex/worktrees/03e9/ReversR-Rebuild`
Exact local route: `http://localhost:5187/?cadPreview=mark-dispenser-v1`
Click **Review qualified result** to open the existing authorized public dispenser fixture.

## Changes

Low-profile in-viewport orientation trigger with current-view symbol and a continuous click-wheel surface. Six evenly spaced, arrow-only hit regions have no visible button outlines; hover titles and accessible names identify every direction. A single center surface resets to fitted isometric view. The wheel opens only on demand and dismisses after inactivity, outside interaction, or Escape; compact zoom buttons remain in the viewport. Viewports narrower than 360px use a 132px wheel and temporarily fit the model down-left while the wheel is open, preventing overlap without changing the user's stored zoom.

Neutral slate CAD canvas with a subtle shadow-only floor for isometric/custom views. Fixed views hide the floor and show a small screen-aligned grid cue. Approved IGES-axis mappings, camera projection, model normalization, and fitting formula are unchanged. The inherited camera remains perspective even for axis-aligned standard views; this slice does not introduce a new orthographic projection.

## Validation

- `npm run typecheck` — passed.
- `node --test scripts/cad-internal-tester-preview.test.js` — 10 passed.
- `npm run web:export` — passed.
- `node scripts/cad-orientation-puck-smoke.js` — passed at 1440 × 1000, 390 × 1000, 320 × 1000, and 855 × 904.
- `git diff --check` — passed.

Browser checks cover every standard view, active state, floor/grid visibility, reset after rotation/zoom, mouse drag/wheel, single-finger touch rotation and two-finger pinch through Chromium touch events, responsive wheel geometry and camera clearance, keyboard expansion/Escape, 44px view targets, compact-height bottom-navigation clearance, and horizontal overflow. Source assets and preview host protections retain their focused tests. External requests were aborted (one attempted per viewport); local API responses were synthetic unavailable responses. No upload or conversion occurred.

Visual inspection caught and corrected low label contrast, an unnecessarily wide puck, and residual model contact at 320px. Screenshots and the final MP4 show actual exported-route rendering. The video combines a centered crop of desktop capture with mobile capture; no model imagery is replaced. Full per-view screenshots and source recordings remain in `/private/tmp/cad-puck-qa-responsive-offset`.

## Artifacts and limits

- `walkthrough.mp4` — about 15 seconds, desktop then mobile.
- `desktop-isometric.png` — collapsed state and full-model fit.
- `mobile-front.png` — expanded puck, independent zoom, grid cue.

The integrated browser automation failed to initialize because the configured writable root `/Users/vambahsillah/Documents/ReversR` is a symlink. The exact route was queued via Codex's browser panel tool; QA used local Playwright Chromium. No physical-device or Safari validation was performed. No private CAD, new conversion, live backend validation, gate changes, push, PR, merge, deployment, external messages, or cleanup.

Next: Integration Captain review and Human QA of these artifacts. Deployment and publishing remain outside this lane's authorization.
