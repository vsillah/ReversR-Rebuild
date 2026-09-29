# CAD Auth durable adapter candidate and unresolved binding rejection

Roadmap: 5/6 complete. This is Step 6 source preparation, not live-opening completion.

The offline module exports `createDurableAdapterCandidate`. It matches the executable runtime's method names but every operation throws a fixed rejection. It takes no drivers, credentials, callbacks or enable switch. Nothing imports it into production. It implements no durable storage and establishes no durability qualification.

`binding.schema.json` defines the exact JSON input shape for later non-secret source review: existing bounded-session reference and ID, evidence SHA-256, immutable production deployment reference, and provenance repeating those bindings alongside the approved source commit, two stopped task IDs, stop disposition digest, and approved non-secret source-record digest. Unknown keys, missing fields, placeholder session names, malformed digests, deployment drift and mismatched provenance are rejected. Input is JSON bytes, never a path or live object. Results contain fixed status and authority fields; input values are never echoed or persisted.

Schema validity cannot prove that evidence exists, a session is designated, provenance is authentic, or the deployment is current. Even structurally valid inputs reject runtime installation. The checked-in packet keeps `suppliedBinding: null`; synthetic unit data stays exclusively in tests. The supplied deployment is a historical approval anchor, not a fresh live verification. A changed production deployment requires a separately reviewed rebind; this gate never substitutes a new target.

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

> Approve source-only supply and review of the exact existing bounded-session ID, durable-evidence SHA-256, immutable deployment binding, and non-secret provenance for cad-auth-durable-adapter-rejection-prep; no session issuance, private evidence reads, runtime installation, activation, or live command-card issuance.

After that approval, provide the captain with the path to an already approved, non-secret binding JSON matching the schema. The record must contain the existing designated session ID and evidence digest plus their provenance; do not issue a new session or retrieve private evidence to fill gaps. Review its source authority and current deployment binding separately. Confirm a sanitized source-review result before proposing any later gate. This phrase authorizes only source input supply/review and is not a runtime-install completion phrase. No live commands are issued here.
