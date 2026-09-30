# CAD Auth live-opening gate and credential-precondition closure

Roadmap: 5/6 complete. Step 6 remains the final live-opening gate.

This source-only packet closes the current Step 6 executability gap without
opening production upload admission. It adds a disabled-by-default server-owned
closure path that can resolve the reviewed executable live-opening gate only
when two conditions are both true:

- allowlisted current-production deployment metadata matches the reviewed
  deployment, main commit, command-card SHA-256, installation SHA-256, bounded
  session ref, and durable evidence digest;
- a private one-time credential supply is present only as a digest-bound control
  record with a private supply receipt, never as a raw credential value in
  public source.

The default production import path remains fail-closed. With no private supply,
the closure returns no session service, a disabled executable runtime, no upload
session issuance, no request-body admission, no runtime activation, and no
effects. With an exact digest-bound private supply proof, the source path can
resolve a non-null executable binding and a server-owned session lookup that
accepts only the approved credential digest. The bearer credential preimage
remains private and must be supplied under a later private credential-supply
approval before any live request can reach the runtime gate.

The checked-in packet does not read private evidence, read secrets, change
provider or environment settings, issue upload sessions, activate production
upload, read request bodies, run conversion, dispatch Sandbox work, use private
CAD, collect live evidence, issue an executable command card for live execution,
send external messages, retry live work, run a second live run, enroll real
users, or claim commercial readiness.

Validation:

```bash
node scripts/cad-auth-live-gate-credential-closure-checker.js
node --test scripts/cad-auth-live-gate-credential-closure.test.js
node --test scripts/cad-user-upload-route.test.js scripts/cad-auth-live-opening-execution-architecture-closure.test.js scripts/cad-auth-default-prod-binding-source-closure.test.js
```

The next gate after public review, merge, production deployment, and
fail-closed smoke is a post-merge deployment rebind refresh. It must verify the
deployed server-owned default path can still resolve the exact live-opening gate
and digest-bound session credential precondition from current production
metadata while default production remains fail-closed. Only then can it return a
later live-opening approval phrase.
