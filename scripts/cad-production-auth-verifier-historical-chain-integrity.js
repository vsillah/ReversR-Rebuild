// Fixed integrity allowlist for commit-bound historical evidence retired from
// current-source semantic replay. There is intentionally no generation mode.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const BASELINE_COMMIT = '714dce380497d25d19c8653e7bcf3c93105a4f0a';
const HISTORICAL_CLASSIFICATION = 'HISTORICAL_COMMIT_BOUND_NON_REUSABLE';
const ACTIVE_CONTRACT = Object.freeze({
  classification: 'ACTIVE_CURRENT_SOURCE_SEMANTIC_CONTRACT',
  packet: 'docs/cad-production-auth-verifier-current-source-acceptance-v2.json',
  checker: 'scripts/cad-production-auth-verifier-current-source-acceptance-checker.js',
});

const entry = (id, packet, packetSha256, checker, checkerSha256, retiredSemanticMethod) => Object.freeze({
  id, classification: HISTORICAL_CLASSIFICATION, baselineCommit: BASELINE_COMMIT,
  packet, packetSha256, checker, checkerSha256, retiredSemanticMethod,
});

const HISTORICAL_BINDINGS = Object.freeze([
  entry('cad-production-auth-verifier-acceptance', 'docs/cad-production-auth-verifier-acceptance.json', '31d1368957f770c423c903644decbc8043ac076a0dd8d76edfc3105a9643176f', 'scripts/cad-production-auth-verifier-acceptance-checker.js', '07ac933bece18612b246beb79c4b3e3d38110f9b3cdd4b3b6b9047e6bcdb21af', 'checkAcceptance'),
  entry('cad-production-verifier-evidence-template', 'docs/cad-production-verifier-evidence-template.json', '8735d780c6b5ba3b95de77ce74a67691b4a50595334ee6f59c49898c9b2d6dfb', 'scripts/cad-production-verifier-evidence-checker.js', '7ec0e005d724554636ca126fe06721ac7bbc8e699a54babf888c1191f73f990e', 'checkEvidence'),
  entry('cad-auth-live-evidence-plan', 'docs/cad-auth-live-evidence-plan.json', '869e07bddbc0e8f713bf847739b4cf333424a1cab1a223ee23004d2e0252168a', 'scripts/cad-auth-live-evidence-plan-checker.js', 'c9f53ddd94768d361e8f293dadd06fb1f3232bee935eca282897c9d40711e1d5', 'checkPlan'),
  entry('cad-auth-sealed-evidence-card', 'docs/cad-auth-sealed-evidence-card.json', '103a3c44df0baa77b1df7f195ae8b1e764232eb5a6c2e95103266eb1709cc123', 'scripts/cad-auth-sealed-evidence-card-checker.js', '1295d21a7cbfbb04f3826280b55c5c0c1ae9e8bf5b4d4714cb55ac9dc1fa47a5', 'checkCard'),
  entry('cad-auth-sealed-setup', 'docs/cad-auth-sealed-setup.json', '5bef96a44ec2e180b9b22aaa1901ef596bcd056def4eed07979c7cd2ca281fe5', 'scripts/cad-auth-sealed-setup-checker.js', '0dc268d4ef540ca4cfe6559c0516135e0b0534af4aa73c9774d78e04aa5ef717', 'checkSetup'),
  entry('cad-auth-live-evidence-prerequisites', 'docs/cad-auth-live-evidence-prerequisites.json', 'd891b624ab979fe9cc2b2ea680c180eae507dc497b4c3f64846c26835a0c91ca', 'scripts/cad-auth-live-evidence-prereq-checker.js', '2283538838f4203505672cf4984a6bcb3e8fe517c495446787ac97091c136645', 'checkPrerequisites'),
  entry('cad-auth-live-evidence-prereq-completion', 'docs/cad-auth-live-evidence-prereq-completion.json', '1c5a3ab4f0f411a09c81eea6ceab0214ae3974f53a8b9c8a799894d0c6db6b60', 'scripts/cad-auth-live-evidence-prereq-completion-checker.js', 'efd30a7390594e6c2f2061c06ea1e7d406215cb5788538cc00328b0fc3312349', 'checkCompletion'),
  entry('cad-auth-live-evidence-acceptance', 'docs/cad-auth-live-evidence-acceptance.json', '826ed6507787f3173643d281ad868e50175327fc067b56cb11c2c8cdf89052ba', 'scripts/cad-auth-live-evidence-acceptance-checker.js', 'eaed79e52ab965ed7bd4de049a49bc86fbf49ce89fecd49fd742676d2eda4298', 'checkAcceptance'),
  entry('cad-auth-live-evidence-sealed-card-prep', 'docs/cad-auth-live-evidence-sealed-card-prep.json', '78db943f6808737b715a38e5d6c333aa79e11a1ff9845dcb3a373981b0153524', 'scripts/cad-auth-live-evidence-sealed-card-prep-checker.js', '4c5b409af099e5b2bba1cc206e172015a4556677b5fd5f90808ace2410abd119', 'checkPreparation'),
  entry('cad-auth-live-collector-binding', 'docs/cad-auth-live-collector-binding.json', '59ed70062de06287a7ff42965d7f561addb771a02b97e3517ff870fe566fb84a', 'scripts/cad-auth-live-collector-binding-checker.js', 'bcd055bc6d21840e3e75c1c0cf97ce1a815c9cad266c67d8bcd2f9f6332ab6b6', 'checkBinding'),
  entry('cad-auth-command-card-source', 'docs/cad-auth-command-card-source.json', 'b4abccb63173379b3c9011a7216b5225c1dbb338cdf466208baf72e751916145', 'scripts/cad-auth-command-card-source-checker.js', '49cd27b1b411cc29ffaad3a287f3ccdb0b7baec3d8e1de8ab6066bf3f6727e7a', 'checkPreparation'),
  entry('cad-auth-restricted-receipt-bundle', 'docs/cad-auth-restricted-receipt-bundle.json', '78ed084f7380c58bb40b5dc5c38745a73d671a2de50d79986b712748f301baa3', 'scripts/cad-auth-restricted-receipt-bundle-checker.js', '8098aae5b30ff76408221310f09f6d029216ef72daa5fec801351f1a6bd04e07', 'checkBundle'),
  entry('cad-auth-receipt-custody-binding', 'docs/cad-auth-receipt-custody-binding.json', 'a1ce32390e63d572d635b98d7217df7af60b252000f4ff0e6638a567bf9876fe', 'scripts/cad-auth-receipt-custody-binding-checker.js', 'a4a3db1760f1ab45661dfd205a543fb70ad797d670d5f772b098aab4b9d2212b', 'checkBinding'),
  entry('cad-auth-sealed-card-custody-rebind', 'docs/cad-auth-sealed-card-custody-rebind.json', 'db3a02b43845f58fb88e320c7c87a3f38c599e06d2d62dd331a8e6b92ba430fb', 'scripts/cad-auth-sealed-card-custody-rebind-checker.js', 'f99c820ae4afb3383d6f8e5d06558018ea42afb1695f65fdcd1229f2bd4f0046', 'checkRebind'),
  entry('cad-auth-receipt-intake-template', 'docs/cad-auth-receipt-intake-template.json', '2c66e9daf2d495bdc214b7b34e7ba36d300681173024019e9ee7ed6ad86902dd', 'scripts/cad-auth-receipt-intake-template-checker.js', '08a9b6448031a4166f566cd55a32b993ba12fc4c39f083d6faf6628f78670680', 'checkIntake'),
  entry('cad-auth-receipt-intake-review-disposition', 'docs/cad-auth-receipt-intake-review-disposition.json', 'f84b9726cebac74c801542d2f4c7fe78124d589f1172b29bf3c09d78c1d4cee7', 'scripts/cad-auth-receipt-intake-review-disposition-checker.js', '1c4491c38c18052bc5041cf1f1d41405b3400d3c38f37fe633a8c1b15709e98f', 'checkDisposition'),
  entry('cad-auth-restricted-receipt-review', 'docs/cad-auth-restricted-receipt-review.json', 'c8f517c4231fdf6af56695bc83f76eed2a8cc88d73b617b10d830a5490b6b5f8', 'scripts/cad-auth-restricted-receipt-review-checker.js', '5d6eca3de74d673e88d5b36f60e9ecd720efcb1b4215b69f40fab6bbfe002991', 'checkReview'),
  entry('cad-auth-restricted-source-intake', 'docs/cad-auth-restricted-source-intake.json', 'c0bc4fc5249d72bd922fe3bf51abe73a2973b799901598b7afad9af37e2af871', 'scripts/cad-auth-restricted-source-intake-checker.js', 'e578b304e3a1514ddbfffd46b828f2cdf45faaaabc3977f0b47b99c1a127baec', 'checkIntake'),
  entry('cad-auth-restricted-candidate-discovery', 'docs/cad-auth-restricted-candidate-discovery.json', '5c84a87e524a61613356cb616ede1049f95687f775007876c4ebe8361d5f0641', 'scripts/cad-auth-restricted-candidate-discovery-checker.js', '4dc8826dfb39348720d855763ccb65a60d720e7997199e003ea7d49164ab6b76', 'checkDiscovery'),
  entry('cad-auth-restricted-source-set-contract', 'docs/cad-auth-restricted-source-set-contract.json', '1a465e49cd6d1351a1b173ab5140323153fd7349124d5fe7a63b6a593f5c8bc4', 'scripts/cad-auth-restricted-source-set-contract-checker.js', '5c6878b0d9c8ab9a8ca0f06d9c89873e717cb1b230f26f80b0b347183debd708', 'checkContract'),
  entry('cad-auth-restricted-source-set-generator', 'docs/cad-auth-restricted-source-set-generator.json', '7c2bb5d5f87f5c4016aaf9b4db2faccf3f545af5fff247874a11c05640975172', 'scripts/cad-auth-restricted-source-set-generator-checker.js', '3a7daac2a14f2f138b37c70361e433bdc3cb6edafaf9858485cfd5c2a93fca00', 'checkGeneratorPacket'),
  entry('cad-auth-restricted-receipt-gap-closure', 'docs/cad-auth-restricted-receipt-gap-closure.json', '501768785c79236cd89df5a70bf31efb7afbca20d8388b5923868c897d4519c1', 'scripts/cad-auth-restricted-receipt-gap-closure-checker.js', '897dcfa68a2380bbd56506a8f403919e25e27561d2a51187a00d521ac6962426', 'checkGapClosurePacket'),
  entry('cad-auth-missing-receipt-artifact-prep', 'docs/cad-auth-missing-receipt-artifact-prep.json', 'dca8785d65532cbfef71024d971057bda820baa8ed16ece87e52d64098f36ec8', 'scripts/cad-auth-missing-receipt-artifact-prep-checker.js', 'f2d6b951d2dd7567cefdd246a2d1a210308dcdf423c6d0455128aa75d336c30b', 'checkArtifactPacket'),
  entry('cad-auth-eight-artifact-supply-gate', 'docs/cad-auth-eight-artifact-supply-gate.json', '6c8078d324286af5560e99c5d0e632616d83867538cee65ca8645975e96cbdac', 'scripts/cad-auth-eight-artifact-supply-gate-checker.js', '5db2ed7dbe82b8f3509172f3c9d2455693372baeb72e1c5c4d7977e48eadc3bc', 'checkSupplyPacket'),
  entry('cad-auth-receipt-provenance-gap-recovery', 'docs/cad-auth-receipt-provenance-gap-recovery.json', '8ddc3d58566bcd8ee906aeeae12c9c305e87f7f4ae11b781a2c3a2a3aa5eeb91', 'scripts/cad-auth-receipt-provenance-gap-recovery-checker.js', '4ddbb696eb996fe62ba06d22ba2cd0a88484ab861ec77d58bf771fb8492a1fa1', 'checkRecoveryPacket'),
  entry('cad-auth-accepted-provenance-projection', 'docs/cad-auth-accepted-provenance-projection.json', '03be649bfab60b66700775fc00946daf9209cc9cfa4d3f741214342c1d784aec', 'scripts/cad-auth-accepted-provenance-projection-checker.js', 'cd136ebd2fafede2fcf220e86a79bcc7702ea481f40222b46eede088188f2681', 'checkProjectionPacket'),
  entry('cad-auth-restricted-source-set-projection', 'docs/cad-auth-restricted-source-set-projection.json', '2a3c04870214faa8a108ea364b702f7cedb7c12878dae49add67168d3f153d9b', 'scripts/cad-auth-restricted-source-set-projection-checker.js', '10c95109009b4e8d35ad8d43115e477f072c771410efa4796147fac349ff9fbe', 'checkSourceSetProjectionPacket'),
  entry('cad-auth-upload-admission-readiness-rollup', 'docs/cad-auth-upload-admission-readiness-rollup.json', '9c85cdef9841a16f8400e1ba960c16cbbc3e83e6d63130324287266733dc204b', 'scripts/cad-auth-upload-admission-readiness-rollup-checker.js', '71807f62ffb3dbe219c18afcbb8fdf6ec120df49d88bd6156cf292cf563260df', 'checkReadinessRollupPacket'),
  entry('cad-auth-prod-opening-prep', 'docs/cad-auth-prod-opening-prep.json', '29a9687a2a53ffbc4bf34af8cf943f4eedefc7f7c202ab837f068ccadd1b5bd2', 'scripts/cad-auth-prod-opening-prep-checker.js', 'd334dc88cdf792654b9aff08a97b5dcd21d62db406710b4f16a042021f920338', 'checkPacket'),
  entry('cad-auth-prod-runner', 'docs/cad-auth-prod-runner.json', '815e4d35c7f7a6be8ed009d42baa283672492e06ee3001326f235d348944f0ad', 'scripts/cad-auth-prod-runner-checker.js', '1b2e87999e81d5e8287a875970df04174a041b83ace83eee7a3e4e6f9b2352a0', 'checkPacket'),
  entry('cad-auth-prod-executable-runner-source', 'docs/cad-auth-prod-executable-runner-source.json', 'f0d9db455a4cdeb7924e80a162a27730878f55efcd7d189c363d13b42efa0ed2', 'scripts/cad-auth-prod-executable-runner-source-checker.js', 'c1d77285b21853309840db36e2b59a05e1f1da5ec6950e96c33e4d36ad02e89f', 'checkPacket'),
  entry('cad-auth-prod-executable-runner', 'docs/cad-auth-prod-executable-runner.json', '5d613e1c1064fecf3c14a7810dc4c3453a45be82905cc7060f8cf1ae1a67603b', 'scripts/cad-auth-prod-executable-runner-checker.js', 'acd7c838cd90ac366c71c498d2fc3d278fc28afd45c1e78f3315c4670168510a', 'checkPacket'),
  entry('cad-auth-prod-durable-runner-adapter-prep', 'docs/cad-auth-prod-durable-runner-adapter-prep.json', '783fc44dc5b052f7f6d2da933e8d32c09ab11a872ba3f9d2a027db173a16d285', 'scripts/cad-auth-prod-durable-runner-adapter-prep-checker.js', '8e4f51d446352623a7a5a5b764a88e368d1ad4df06701dd2d7d2dd4b0e539bba', 'checkPacket'),
  entry('cad-auth-durable-adapter-evidence-command-card-review', 'docs/cad-auth-durable-adapter-evidence-command-card-review.json', 'c857f4fd982dbdfb113450920e88f25841f5e21b25f9ed515232d1b49b9420ce', 'scripts/cad-auth-durable-adapter-evidence-command-card-review-checker.js', 'ee7d30ea750c8227e3490c4143c4996767f5c50673a616f85512639a7edee021', 'checkReviewPacket'),
  entry('cad-auth-live-opening-runtime-mount-prep', 'docs/cad-auth-live-opening-runtime-mount-prep.json', 'cc34518d4b02ad198c2f01c0e05615c78bed9881cc7b864218fe5d9fb42f8d12', 'scripts/cad-auth-live-opening-runtime-mount-prep-checker.js', '795b345fcd8e8d4a202c5ac1f90476cb922c16badf5a86dc618564c911e99d6a', 'checkRuntimeMountPrepPacket'),
  entry('cad-internal-admission-current-commit-rebind', 'docs/cad-internal-admission-current-commit-rebind.json', '2d4a70a6ae3e04aec75201f8a253b92aeb240ce29a144d771df6d87cbd203f4f', 'scripts/cad-internal-admission-current-commit-rebind-checker.js', '7776d50f9ccb4b2c3e85edd3a98f0b06bf42fd581569017592d695081a498a72', 'checkRebind'),
]);

