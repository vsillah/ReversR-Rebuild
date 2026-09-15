// Source binding for one bounded development Auth/session qualification run.
// Disabled by default; a later reviewed source rebind must install a run key digest
// and UTC window before any live development run can start.
export const cadDevAuthQualificationBinding = {
  enabled: true,
  mode: 'cad-dev-auth-session-qualification-rebind-1800z',
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
    runId: 'cad-dev-auth-session-qualification-1800z' as string | null,
    runKeySha256: '63420aebb6c6b6b1db74c731191deb99aa0d6f62e6594560bf7ba7f9d0e550e1' as string | null,
    acceptedProjectionSha256: 'd6c7a2e2d888c7600a98151cc615a2b4ae81127c079eb1561b179c03e0eabf56' as string | null,
    acceptanceReceiptSha256: '77b714d03fbb365eb6e28de1456f64da817762afa6a82d0d2e8715886d4727d5' as string | null,
    windowStartMs: 1789495200000 as number | null,
    windowEndMs: 1789496100000 as number | null,
    maxProvisionedIdentities: 2,
    maxLiveOperations: 20,
    retainUsersAndAccounts: true,
    deleteUsersOrAccounts: false,
  },
} as const;
