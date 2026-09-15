// Source binding for one bounded development Auth/session qualification run.
// Disabled by default; a later reviewed source rebind must install a run key digest
// and UTC window before any live development run can start.
export const cadDevAuthQualificationBinding = {
  enabled: true,
  mode: 'cad-dev-auth-session-immediate-rebind-1925z',
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
    runId: 'cad-dev-auth-session-qualification-1925z' as string | null,
    runKeySha256: 'b471ba4b7632d9f454dbcd0234598e47b59147481b06e7807c356f8c8d081ef9' as string | null,
    acceptedProjectionSha256: '66df783b8d32d30689ae604496b83d27667fc88829298d79cf9df1713b579f8e' as string | null,
    acceptanceReceiptSha256: '872aac5716d79027e1d6b8c7c772a933e67a9a9ef882a104575eb1bf17cda4fe' as string | null,
    windowStartMs: 1789500300000 as number | null,
    windowEndMs: 1789501200000 as number | null,
    maxProvisionedIdentities: 2,
    maxLiveOperations: 20,
    retainUsersAndAccounts: true,
    deleteUsersOrAccounts: false,
  },
} as const;
