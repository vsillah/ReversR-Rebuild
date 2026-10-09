const assert = require('node:assert/strict');
const test = require('node:test');
const { IGES_SOURCE_MAX_BYTES, inspectIgesSource } = require('../utils/igesAdmission');
const { upload } = require('../server/cadWorkerContract');
const { createSyntheticIgsQualificationPipeline, createSyntheticIgsSource } = require('../utils/igsPrivatePipelineQualification');

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function serverCode(source) {
  try {
    upload({ fileName: source.fileName, contentBase64: Buffer.from(source.bytes).toString('base64') });
    return 'IGES_SOURCE_ACCEPTED';
  } catch (error) { return error.code; }
}

function withoutDirectoryPair(source) {
  const rows = decoder.decode(source.bytes).trimEnd().split('\n');
  const directoryIndexes = rows.map((row, index) => row[72] === 'D' ? index : -1).filter(index => index >= 0);
  rows.splice(directoryIndexes[1], 1);
  return { ...source, bytes: encoder.encode(`${rows.join('\n')}\n`) };
}

function withExternalReference(source) {
  const rows = decoder.decode(source.bytes).trimEnd().split('\n');
  const index = rows.findIndex(row => row[72] === 'D');
  rows[index] = `${'416'.padStart(8, ' ')}${rows[index].slice(8)}`;
  return { ...source, bytes: encoder.encode(`${rows.join('\n')}\n`) };
}

test('shared browser/server admission agrees for extension, filename, size, ASCII, sections, directory pairs and external references', async () => {
  const base = createSyntheticIgsSource();
  const nonAscii = new Uint8Array(base.bytes); nonAscii[5] = 255;
  const brokenSection = decoder.decode(base.bytes).trimEnd().split('\n');
  brokenSection[1] = `${brokenSection[1].slice(0, 72)}P${brokenSection[1].slice(73)}`;
  const cases = [
    [{ ...base, fileName: 'generated-synthetic-qualification.iges' }, 'IGES_SOURCE_ACCEPTED'],
    [{ ...base, fileName: '../invalid.igs' }, 'MALFORMED'],
    [{ ...base, fileName: 'invalid.step' }, 'UNSUPPORTED'],
    [{ ...base, bytes: new Uint8Array(IGES_SOURCE_MAX_BYTES + 1) }, 'TOO_LARGE'],
    [{ ...base, bytes: nonAscii }, 'MALFORMED'],
    [{ ...base, bytes: encoder.encode(`${brokenSection.join('\n')}\n`) }, 'MALFORMED'],
    [withoutDirectoryPair(base), 'MALFORMED'],
    [withExternalReference(base), 'UNSUPPORTED'],
  ];
  for (const [source, expected] of cases) {
    assert.equal(inspectIgesSource(source).code, expected);
    assert.equal(serverCode(source), expected);
    if (expected !== 'IGES_SOURCE_ACCEPTED') {
      let conversions = 0;
      const result = await createSyntheticIgsQualificationPipeline({ sourceFactory: () => source,
        converter: { convert: async () => { conversions += 1; } } }).run();
      assert.equal(result.code, expected);
      assert.equal(conversions, 0);
      assert.equal(result.ok, false);
    }
  }
});
