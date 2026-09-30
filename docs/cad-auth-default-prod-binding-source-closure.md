# CAD Auth default production execution-binding source closure

Roadmap: 5/6 complete. This source-only gate closes the latest Step 6
blocker without opening production upload admission.

The stopped live-opening attempt proved the deployed production default path
still resolved `createCadProductionExecutionBinding()` to `{ enabled: false }`
because no source-owned default installation could be derived. This packet adds
a default-source closure helper that production can call through the existing
resolver. Its checked-in gate is disabled, so production remains fail-closed.

The proof fixture shows that the same default path resolves non-null only when
an exact source-owned gate supplies:

- reviewed current-deployment metadata
- exact command-card SHA-256
- exact installation SHA-256
- bounded session reference
- durable evidence digest
- durable adapter method surface
- one-session and one-attempt fence controls
- independent expiry, rollback-first, and post-rollback smoke controls

This gate does not authorize runtime activation, upload sessions, request-body
admission or reads, conversion, Sandbox dispatch, private CAD, external
messages, retries, second live runs, real-user commercialization, or commercial
readiness.

Validation:

```bash
node scripts/cad-auth-default-prod-binding-source-closure-checker.js
node --test scripts/cad-auth-default-prod-binding-source-closure.test.js scripts/cad-auth-runtime-install-current-binding.test.js scripts/cad-auth-runtime-install-enable.test.js
```

Next gate after merge, production deployment, and fail-closed smoke is the
post-merge deployment rebind refresh named in the JSON packet.
