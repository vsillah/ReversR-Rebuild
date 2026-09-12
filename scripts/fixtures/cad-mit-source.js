// The Captain-authorized Kantoku source, retained with its original hash.
const path = require('node:path');
const metadata = Object.freeze({
  id: 'kantoku-mit-sample', source: 'vendored-mit-fixture', path: 'sample.igs', format: 'iges',
  bytes: 24948, sha256: 'f2ebe63992eaf1f91b33d1f1773b3fa0ad5eb2fe66f1a477fb5f86f0427e1893',
  sourceUrl: 'https://raw.githubusercontent.com/kantoku-code/CATIA_V5-igs2cat_groupbylayer/main/sample/sample.igs',
  license: 'MIT',
  licenseUrl: 'https://github.com/kantoku-code/CATIA_V5-igs2cat_groupbylayer/blob/main/LICENSE',
});
const fixtureRoot = path.join(__dirname, 'kantoku-mit');
module.exports = { metadata, fixtureRoot };
