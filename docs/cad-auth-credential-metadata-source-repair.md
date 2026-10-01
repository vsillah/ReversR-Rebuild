# CAD Auth credential metadata-source repair

Roadmap: 5/6 complete. Step 6 remains the final live-opening gate.

This source-only repair closes the current-deployment metadata blocker without
opening production upload admission. The deployed server-owned default path can
now derive a non-null executable gate from reviewed, non-secret current
production metadata even when Vercel does not expose a `dpl_*` deployment id to
runtime source.

The accepted source-owned deployment reference is deterministic:

```text
vercel-target:<current-production-host>@<gitCommitSha>
```

For this gate, the reviewed source proof binds:

- main commit `56a29e337ceb459c66f83d7f5207b7ba74f65686`;
- production target `https://reversr-a261m8i6x-vsillahs-projects.vercel.app`;
- GitHub production deployment id `6772517435` as provenance only;
- fail-closed smoke `401 USER_SESSION_REQUIRED` observed no later than
  `2026-09-30T23:39:21Z`;
- credential-closure binding repair packet
  `57675e09d0bd717a4ce6e372e4f49a3c9c494b4dabb29194c3a973a9405584e8`;
- live-gate credential closure packet
  `4697784dec93175221fcdf2e885155d1ccda2b724e368ff2bb9855b9dc5603e1`;
- production binding source-install packet
  `e9721f15e834393e5663a5e8a260e7425d792c8800327ccc7909316f823e1515`.

The repair deliberately rejects these as runtime deployment-reference inputs:

- numeric GitHub deployment ids;
- aliases such as `https://reversr.vercel.app`;
- request, body, private, or caller-provided metadata;
- malformed commit, repository, owner, ref, environment, or target values.

The private digest-bound session credential precondition remains closed. Public
source may carry only the credential digest, supply reference, and receipt
requirement. It must not embed or disclose the credential value. The checked-in
packet does not issue upload sessions, activate production upload admission,
read request bodies, run conversion, dispatch Sandbox work, use private CAD,
collect live evidence, activate runtime installation, issue an executable
command card for live execution, send external messages, retry live work, run a
second live run, enroll real users, or claim commercial readiness.

Validation:

```bash
node scripts/cad-auth-credential-metadata-source-repair-checker.js
node --test scripts/cad-auth-credential-metadata-source-repair.test.js
node scripts/cad-auth-credential-closure-binding-repair-checker.js
node scripts/cad-auth-live-gate-credential-closure-checker.js
node --test scripts/cad-auth-credential-closure-binding-repair.test.js scripts/cad-auth-live-gate-credential-closure.test.js
```

The next gate after public review, merge, production deployment, and
fail-closed smoke is a source-only/no-live post-merge deployment rebind refresh.
It must verify the deployed default source path can still derive the executable
gate from current production metadata without runtime activation before
returning a later live-opening approval phrase.
