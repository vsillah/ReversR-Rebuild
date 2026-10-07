# Local browser-input diagnosis

Scope: isolated synthetic fixtures and documentation on `codex/commercial-browser-input-checker-repair`, starting at `9b4fc1505e55494cf257e38fccd9ffc1dcb5b2bd`. No product, auth, Convex, checker, dependency or configuration changes.

## Result

The integrated Browser reproduced focus loss with installed React Native Web nested ScrollViews and controlled TextInputs. A scrolled inner ScrollView with `keyboardDismissMode="on-drag"` blurred the focused input before the checker reached its full AX observation. The input nodes remained stable. The unchanged checker stopped at `FOCUSED_TARGET_UNSAFE` with zero fill dispatches.

Changing only the fixture's dismissal mode to `none` preserved focus and allowed exactly one fill, followed by boolean equality confirmation. This establishes a local RNW scroll-dismissal interaction. It does not prove the exact cause of either stopped production attempt, a production profile-save defect, or a browser-driver repair.

| Controlled RNW fixture variant | Result | Fills | Blur events | Nodes stable |
| --- | --- | ---: | ---: | --- |
| on-drag, both containers | FOCUSED_TARGET_UNSAFE | 0 | 1 | true |
| none, both containers | VALUE_CONFIRMED | 1 | 0 | true |
| on-drag, scheduled focus scrolling off | FOCUSED_TARGET_UNSAFE | 0 | 1 | true |
| on-drag, outer container only | VALUE_CONFIRMED | 1 | 0 | true |
| on-drag, inner container only | FOCUSED_TARGET_UNSAFE | 0 | 1 | true |

Amina and Captain independently observed these results. Focus was already absent before AX in failing cases and remained absent afterward. Parent `onFocusCapture` was supplied but its event counter remained zero in this installed RNW fixture. Thus duplicate capture handling was not demonstrated.

The schedule-off result matters: the reviewed rAF/260 ms focus handler is not necessary for the local failure. Browser locator auto-scrolling or another scroll during input targeting may also trigger RNW dismissal. Event observation does not identify the browser driver's internal cause.

## Source mechanism

Installed `node_modules/react-native-web/dist/exports/ScrollView/index.js`, `_handleScroll`, calls `dismissKeyboard()` whenever its dismissal mode is `on-drag`; that branch does not distinguish a programmatic scroll from a user drag. `node_modules/react-native-web/dist/modules/dismissKeyboard/index.js` calls `TextInputState.blurTextInput(TextInputState.currentlyFocusedField())`.

The local React fixture uses actual parent state rerenders and controlled input values. Its RNW variant uses installed ScrollView/TextInput components, nested containers, `keyboardShouldPersistTaps="handled"`, the reviewed focus-scroll scheduling pattern, and controlled values. It imports no commercial/auth code. Plain DOM, React and unscrolled RNW inputs passed. Explicit node replacement and deliberate blur correctly stopped the checker without filling. Generation-stamped unit fixtures remain models rather than claims about real semantic-locator handles.

Plain fixture reset removes old nodes before resetting counters, so prior-case blur is not attributed to a new case. React resets remount an isolated Fields component. Read-only diagnostics contain only fixed event names, numeric counts and booleans; input values never leave evaluation.

## Reproduce only in an authorized local session

From this worktree:

```sh
env -i PATH=/usr/local/bin:/usr/bin:/bin node qa/browser-input/build.mjs
env -i PATH=/usr/local/bin:/usr/bin:/bin node qa/browser-input/server.mjs 5194
```

The build uses already-installed esbuild, React, React DOM and RNW. Generated code stays ignored under `qa/browser-input/.generated/`. The server binds `127.0.0.1`, validates the Host header and method, and serves an explicit asset list. CSP blocks connections, forms, frames, images and remote scripts. Inline styles are permitted only to support React/RNW styling; the initial stricter style policy prevented the intended inline scroll layout, so those early layout observations were superseded by the rebuilt fixture.

Open the integrated Browser at `http://127.0.0.1:5194/rnw`. Differential URLs append `?dismiss=none`, `?schedule=off`, `?scope=outer`, or `?scope=inner`. `/` is plain DOM; `/react` is ordinary React. Use the visible mode selector for plain, scroll, controlled, replace and blur.

In the CUA REPL, import `qa/browser-input/diagnose.mjs` by absolute file URL and call `runFixtureCase(tab, 'controlled', 'name')` or field `'shop'`. Serialize only its `report`; retain its consumed `checker`. It captures boolean focus before/after silent full AX state and counts fill dispatches. Each case resets the disposable fixture, creates one checker, and never dispatches Save. A failed case does not authorize a retry against the same state. All identity/profile/rollback gates from the commercial qualification remain separate.

## Independent review and validation

Captain reported 12 responsive cases at widths 1280, 768 and 390: name and shop each stopped with zero fills under on-drag, and each passed with one fill under none. Captain visually inspected full screenshots at each width, found no horizontal overflow, and confirmed read-only dummy email and disabled Save. Captain reset the viewport and closed their tab. Evidence was recorded by Captain under `.local/browser-input-diagnosis/20261007/`; Amina did not inspect those private files.

Local validation:

```sh
env -i PATH=/usr/local/bin:/usr/bin:/bin node --test scripts/commercial-browser-input-checker.test.mjs qa/browser-input/server.test.mjs /tmp/reversr-commercial-qualification-f8a99e93/browser-ui-contract.test.mjs
env -i PATH=/usr/local/bin:/usr/bin:/bin node --check qa/browser-input/server.mjs
env -i PATH=/usr/local/bin:/usr/bin:/bin node --check qa/browser-input/diagnose.mjs
env -i PATH=/usr/local/bin:/usr/bin:/bin node qa/browser-input/build.mjs
git diff --check
```

32 tests pass: 25 unchanged checker tests, six unchanged browser-contract regressions and one loopback-server boundary test. Server testing uses only ephemeral loopback requests. No remote requests, credentials, provider calls or account creation were used.

## Remaining gate

No checker correction is warranted: weakening strict focus would permit a fill after demonstrated focus loss. A future separately authorized product repair could evaluate a web-only account ScrollView dismissal change while preserving current iOS/Android behavior. It needs actual account-route local UI testing, native regression review and normal source review before any later bounded production qualification.

Captain also identified SettingsModal, HistoryScreen, app/index and PhaseFour as matching source patterns. These are source-only leads, not rendered QA or authority to edit them. Session/auth, persistence, Save, production behavior and native keyboard behavior remain unqualified by this fixture. The fixture server must be stopped after review; no monitor or background runtime is required.
