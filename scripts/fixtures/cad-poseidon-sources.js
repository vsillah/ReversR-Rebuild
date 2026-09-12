// Exact approved public files and license at an immutable source commit.
const path = require('node:path');
const fixtureRoot = path.join(__dirname, 'poseidon-bsd');
module.exports = [
  {
    "id": "poseidon-cover-slide",
    "source": "vendored-bsd-fixture",
    "path": "Pump Cover Slide.iges",
    "format": "iges",
    "bytes": 48357,
    "sha256": "054992f5b7cd0fc3cd2f2f2ac8358b329708b7573a6ee154d9ddf128b1ff0402",
    "sourceUrl": "https://raw.githubusercontent.com/pachterlab/poseidon/5a139fed350bbf5d775ffa9650f465e557b6ccb0/HARDWARE/pump/iges/Pump%20Cover%20Slide.iges",
    "sourceCommit": "5a139fed350bbf5d775ffa9650f465e557b6ccb0",
    "license": "BSD-2-Clause",
    "licenseUrl": "https://github.com/pachterlab/poseidon/blob/5a139fed350bbf5d775ffa9650f465e557b6ccb0/LICENSE",
    "licenseSha256": "5188559ecc761ecb869ed20b8eccce9cb43cb93b4afec9b62530b3f49b3af9b6"
  },
  {
    "id": "poseidon-syringe-brace",
    "source": "vendored-bsd-fixture",
    "path": "Pump Syringe Brace.iges",
    "format": "iges",
    "bytes": 40824,
    "sha256": "ffa127dfd22931f5b518b466a49dca91b4d35fa1361ead8dba37dd6b7868a60c",
    "sourceUrl": "https://raw.githubusercontent.com/pachterlab/poseidon/5a139fed350bbf5d775ffa9650f465e557b6ccb0/HARDWARE/pump/iges/Pump%20Syringe%20Brace.iges",
    "sourceCommit": "5a139fed350bbf5d775ffa9650f465e557b6ccb0",
    "license": "BSD-2-Clause",
    "licenseUrl": "https://github.com/pachterlab/poseidon/blob/5a139fed350bbf5d775ffa9650f465e557b6ccb0/LICENSE",
    "licenseSha256": "5188559ecc761ecb869ed20b8eccce9cb43cb93b4afec9b62530b3f49b3af9b6"
  }
].map(metadata => ({ metadata: Object.freeze(metadata), fixtureRoot }));
