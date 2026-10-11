const assert = require('node:assert/strict');
const test = require('node:test');
const { IGES_SOURCE_MAX_BYTES, inspectIgesSource } = require('../utils/igesAdmission');
const { AUTHENTICATED_IGES_SOURCE_MAX_BYTES, inspectAuthenticatedIgesSource }
  = require('../utils/cadAuthenticatedIgesAdmission');
const { upload } = require('../server/cadAuthenticatedIgsWorkerContract');
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

function authenticatedSizedSource(targetBytes = IGES_SOURCE_MAX_BYTES + 80) {
  const row = (section, sequence, body = '') => (
    `${body.padEnd(72, ' ').slice(0, 72)}${section}${String(sequence).padStart(7, ' ')}`
  );
  const rows = [row('S', 1, 'authenticated size contract'), row('G', 1, ','),
    row('D', 1, '100'), row('D', 2)];
  let sequence = 1;
  while (encoder.encode(`${rows.join('\n')}\n${row('T', 1)}`).byteLength <= targetBytes) {
    rows.push(row('P', sequence, `${sequence},`));
    sequence += 1;
  }
  rows.push(row('T', 1));
  return { fileName: 'authenticated-sized-source.igs',
    bytes: encoder.encode(`${rows.join('\n')}\n`) };
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
    [{ ...base, bytes: nonAscii }, 'MALFORMED'],
    [{ ...base, bytes: encoder.encode(`${brokenSection.join('\n')}\n`) }, 'MALFORMED'],
    [withoutDirectoryPair(base), 'MALFORMED'],
    [withExternalReference(base), 'UNSUPPORTED'],
  ];
  for (const [source, expected] of cases) {
    assert.equal(inspectIgesSource(source).code, expected);
    assert.equal(inspectAuthenticatedIgesSource(source).code, expected);
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
  const legacyOversize = { ...base, bytes: new Uint8Array(IGES_SOURCE_MAX_BYTES + 1) };
  assert.equal(inspectIgesSource(legacyOversize).code, 'TOO_LARGE');
  let conversions = 0;
  const legacyResult = await createSyntheticIgsQualificationPipeline({ sourceFactory: () => legacyOversize,
    converter: { convert: async () => { conversions += 1; } } }).run();
  assert.equal(legacyResult.code, 'TOO_LARGE');
  assert.equal(conversions, 0);
  const authenticatedSized = authenticatedSizedSource();
  assert.ok(authenticatedSized.bytes.byteLength > IGES_SOURCE_MAX_BYTES);
  assert.ok(authenticatedSized.bytes.byteLength < AUTHENTICATED_IGES_SOURCE_MAX_BYTES);
  assert.equal(inspectIgesSource(authenticatedSized).code, 'TOO_LARGE');
  assert.equal(inspectAuthenticatedIgesSource(authenticatedSized).code,
    'IGES_SOURCE_ACCEPTED');
  assert.equal(serverCode(authenticatedSized), 'IGES_SOURCE_ACCEPTED');
  assert.equal(serverCode({ ...base,
    bytes: new Uint8Array(AUTHENTICATED_IGES_SOURCE_MAX_BYTES + 1) }), 'TOO_LARGE');
  assert.equal(inspectAuthenticatedIgesSource({ ...base,
    bytes: new Uint8Array(AUTHENTICATED_IGES_SOURCE_MAX_BYTES + 1) }).code, 'TOO_LARGE');
});
