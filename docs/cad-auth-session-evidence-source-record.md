# CAD Auth session/evidence source record

Roadmap: 5/6 complete. This is Step 6 source-only resolution for the bounded-session/evidence reference blocker. It does not open upload admission or install runtime bindings.

The prior stop packet proved the public source did not already contain an accepted non-secret source record. This packet prepares that record from existing public source-only inputs and the PR #448 production deployment metadata:

- exact session ID: `rrb-ref:cad-upload-internal-mark-test-session-v1`
- bounded session ref: `rrb-ref:cad-upload-internal-mark-test-session-v1`
- durable evidence SHA-256: the public-source-only digest already bound in the executable command-card rebind packet
- current production deployment reference: `dpl_6eaK35wwsNHmW837vCQdRmgvrDZx`
- production target: `https://reversr-mvvpn13wr-vsillahs-projects.vercel.app`
- fail-closed smoke: `401 USER_SESSION_REQUIRED` observed at `2026-09-29T20:51:56Z`

## Boundary

This record is accepted only for later source-only schema rebind review. It does not qualify the live durable service, does not create a production execution binding, does not install runtime behavior, and does not issue a command card.

The old rejection-prep schema still pins an earlier deployment. This packet does not rewrite that historical schema. Instead, it records the proposed current deployment and source-record SHA-256 for a later bounded schema-rebind gate.

## Validation

```bash
node --test scripts/cad-auth-session-evidence-source-record.test.js scripts/cad-auth-bounded-session-evidence-ref-prep.test.js scripts/cad-auth-durable-adapter-rejection-prep.test.js
node scripts/cad-auth-session-evidence-source-record-checker.js
node scripts/cad-auth-bounded-session-evidence-ref-prep-checker.js
node scripts/cad-auth-durable-adapter-rejection-prep-checker.js
git diff --check
```

All checks are source-only. The checker reads a fixed tracked-source allowlist and rejects source drift, runtime authority, schema substitution, private-marker leakage, and live qualification claims.
