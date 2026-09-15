// Source binding for one bounded development Auth/session qualification run.
// Disabled by default; a later reviewed source rebind must install a run key digest
// and UTC window before any live development run can start.
export const cadDevAuthQualificationBinding = {
  enabled: false,
  mode: 'cad-dev-auth-session-disabled-post-run-closeout',
  target: {
    teamSlug: 'vambah-sillah',
    projectName: 'reversr-cad-auth-dev',
    deploymentName: 'majestic-alligator-31',
    kind: 'development',
    cloudUrl: 'https://majestic-alligator-31.convex.cloud',
    siteUrl: 'https://majestic-alligator-31.convex.site',
    appOrigin: 'http://localhost:5001',
  },
  cohort: [
    'cad-test-alpha-20260915@auth-test.invalid',
    'cad-test-beta-20260915@auth-test.invalid',
  ],
  run: {
    runId: null as string | null,
    runKeySha256: null as string | null,
    acceptedProjectionSha256: null as string | null,
    acceptanceReceiptSha256: null as string | null,
    windowStartMs: null as number | null,
    windowEndMs: null as number | null,
    maxProvisionedIdentities: 2,
    maxLiveOperations: 20,
    retainUsersAndAccounts: true,
    deleteUsersOrAccounts: false,
  },
} as const;
