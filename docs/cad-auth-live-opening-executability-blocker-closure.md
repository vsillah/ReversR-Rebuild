# CAD Auth live-opening executability blocker closure

Roadmap: 5/6 complete. Step 6 remains the final live-opening gate.

This source-only packet closes the two executability blockers from the stopped
live-opening attempt without activating production upload admission:

- the default production execution-binding source path can resolve a non-null
  source-owned binding only when exact reviewed current-deployment metadata,
  command-card SHA-256, installation SHA-256, bounded session ref, durable
  evidence digest, and durable adapter surface are all supplied;
- the user-import route can reach the executable runtime gate only after a
  server-owned upload-session verifier accepts an exact bounded-session
  credential record.

The checked-in production defaults remain closed. This packet does not issue an
upload session, expose a credential, read a request body, activate runtime
behavior, change provider or environment settings, dispatch conversion or
Sandbox work, use private CAD, send external messages, retry live work, run a
second live run, commercialize real users, or claim commercial readiness.

The session credential precondition is source-owned and value-free. It requires
`server/uploadSession.js#createUploadSessionVerifier`, a server-owned
`lookupSession` source, digest-only credential lookup, exact bounded session
binding, active CAD-upload authorization, and stop-on-missing-or-unverified
behavior. Raw tokens, secrets, provider runtime values, private paths, and
credential values are not represented in the public packet.

Validation:

```bash
node scripts/cad-auth-live-opening-executability-blocker-closure-checker.js
node --test scripts/cad-auth-live-opening-executability-blocker-closure.test.js scripts/cad-auth-default-prod-binding-source-closure.test.js scripts/cad-auth-runtime-install-current-binding.test.js scripts/cad-auth-runtime-install-enable.test.js scripts/cad-user-upload-route.test.js
```

Next gate after public review, merge, production deployment, and fail-closed
smoke is the post-merge deployment rebind refresh named in the JSON packet. It
must recompute current deployment binding, durable evidence digest, exact
bounded session binding, executable command-card SHA-256, installation SHA-256,
and a fresh UTC opening window before any later live-opening approval phrase is
valid.
