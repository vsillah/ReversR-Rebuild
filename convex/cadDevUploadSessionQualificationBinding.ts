// Source binding for one bounded development upload-session qualification run.
// This binds only the reviewed 2026-09-15T22:30Z tuple; it does not authorize
// a live run by itself.
export const cadDevUploadSessionQualificationBinding = {
  enabled: true,
  mode: 'cad-dev-upload-session-2230z-rebind',
  target: {
    deploymentName: 'majestic-alligator-31',
  },
  run: {
    runKeySha256: '6c78389d586db2db5ff30a2adde83a44f4f4f8caf497be718aa0da0adad3b50d',
    acceptedProjectionSha256: '5d56b109da11edc6ca71cd48fcaa9a960055e71aeb2f1ea4ca690b3ca7ba7383',
    acceptanceReceiptSha256: 'e5a38f6164daca7dd474823e99b3c49571359794d7833ece49cddc17ce7d7d56',
    windowStartMs: 1789511400000,
    windowEndMs: 1789512300000,
  },
  constraints: {
    bodyAdmissionAuthorized: false,
    maxWindowMs: 15 * 60 * 1000,
    maxOperationBudgetMs: 800,
    retainRevokedState: true,
  },
} as const;
