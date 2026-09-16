function inspectUploadAdmissionDevelopmentDryRunCloseout(closeout) {
  const flags = closeout?.authorityPreservedByCloseout || {};
  const hashesValid = closeout?.evidence?.sanitizedEvidenceSha256 === '78d5817a5d886b1b0646356bfa5c1fe53d6de9584f93e27e2c6ceb21dfc6064b'
    && closeout?.evidence?.sanitizedReceiptSha256 === '0d8f48293e6fab39727b7cfb10985480352c06e9e46f534fd6f2c3c02bc32968';
  const resultValid = closeout?.result?.runCompleted === true
    && closeout?.result?.unknownOutcome === false
    && closeout?.result?.conversionDispatches === 0
    && closeout?.result?.sandboxDispatches === 0
    && closeout?.result?.uploadBodiesRead === 0;
  const caveatRecorded = closeout?.receiptCaveat?.type === 'STALE_RECEIPT_MAIN_COMMIT'
    && closeout?.receiptCaveat?.receiptMainCommit === 'ad06d66430d45cc24bfd5fad7501e2a04e0e68a4'
    && closeout?.receiptCaveat?.verifiedRuntimeMainCommit === '2319c1288217b78bdfeae028a62ab29e45fd635a'
    && closeout?.receiptCaveat?.requiresRerun === false;
  const authoritiesClosed = Object.values(flags).every(value => value === false);
  const structureValid = closeout?.schemaVersion === 1
    && closeout?.mode === 'source-only-cad-upload-admission-development-dry-run-closeout'
    && closeout?.sourceOnly === true
    && closeout?.dryRunCompleted === true
    && closeout?.runRef === 'rrb-ref:cad-upload-admission-development-dry-run-0445z'
    && hashesValid
    && resultValid
    && caveatRecorded
    && authoritiesClosed;
  return {
    structureValid,
    hashesValid,
    resultValid,
    caveatRecorded,
    authoritiesClosed,
    rerunAuthorized: false,
    uploadActivationAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadAuthorized: false,
  };
}

module.exports = { inspectUploadAdmissionDevelopmentDryRunCloseout };
