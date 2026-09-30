# CAD Auth live-opening execution architecture closure

Roadmap: 5/6 complete. Step 6 remains the final live-opening gate.

This source-only packet closes the execution architecture gap that stopped the
latest bounded internal production upload-admission opening. The stopped live
attempt proved that another live-opening phrase is not enough while the deployed
server default path resolves to a disabled/null production execution binding.

The implementation adds a default-closed server-owned architecture source that is
wired into the production execution binding resolver and the user-import session
service selection. Production defaults remain closed, but the deployed path can
now resolve a non-null executable binding only when a reviewed source gate
contains exact current deployment metadata, command-card SHA-256, installation
SHA-256, durable evidence digest, bounded session ref, and a digest-bound session
credential precondition.

No credential value is represented in the packet. The session precondition is a
digest-only server-owned lookup path. It does not issue sessions, read secrets,
change provider/runtime settings, activate upload admission, read request bodies,
run conversion, dispatch Sandbox work, use private CAD, send external messages,
retry live work, run a second live run, enroll real users, or claim commercial
readiness.

Validation:

```bash
node scripts/cad-auth-live-opening-execution-architecture-closure-checker.js
node --test scripts/cad-auth-live-opening-execution-architecture-closure.test.js
NODE_PATH=<existing-project-node_modules> node --test scripts/cad-user-upload-route.test.js
NODE_PATH=<existing-project-node_modules> node --test scripts/cad-upload-session-gateway-service.test.js
```

The next gate after public review, merge, production deployment, and fail-closed
smoke is a post-merge deployment rebind refresh. It must recompute the current
deployment binding, durable evidence digest, exact bounded session binding,
executable command-card SHA-256, installation SHA-256, and a fresh UTC opening
window. It may return a later live-opening approval phrase only if the deployed
default path resolves a non-null executable binding and digest-bound session
credential precondition from reviewed source without runtime activation.
