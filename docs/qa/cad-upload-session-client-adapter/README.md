# CAD Upload Session Client Adapter QA

Source-only verification for the optional development upload-session adapter. The production app does not inject an issuer, and CAD upload admission remains disabled.

## Verified

- Rendered the real Import surface at 1440, 768, 390, and 320 pixels.
- Confirmed no session adapter or connect action appears on the default app path.
- Confirmed the upload action remains disabled at every viewport.
- Observed zero upload POSTs, zero file-body reads, no page errors, and no horizontal overflow.
- Exercised the strict cookie-only success contract, bounded timeout, cancellation, malformed response, unknown field, and no-retry paths in the focused tests.

## Commands

```sh
node --test scripts/cad-user-import-bridge.test.js
npm run typecheck
EXPO_OFFLINE=1 npm run web:export
node scripts/cad-upload-session-client-adapter-ui.js
```

The script writes `results.json`, four viewport screenshots, and `walkthrough.mp4` under the ignored local `.local/cad-convex/cad-upload-session-client-adapter-qa/` directory. No live issuer, upload, conversion, private CAD, environment change, or external store was used.
