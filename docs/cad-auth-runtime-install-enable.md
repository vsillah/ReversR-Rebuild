# CAD Auth Production Runtime Installation Enablement

Roadmap status: 5/6 complete. Step 6 remains closed until a later explicit
live-opening gate after merge, deployment binding and fail-closed smoke.

## What Changed

- The reviewed production runtime installation source now binds the exact
  stopped live-opening disposition, approved refresh digest, production
  deployment reference, executable command-card SHA-256 and installation
  SHA-256 from the stopped live-opening run.
- The default exported installation remains disabled and resolves to `null`.
- An explicit source-owned approved gate can resolve a non-null production
  execution binding only when the command-card bytes, command-card SHA-256,
  installation SHA-256, deployment reference, bounded session ref, durable
  evidence digest and durable adapter interface all match the reviewed source.
- The checker records a sanitized source-only packet with opaque refs, digests,
  statuses and source bindings only.

## Closed Controls

This gate does not authorize provider, environment, resource or billing changes;
secret reads; private evidence reads; upload-session issuance; production upload
activation; request-body admission or reads beyond fail-closed smoke;
conversion; Sandbox dispatch; private CAD use; live evidence collection;
runtime activation; executable command-card issuance for live execution;
external messages; retries; second live runs; real-user commercialization; or
commercial-readiness claims.

## Next Gate

After this source-only enablement merges and production redeploys, the deployment
binding must be refreshed against the new production deployment. Only then can a
later approval phrase authorize a bounded internal opening using the exact
post-merge deployment, command-card SHA-256, installation SHA-256, durable
evidence digest, bounded session ref and fresh UTC window.
