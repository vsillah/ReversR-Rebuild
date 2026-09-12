// Exact Captain-authorized public source; no runtime acquisition.
const path = require('node:path');
const metadata = Object.freeze({
  "id": "vibe-mit-solid",
  "source": "vendored-mit-fixture",
  "path": "solid.igs",
  "format": "iges",
  "bytes": 12393,
  "sha256": "d1e88b9e5ab38751e22bda59977d4aa37fd523040f75bc8a2f3428b50f562d71",
  "sourceUrl": "https://raw.githubusercontent.com/Masoudjafaripour/Vibe_CADing/main/src/B-rep/results/solid.igs",
  "license": "MIT",
  "licenseUrl": "https://github.com/Masoudjafaripour/Vibe_CADing/blob/main/LICENSE"
});
const fixtureRoot = path.join(__dirname, 'vibe-mit');
module.exports = { metadata, fixtureRoot };