const sha256 = value => createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const REQUIRED_KEYS = Object.freeze([
  'baselineCommit', 'checker', 'checkerSha256', 'classification', 'id',
  'packet', 'packetSha256', 'retiredSemanticMethod',
]);

function checkHistoricalChainIntegrity({ bindings = HISTORICAL_BINDINGS, readSource = read } = {}) {
  const problems = [];
  try {
    if (!Array.isArray(bindings) || bindings.length !== 36) throw Error('INVALID_BINDING_COUNT');
    const ids = new Set();
    const paths = new Set();
    for (const binding of bindings) {
      if (!binding || Object.keys(binding).sort().join('\0') !== [...REQUIRED_KEYS].sort().join('\0')) throw Error('INVALID_BINDING_SHAPE');
      if (binding.classification !== HISTORICAL_CLASSIFICATION || binding.baselineCommit !== BASELINE_COMMIT) throw Error('INVALID_CLASSIFICATION');
      if (binding.packet === ACTIVE_CONTRACT.packet || binding.checker === ACTIVE_CONTRACT.checker) throw Error('ACTIVE_CONTRACT_MISCLASSIFIED');
      if (ids.has(binding.id) || paths.has(binding.packet) || paths.has(binding.checker) || binding.packet === binding.checker) throw Error('DUPLICATE_BINDING');
      ids.add(binding.id); paths.add(binding.packet); paths.add(binding.checker);
      if (!/^[a-z0-9][a-z0-9-]+$/.test(binding.id) || !/^docs\/[^/]+\.json$/.test(binding.packet)
        || !/^scripts\/[^/]+-checker\.js$/.test(binding.checker) || !/^[a-f0-9]{64}$/.test(binding.packetSha256)
        || !/^[a-f0-9]{64}$/.test(binding.checkerSha256) || !/^check[A-Z]/.test(binding.retiredSemanticMethod)) throw Error('INVALID_BINDING_VALUE');
      if (sha256(readSource(binding.packet)) !== binding.packetSha256
        || sha256(readSource(binding.checker)) !== binding.checkerSha256) throw Error('HISTORICAL_BYTES_DRIFTED');
    }
  } catch {
    problems.push('INVALID_HISTORICAL_CHAIN_INTEGRITY');
  }
  return {
    ok: problems.length === 0,
    baselineCommit: BASELINE_COMMIT,
    activeClassification: ACTIVE_CONTRACT.classification,
    historicalClassification: HISTORICAL_CLASSIFICATION,
    historicalBindingCount: problems.length === 0 ? bindings.length : 0,
    historicalPacketsReusable: false,
    historicalApprovalsReusable: false,
    historicalWindowsReusable: false,
    problems,
  };
}

if (require.main === module) {
  const result = process.argv.length === 2
    ? checkHistoricalChainIntegrity()
    : { ok: false, problems: ['INVALID_HISTORICAL_CHAIN_INTEGRITY_MODE'] };
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}

module.exports = {
  ACTIVE_CONTRACT,
  BASELINE_COMMIT,
  HISTORICAL_BINDINGS,
  HISTORICAL_CLASSIFICATION,
  checkHistoricalChainIntegrity,
};
