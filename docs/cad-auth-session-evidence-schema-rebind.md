# CAD Auth bounded-session/evidence schema rebind

Roadmap: 5/6 complete. This is still Step 6 source-only resolution, not a live opening.

This packet rebinds the durable-adapter rejection-prep binding schema to the approved non-secret session/evidence source record from PR #449. The schema now accepts only the reviewed bounded session ref, exact session ID, durable evidence SHA-256, current production deployment binding, PR #449 merge commit, and source-record digest. The reviewed binding shape is valid for later source-only runtime-install preparation, but it still grants no authenticity, no durable-service live qualification, no production execution binding, and no runtime installation.

Closed controls remain unchanged: `liveDurableServiceQualified` is false, `productionExecutionBinding` is null, runtime installation and activation are closed, and upload admission is closed. The only request-body read authorized in this lane was the already completed empty fail-closed smoke after PR #449 deployment.

Local validation:

```
node --test scripts/cad-auth-session-evidence-schema-rebind.test.js scripts/cad-auth-durable-adapter-rejection-prep.test.js
node scripts/cad-auth-session-evidence-schema-rebind-checker.js
node scripts/cad-auth-durable-adapter-rejection-prep-checker.js
git diff --check
```

No private evidence, secrets, provider configuration, upload sessions, production upload activation, conversion, Sandbox dispatch, private CAD, live evidence collection, runtime activation, executable live command cards, external messages, live retry, second live run, commercialization, or commercial-readiness claim are included.
