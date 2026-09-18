# Synthetic session-handshake QA

Base: `57ae466c980d2782cd2deabb3f06d908737158d2` (PR #311).

This slice adds test support only. `utils/cadUserImportBridge.js` and the Import
panel's `uploadSessionAdapter` prop are canonical and unchanged. The superseded
`utils/cadUploadSessionAdapter.*` implementation is absent.

`createSyntheticSessionHandshake` calls the canonical adapter with a local,
in-memory issuer. Cases cover success, revoked (`USER_SESSION_REQUIRED`), issuer
failure, malformed response, cancellation, and timeout. The last two deliberately
ignore abort until manually settled, proving late success cannot change the result.
A fixed public dummy CSRF string matches the canonical tests; no credentials are
created, stored, or sent. Revocation here is a simulated error, not a live store test.

Every result keeps `canSubmit: false`; `CAD_USER_IMPORT_ENABLED` stays false.
The default application injects no issuer. The fixture lives outside `app` with a
`.fixture` extension. Its cancel control belongs to the test harness, not shipped UI.
No adapter, component, bridge, provider, resource, environment, or server changes.

## Run locally

```sh
node --test scripts/cad-upload-session-browser.test.js scripts/cad-user-import-bridge.test.js
node --test scripts/cad-user-upload-route.test.js scripts/cad-user-upload-admission.test.js scripts/cad-upload-session.test.js scripts/cad-upload-session-store.test.js scripts/cad-dev-upload-session-qualification-bridge.test.js
npm run typecheck
node scripts/cad-upload-session-browser-smoke.js
git diff --check
```

The rendered QA command requires existing local dependencies, Playwright Chromium,
and FFmpeg. It refuses to overwrite an existing temporary route, creates that route
only during local export/typecheck, removes it in `finally`, then serves the export
on an ephemeral loopback port. It closes the browser and server on completion.
Never deploy the QA export. No env file or provider setting is modified.

## Evidence and limits

- 18 harness/canonical tests and 41 server/session regression tests passed.
- Typecheck, local Expo export, and diff whitespace checks passed.
- Real home → Import route and actual `CadImportPanel` in the temporary harness:
  1440×1000, 768×1000, 375×1000. No document overflow or browser page errors.
- File picker, invalid format, local metadata, clearing, service-error disclosure,
  disabled upload, success, revoked/error, malformed, cancel, timeout, and enabled
  recovery action states exercised. Live issuer counts remain one after each result
  and after waiting beyond timeout; explicit second calls are tested separately.
- File/FileReader body-access guards, request guards, and counters observed zero
  file-body reads, upload POSTs, conversion requests, or writes at every width.
  One external asset request per viewport was blocked. API status reads were mocked.
- Synthetic text labeled for metadata selection is not parsed as CAD. No CAD body
  is accepted or forwarded by the application.
- Evidence: `/private/tmp/cad-canonical-session-qa/results.json`, PNGs, and
  `1440-walkthrough.mp4`, `768-walkthrough.mp4`, `375-walkthrough.mp4`.
- Integrated Browser initialization remains blocked by the configured symlinked
  writable root; local Playwright supplies the rendered evidence.

No live workflow/customer-data smoke or production/deployment verification.
No live Convex/Auth, store, upload, conversion/Sandbox, private CAD, enrollment,
billing, secret, or external-delivery work. Portfolio Vercel contexts are not
applicable and were not checked. Captain review and human QA remain; this lane
stops at draft PR, with branch and worktree retained.
