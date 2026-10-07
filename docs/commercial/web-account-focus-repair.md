# Web account focus repair — local source review

Branch: `codex/commercial-web-account-focus-repair`. Base: `4d4b498fc6d99bec5561f068b5d2489a6c1d02c1`.

## Source change

Only `app/account.tsx` changes in product source: the AccountScreen ScrollView uses `keyboardDismissMode="none"` on web. iOS retains `interactive`; Android retains `on-drag`. `keyboardShouldPersistTaps="handled"`, focus scheduling, keyboard insets, authentication, Save and other routes remain unchanged.

This addresses the locally reproduced RNW scroll-dismissal interaction. It does not establish the exact cause of either stopped production attempt. The strict checker still requires focus before filling and stops on uncertainty.

## Actual source fixture

`qa/browser-input/account-fixture.jsx` renders the actual imported AccountScreen. The build aliases React Native to installed RNW and substitutes commercial/auth/theme provider hooks, CommercialLogin and icons before their production implementations can be loaded. The real focus visibility helper, Android inset hook, theme constants and credit formatting remain included. An explicit source allowlist rejects other project modules; build tests assert the actual import graph excludes providers/auth/Convex/configuration.

The signed-in status is a literal stub. Synthetic A/B reset buttons remount baseline profiles; they do not model sessions or prove isolation. Free/5 credits is a static fixture snapshot. Billing is disabled. Save and refresh use React memory only, with counters; no backend persistence is modeled. Icons are placeholders. Upgrade plans are omitted. No production auth, login, credentials, environment loading, remote mocks or provider configuration is used.

The before route bundles the exact AccountScreen from the base commit using `git show` in build memory, without reverting or checking out any files. Both routes use identical fixture dependencies and geometry. The baseline exists only in ignored generated QA output.

```sh
env -i PATH=/usr/local/bin:/usr/bin:/bin node qa/browser-input/build-account.mjs
env -i PATH=/usr/local/bin:/usr/bin:/bin node qa/browser-input/server.mjs 5194
```

Repaired: `http://127.0.0.1:5194/account`. Before: `http://127.0.0.1:5194/account-before`.

The server binds loopback, rejects non-GET/foreign Host requests and exposes only enumerated fixture assets. CSP blocks connections, remote scripts, forms, frames and images. Generated bundles and screenshots remain ignored under `.generated/`.

## Validation

```sh
env -i PATH=/usr/local/bin:/usr/bin:/bin node --test scripts/commercial-browser-input-checker.test.mjs qa/browser-input/server.test.mjs qa/browser-input/account-platform.test.mjs qa/browser-input/account-build.test.mjs
env -i PATH=/usr/local/bin:/usr/bin:/bin node --check qa/browser-input/account-diagnose.mjs
git diff --check
```

35 tests pass. TypeScript AST inspection locates the real ScrollView JSX attributes and evaluates web/iOS/Android dismissal expressions; a whole-source comparison requires every other AccountScreen byte to match the base. Source guards require the checker, checker tests, focus helper and keyboard-inset hook to match the base exactly. Native validation is source-only, not device UI testing.

Unchanged SHA-256:

- Checker: `90a0fb2949ab3d431bddab43d3fcf8cb565cda6eb717a1528226f1f0977fe130`
- Checker tests: `4cc5781473b2af5f3f9cb13a99744dc86df726ad895ffcc620046a5ab5d27f0c`

Amina's integrated Browser checks: 12 repaired-route cases passed, covering A/B name/shop at 1280, 768 and 390px. Every case returned `VALUE_CONFIRMED` with exactly one fill. Desktop local Save and Refresh counters incremented once and retained both edited fields. Read-only email and Free/5 credits were visible; desktop and mobile document overflow checks passed. Screenshots at all three widths were visually inspected. Fixture-only contrast was corrected for the placeholder login text/icon. No product layout change was made.

