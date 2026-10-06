# Hold-to-show password follow-up

2026-10-06. Same unpublished branch `codex/commercial-login-password-feedback`, following intact password-feedback commit `9e4628471866ff34943cb29a840218deccdd5bed`.

The Account password input now contains the existing Ionicons `eye-outline` / `eye-off-outline` control. It reveals only while held; a click never toggles persistent visibility. The control has a fixed 44×44 target, reserved 56px input right padding, theme contrast, accessible button name and hint, and a web tooltip. Empty input and pending auth disable it. The same TextInput remains mounted when visibility changes; feedback and login gating are preserved.

`useMomentaryPasswordReveal` owns component-local state and receives no password text. Masking occurs on release, cancel, eye blur, hover/pointer exit (including out-of-bounds captured pointer motion), outside release, lost pointer capture, window blur/page hide, document visibility changes, native AppState inactive/background, auth state changes, submit, clear and unmount. Native Pressable drives press-in/out; web pointer and keyboard handlers drive hold state with global capture listeners as release safeguards. No global reveal preference is saved.

The pinned react-native-web implementation was inspected: Pressable maps onPressOut to PressResponder onPressEnd; PressResponder listens on document for keyup and may synthesize activation/deactivation after a delayed press. Web reveal therefore does not depend on onPressIn or onPressOut alone. Repeated keydown cannot restart a canceled reveal. Native secure-entry caret behavior still requires device QA, although the input is never deliberately remounted.

## Validation

Passed commands (each prefixed by `env -i PATH=/usr/local/bin:/usr/bin:/bin`):

```sh
node node_modules/typescript/bin/tsc --noEmit --pretty false
node node_modules/vitest/vitest.mjs run --config commercial-backend/vitest.config.ts
node scripts/commercial-credit-gate-smoke.js
node --test scripts/cad-user-upload-route.test.js scripts/commercial-convex-transport.test.js scripts/inventory-api-harness.test.js
node scripts/commercial-convex-codegen.js --check
```

65 automated tests pass: existing 62 plus three reveal lifecycle/event-listener/native-AppState tests. TypeScript and offline commercial SDK codegen pass. Runtime/backend/CAD source directories are unchanged. The previous non-failing Vitest future-loader warning remains.

The opt-in source harness is `http://127.0.0.1:5179/?reveal-checks=1`. Click **Run local reveal event checks**, then **Run reveal hook lifecycle checks** while signed out. The first runs explicit local DOM events against the actual rendered CommercialLogin and reports 19 checks: mouse/touch hold and release/cancel/outside-motion/capture-loss/blur/visibility cases, Space/Enter hold-release, empty/clear/eye-blur, stable mounted input and reserved target space. The second mounts the real hook and verifies empty, busy, auth changes, submit-reset and unmount. Both passed. The previous password-feedback CUA regression passed again; an actual CUA click on the reveal control ended masked. None of these tests submits auth.

The harness uses generated disposable input and reports only state labels. No revealed text is printed, recorded or saved. Screenshot `/tmp/reversr-password-reveal-export.gaXTN8/masked-eye-mock.jpg` was captured with an empty field. Mock auth, native bridges and placeholder icons remain in this harness, so the screenshot is layout evidence rather than icon or deployed-auth proof.

CUA exposes completed clicks/key presses, not a sustained physical pointer-down. The checked-in source event harness supplies reproducible event-level coverage without DOM mutation through CUA evaluate. Native physical gestures, actual background transitions, assistive-technology behavior and caret preservation require Human QA. Captain's actual Expo inspection and physical sustained-hold Human QA remain next.

## Fresh actual Expo export

Export succeeded with a cleared cache, isolated initially empty HOME/EXPO_HOME, and only the authorized public tuple:

```sh
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp/reversr-password-reveal-export.gaXTN8/home EXPO_HOME=/tmp/reversr-password-reveal-export.gaXTN8/home EXPO_OFFLINE=1 EXPO_NO_DOTENV=1 EXPO_NO_TELEMETRY=1 CI=1 EXPO_PUBLIC_COMMERCIAL_BACKEND=convex EXPO_PUBLIC_COMMERCIAL_CONVEX_URL=https://hip-elephant-705.convex.cloud EXPO_PUBLIC_COMMERCIAL_CONVEX_ISSUER=https://hip-elephant-705.convex.site EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:5183 node node_modules/expo/bin/cli export --platform web --clear --output-dir /tmp/reversr-password-reveal-export.gaXTN8/output
```

Export: `/tmp/reversr-password-reveal-export.gaXTN8/output`.
Log: `/tmp/reversr-password-reveal-export.gaXTN8/export.log`.

Captain should serve this new export separately for actual `/account` review at 320/390/768/1440 widths. Existing user tabs/servers at 5181 and 5182 were not touched or reloaded. No viewport override was set. No real or synthetic auth submission, credential access, backend change, provider/payment call, push, PR, merge, deployment or activation occurred. Keep the visible lane open through Human QA.

## Tooltip correction after Captain inspection

Captain found that RN-web filtered the original Pressable `title`. A web-only native HTML `span` now supplies the inherited `title="Hold to show password"`. Its `display: contents` adds no layout box or keyboard target. The native branch is a fragment; the same eye Pressable, input, handlers and lifecycle guards remain intact.

A fresh local mock-component render confirmed the nearest title-bearing ancestor's exact text and the unchanged 44×44 eye bounds. The checked-in rendered regression now asserts that title as well as geometry; all 19 event cases, real-hook lifecycle checks and the five focused reveal/feedback unit tests passed again. TypeScript passed. No auth action was submitted, and no existing 5181/5182/5183 page, server, form input or viewport was touched.

The fresh `--clear` offline Expo export passed at `/tmp/reversr-password-tooltip-export.CcVDHh/output`; log: `/tmp/reversr-password-tooltip-export.CcVDHh/export.log`. It used the exact export command above with the directory prefix replaced by `/tmp/reversr-password-tooltip-export.CcVDHh`, including a new empty `home`, the same public deployment tuple and API base `http://127.0.0.1:5183`. This supersedes the earlier reveal export for Captain's next packaged-route tooltip check. Captain retains control of restarting its review server. This correction does not change the physical-hold/device QA limitations above.
