# CAD Auth durable adapter candidate and unresolved binding rejection

Roadmap: 5/6 complete. This is Step 6 source preparation, not live-opening completion.

The offline module exports `createDurableAdapterCandidate`. It matches the executable runtime's method names but every operation throws a fixed rejection. It takes no drivers, credentials, callbacks or enable switch. Nothing imports it into production. It implements no durable storage and establishes no durability qualification.

`binding.schema.json` defines the exact JSON input shape for later non-secret source review: existing bounded-session reference and ID, evidence SHA-256, immutable production deployment reference, and provenance repeating those bindings alongside the approved source commit, two stopped task IDs, stop disposition digest, and approved non-secret source-record digest. Unknown keys, missing fields, placeholder session names, malformed digests, deployment drift and mismatched provenance are rejected. Input is JSON bytes, never a path or live object. Results contain fixed status and authority fields; input values are never echoed or persisted.

Schema validity cannot prove that evidence exists, a session is designated, provenance is authentic, or the deployment is current. Even structurally valid inputs reject runtime installation. The checked-in packet keeps `suppliedBinding: null`; synthetic unit data stays exclusively in tests. The schema is now rebound to the approved non-secret source record and PR #449 production verification, but this still does not install runtime behavior, qualify a live durable service, or create a production execution binding.

All prior restrictions remain: no provider, env, resource or billing changes; no secrets, private evidence reads, session issuance, upload activation, body admission/read, conversion, Sandbox dispatch, private CAD, live evidence collection, runtime activation, executable live command cards, external messages, retry, second run or commercialization. Failing checks or smoke, unknown outcome, stale target, leakage risk or credential/configuration requirements stop the lane.

Local validation (Node built-ins only):

```
node --test scripts/cad-auth-durable-adapter-rejection-prep.test.js
node scripts/cad-auth-durable-adapter-rejection-prep-checker.js
node scripts/cad-auth-production-binding-source-install-checker.js
```

The checker reads only its fixed public-source allowlist and verifies exact manifest equality plus source digests. `--write` regenerates only this source manifest. It never reads external binding files, credentials, runtime config or private evidence.

## Later supply approval

Exact phrase:

> Approve source-only runtime-install completion preparation from the schema-rebound non-secret bounded-session/evidence source record; no session issuance, private evidence reads, runtime activation, upload admission, or executable live command-card issuance.

After that approval, prepare only a source-owned runtime-install completion packet using the schema-rebound source record. Do not issue a new session, retrieve private evidence, install runtime behavior, activate upload admission, or issue a live command card. Confirm a sanitized source-review result before proposing any later live-opening gate. No live commands are issued here.