Captain independently completed 24 actual-component before/after cases at 1280, 768 and 390px, with both A/B profiles and both name/shop fields at each width. All 12 base-source cases stopped at `FOCUSED_TARGET_UNSAFE` with zero fills; all 12 repaired-source cases returned `VALUE_CONFIRMED` with one fill and strict focus. The geometry and offline dependency substitutions were the same. Every consumed checker rejected reuse with `ATTEMPT_ALREADY_CONSUMED`. The matrix performed zero saves. Field horizontal-fit, no-overflow, readonly email, no-password and Free/5-credit checks passed.

This establishes an actual-component local before/after repair beyond the earlier copied RNW fixture. It still does not identify the exact production failure cause.

Captain reported 41 passing focused tests: the 35 above plus six existing browser-contract regressions at `/tmp/reversr-commercial-qualification-f8a99e93/browser-ui-contract.test.mjs`. Captain also reported clean-environment `tsc --noEmit` passing with exit 0. These expanded checks are Captain-reported; Amina did not read private qualification artifacts.

Captain's final visual review passed at 1280, 768 and 390px: no overlap or horizontal overflow; readonly email and Free/5 credits visible; manual mobile scrolling exposed Save fully. At each width, actual AccountScreen name/shop edits followed by Save (count 1) and Refresh (count 1) retained both fields. Save showed its notice and Refresh cleared it. These are actual UI handlers calling memory stubs, not backend/session qualification. Captain approved the scoped local commit after this review.

## Human QA approval — 2026-10-07

Vambah explicitly approved: "Okay, Human QA approved" (relayed by Captain). The reviewed head was `821b92b746f74c723d4f637810953ddaebdf72a6` on `codex/commercial-web-account-focus-repair`, at `http://127.0.0.1:5194/account`.

This accepts local synthetic typing and the actual AccountScreen Save/Refresh handlers operating against in-memory fixture stubs. It does not qualify live sessions, real persistence, account isolation, billing or native device UI. Approval authorizes this local documentation record only; it does not authorize publishing, push, PR, deployment or live/provider execution. Product source and the strict checker remain byte-identical to the reviewed head.

## Cumulative bundle review

Reviewed all 24 changed files against local main reference `f8a99e93e1c9e195bbee62fc3e0c09871a491a8a`: one product file with the single web-only prop change, three reports, 18 fixture/support files and two checker files. Manual source review plus a credential-pattern/non-example-email/artifact-path scan found no unexpected files or private values. Only static synthetic identities and example email addresses occur in fixture data; local paths and commit hashes document provenance. No generated bundles, screenshots, logs, PID files, environment files or private qualification artifacts are tracked in this bundle. The scan is a bounded review, not a guarantee against every possible secret format.

Complete repository-relative manifest:

```text
app/account.tsx
docs/commercial/browser-input-checker-repair.md
docs/commercial/browser-input-local-diagnosis.md
docs/commercial/web-account-focus-repair.md
qa/browser-input/.gitignore
qa/browser-input/account-before.html
qa/browser-input/account-build.test.mjs
qa/browser-input/account-diagnose.mjs
qa/browser-input/account-fixture.jsx
qa/browser-input/account-platform.test.mjs
qa/browser-input/account-stubs.jsx
qa/browser-input/account.html
qa/browser-input/build-account.mjs
qa/browser-input/build.mjs
qa/browser-input/diagnose.mjs
qa/browser-input/fixture.js
qa/browser-input/index.html
qa/browser-input/react-fixture.jsx
qa/browser-input/react.html
qa/browser-input/server.mjs
qa/browser-input/server.test.mjs
qa/browser-input/style.css
scripts/commercial-browser-input-checker.mjs
scripts/commercial-browser-input-checker.test.mjs
```

## Boundaries and next gate

This scope contains no push, PR, deployment, production/provider requests, private qualification-file reads, credentials, live accounts, CAD or payment work. Settings, History, Workflow and PhaseFour remain untouched. Real authentication, persistence, account isolation, billing and native keyboard behavior are unqualified. Local Human QA is complete. The fixture is retained as a detached loopback-only process; its PID is recorded in ignored `qa/browser-input/.generated/account-server.pid` and the lane closeout. Stop it with `kill <recorded PID>` after confirming that PID still identifies this fixture server. Any later integration or live qualification requires its own authorization. The development lane remains open.
