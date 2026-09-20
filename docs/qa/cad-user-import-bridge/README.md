# CAD local preparation bridge

Source-only, fail-closed UI slice from main `9eb8c442706d2a3c8bd1dfd7f6b33ee5a04dbbc9`.
Branch: `codex/amina-cad-dev-import-bridge`.
Worktree: `/Users/vambahsillah/.codex/worktrees/8206/ReversR-Rebuild`.

## Scope and contract

The existing Import panel distinguishes local metadata preparation, no connected upload session, unavailable development session integration, and disabled admission. It preserves the existing qualified public-fixture Design workflow. Selection retains format and size only; clearing/replacing is local recovery. The upload CTA stays disabled with no handler, credentials, body builder, or POST transport. Error projection accepts only known schema-v1 error codes; unknown and purported success responses remain closed. No success contract is added.

The mounted server remains unchanged. It has no wired browser issuer/adapter and keeps `BODY_ADMISSION_AUTHORIZED = false`. This change does not resolve those integration prerequisites. The client source constant is a disabled-state projection, not an activation switch or server authorization.

## Review route and evidence

Serve the local export with `python3 -m http.server 5198 --bind 127.0.0.1 --directory dist`.
Open `http://127.0.0.1:5198`, enter ReversR, and choose Import. Select a public/synthetic CAD file, replace or clear it, expand Import access & service status, and inspect the disabled CTA and recovery explanation.

- `walkthrough.mp4`: actual 390px browser recording plus concise side text; 19.72 seconds, 750×1000. Final encoded frames inspected at four-second intervals, with desktop/mobile screenshots inspected separately.
- `walkthrough-source.webm`: raw browser recording; `side-text.png`: annotation source.
- Width-prefixed PNGs: 1440, 768, 390, and 320px preparation, invalid-file, recovery, and service-status states.
- `results.json`: every width reports zero upload POSTs, zero file-body reads, no page errors or horizontal overflow.
- `shared-review-results.json`: prior PR #307 checks on this export, including all four CAD phases, source download, four references, disclosures, and ordinary Type/Scan/Sample/Import modes.

Browser checks block external requests. Service-status recovery uses an explicitly labeled disabled-service fixture; unit tests use fixed error fixtures. No browser session or upload success is simulated. Metadata-only synthetic input is not a valid CAD conversion fixture and is never submitted.

## Validation

- `node --test scripts/cad-user-import-bridge.test.js scripts/cad-user-upload-route.test.js scripts/cad-internal-tester-preview.test.js` — 19 passed.
- `npm run typecheck` — passed.
- `npm run accessibility:preflight` — passed.
- `EXPO_OFFLINE=1 npm run web:export` — passed with local copied dependencies.
- `node scripts/cad-user-import-bridge-ui.js` — passed at all four widths; records and encodes the walkthrough.
- `NODE_PATH="$PWD/node_modules" node /private/tmp/cad-bridge-shared-review.js` — passed. This is the existing `scripts/cad-review-polish-smoke.js` with only local port changed from 5196 to 5198 and evidence output redirected to `/private/tmp/cad-bridge-shared-review`.
- `git diff --check` — passed.

Integrated Browser and the image viewer failed to initialize because the session's configured ReversR writable root is a symlink. Local Playwright and direct screenshot reads provided visual evidence. No live workflow, production, native-device, or customer-data smoke was performed. No upload, conversion, Sandbox dispatch, secrets, external sends, auth/env/provider/resource/billing changes, or store mutation. Expenses: USD 0.

## Handoff gate

Draft PR only. Captain review and human QA are next; no ready marking, merge, deployment, production smoke, or cleanup is authorized here. Real browser session wiring and any success contract need a separate scoped decision. Unrelated copied untracked files remain excluded. Vercel Portfolio contexts are not applicable and were not checked.
