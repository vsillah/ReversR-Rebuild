# CAD provider setup checklist and approval gates (historical alternative)

> **SUPERSEDED DEFAULT — 2026-09-12.** Convex is now the preferred CAD authority
> store. Start with [Convex-first design](cad-convex-store-design.md) and
> [current review/setup gates](cad-convex-store-review.md). The PostgreSQL /
> Supabase recommendation, SQL, checkboxes and approval phrases below are
> retained as historical alternative material only. They are not the active
> setup path. Supabase dev project `jydipbkofvvpvaylxwbb` is superseded and
> must not be mutated or reused under this lane. No cleanup is authorized.

**FUTURE / UNEXECUTED.** Companion to the
[decision packet](cad-provider-decision-packet.md), reviewed 2026-09-12.
Every checkbox is pending. Console labels below follow public documentation where
linked; recheck the selected tenant's UI before any action. This is not an executable
runbook until all placeholders and the relevant gate are approved.

## Future console sequence

1. [ ] Complete the decision record with the captain. Name isolated development
   destinations and owners. Obtain gate R before submitting any create form or paid
   subscription. If no provider passes the revocation contract, stop at selection.
2. [ ] In the [Supabase dashboard](https://supabase.com/dashboard), select the approved
   organization, choose New project, and enter the approved development name and
   region. Review plan/project charges, store the generated database password directly
   in the approved vault, and submit only under gate R. Record the sanitized project
   reference, region, actual PostgreSQL version and plan. Success: the isolated project
   is ready and matches the approved destination; no production project was selected.
3. [ ] In project Data API settings, verify `cad_auth` is not exposed; disable Data API
   if unused. In Database Settings, review TLS enforcement and approved Network
   Restrictions. Avoid adding broad CIDRs to work around unknown server egress.
   In the top-level Connect dialog, select the reviewed runtime pooler and migration
   connection method. Keep credentials out of screenshots and chat. Success: a
   reviewed endpoint/role plan, with no application environment configured yet.
   [API security](https://supabase.com/docs/guides/api/securing-your-api),
   [network settings](https://supabase.com/docs/guides/platform/network-restrictions),
   [Connect dialog](https://supabase.com/docs/guides/database/connecting-to-postgres).
4. [ ] If **Supabase OIDC** was selected under R: Authentication → OAuth Server →
   enable; configure the approved authorization path and Authentication → URL
   Configuration → exact development Site URL. Review asymmetric signing for ID
   tokens, then register only the approved client/redirects. Leave dynamic registration
   disabled. The authorization UI must be separately implemented before flow testing;
   configuring a path does not create it. Success: sanitized issuer, client identifier,
   callback and signing-algorithm record; no login or upload readiness claim.
   [Official setup](https://supabase.com/docs/guides/auth/oauth-server/getting-started).
5. [ ] If **Auth0** was selected under R: select the approved development tenant →
   Applications → Applications → Create Application → Regular Web Applications.
   In Settings configure exact allowed callback and logout URLs and approved origins.
   Confirm required Enterprise session API entitlement before credentials or tests;
   no subscription upgrade is implicit. Success: sanitized issuer/client record and
   a reviewed session-liveness method; eventual deletion remains a design gate.
   [Official registration](https://auth0.com/docs/get-started/auth0-overview/create-applications/regular-web-apps).
   For another existing tenant, first replace this step with its current official
   console instructions. Do not invent its settings or assume tenant access.
6. [ ] Under M, promote the design into a reviewed migration/adapter PR. The proposal
   SQL is not the migration. Inspect CLI version/help before scaffolding migrations;
   implement restricted roles/functions and the two-client conformance harness.
   Execute only the named migration/checksum on the approved disposable database.
   Success: migration receipt, allowed/denied role tests, race/timeout/recovery tests
   and unchanged disabled-route behavior. No modification of provider-owned tables.
7. [ ] Under E, open the approved **development-only** server secret store/environment
   editor. Set exactly the reviewed variable names from the implementation manifest;
   current design names remain proposals. Enter values directly, never in chat or
   frontend/public variables. Confirm environment scope before saving. Success:
   sanitized completeness/TLS/origin checks and versioned rollback instructions.
8. [ ] Under W, exercise synthetic login/callback/logout/issuance on the named local
   dev server. A hosted preview needs separate D authorization. Test wrong-session,
   revoked/expired, CSRF, denied membership, provider outage and unknown commit.
   Success: exact commit and synthetic receipts; user CAD uploads remain disabled.
9. [ ] Before A, captain reviews exact deployment, provider/store conformance, recovery,
   dispatch-time recheck, parser/Sandbox qualification, quotas and rollback. Activation
   and every CAD conversion/private-input run have separate approval boundaries.

At each step return only commit, migration checksum, redacted resource identifiers,
pass/fail counts and sanitized evidence locations. Never send database URLs, tokens,
provider profiles or screenshots containing secrets.

## Exact future approval phrases

These are templates, not approvals. The captain must replace **every** angle-bracket
field with reviewed concrete values before requesting approval. An unresolved field,
unknown cost or failed validation keeps the gate closed. Approval of one gate does
not grant another. Generic “proceed” does not fill omitted destinations or scope.

**R — isolated resource creation and initial console settings**

> Approve creation of isolated synthetic CAD auth/store resources for decision packet commit <SHA>: Supabase organization <org>, development project <name>, region <region>, plan <plan>, and OIDC provider <vendor>, tenant <tenant>, client <name>, owned by <owner>. Approve only checklist console settings <exact settings and callback URLs>, with <beta decision>, total recurring budget <USD including tax/extras> and enforcement/stop procedure <procedure>. No production resources, application env changes, migration execution, deployment, CAD uploads, conversion or private data.

**M — migration and adapter implementation plus bounded synthetic execution**

> Approve CAD auth/store migration and adapter implementation on branch <branch> in worktree <path>, based on <SHA>, and synthetic execution only on disposable database <project/database>. Before execution, review migration <identifier/checksum> and exact role/function scope <manifest>. No production access, provider-owned schema mutation, dev env configuration, issuer mounting, deployment, CAD input or conversion. Keep uploads disabled.

The checksum is supplied after implementation review and before execution; if it is
not yet known, approve implementation only and return for the execution phrase with
the checksum filled. No placeholder authorizes running new SQL.

**E — development environment configuration**

> Approve development-only server configuration for commit <SHA> in <exact host/project/environment>, setting only <variable-name manifest> from approved secret store <store> for isolated resources <IDs>. Approve access by <roles> and rollback <procedure>. No public/frontend secrets, production env changes, deployment, issuer activation, CAD upload or conversion.

**W — issuer wiring and synthetic verification**

> Approve wiring and synthetic local verification of login, logout and CAD-session issuance/revocation routes for commit <SHA> at <local dev origin>, bound to <issuer/client/database>, using <synthetic identities> and <approved session policy>. Approve no CAD file input, conversion, hosted deployment, production changes or user-upload activation. Keep POST /api/cad/user-import disabled.

**D — separate deployment or production configuration**

> Approve <deploy or configure, specify each authorized action> for reviewed commit <SHA>, PR <number>, destination <exact project/environment>, variable manifest <names or none>, resources <IDs>, rollback <procedure>. User-upload activation remains disabled; no CAD input or conversion, private data, new resources or unrelated env changes.

**A — user-upload activation**

> Approve user-facing CAD Import activation at commit <SHA>, deployment <ID>, environment <destination>, for cohort <users/shops>, after conformance receipts <IDs>. Approve limits <bytes/types/quota/concurrency>, enforceable budget <cap>, admission checks <manifest>, Sandbox controls <manifest>, rollback owner/procedure <details> and expiry <time>. This approves the activation change only; no CAD file submission or conversion run, no private CAD, no unrelated deployment/configuration or resources.

A requires approved D and verified production-equivalent behavior. If the proposed
activation automatically dispatches a test, present C as well before executing it.

**C — one bounded CAD conversion; private input is explicit**

> Approve exactly one CAD conversion at commit <SHA>, deployment/environment <ID>, for input <public fixture ID or explicitly private approved artifact ID/hash>, using worker <image digest>, <vCPU>, <memory MiB>, <timeout>, <input/output caps>, <network policy>, enforceable total cost <USD cap>, output destination <private location>, retention/cleanup <policy>, and sanitized evidence only. No retry, other files, public upload/storage, deployment, UI exposure or further activation. Private-data processing is authorized only for the explicitly named private artifact and destination.

An earlier public-cube or private-pilot approval is not reusable authority. If private
input cannot be named safely, use its approved opaque registry identifier and keep
its path/content out of the review packet.

## Documentation-slice validation receipt

Validation on 2026-09-12: installed locked dependencies with
`npm ci --ignore-scripts --no-audit --no-fund --cache /private/tmp/rrb-cad-provider-npm-cache`.
The first run lacked Express; after installation the sandbox blocked loopback listen.
Rerunning with local loopback permission passed **32/32** existing tests:

```sh
node --test scripts/cad-provider-store-contract.test.js scripts/cad-upload-session-store.test.js scripts/cad-upload-session.test.js scripts/cad-user-upload-route.test.js
```

This includes disabled-route no-body-read/no-conversion assertions. `git diff --check`
and local Markdown target checks passed. Only these two documentation files changed;
no runtime, SQL or dependency manifest changes. No new tests were necessary.
No SQL, provider login, database durability,
failover, console setup, production route, browser upload or CAD conversion has
been tested in this slice. Offline contract tests cannot establish those guarantees.
