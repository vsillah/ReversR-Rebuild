const IGES_SOURCE_MAX_BYTES = 256 * 1024;

function rejection(code, reason) {
  return Object.freeze({ ok: false, code, reason });
}

function inspectIgesFileName(fileName) {
  if (typeof fileName !== 'string' || fileName.length > 120
    || !/^[A-Za-z0-9][A-Za-z0-9 _().-]*$/.test(fileName) || fileName.includes('..')) {
    return rejection('MALFORMED', 'filename');
  }
  if (!/\.(igs|iges)$/i.test(fileName)) return rejection('UNSUPPORTED', 'extension');
  return Object.freeze({ ok: true, code: 'IGES_FILENAME_ACCEPTED' });
}

function inspectIgesSource({ fileName, bytes } = {}) {
  const fileNameInspection = inspectIgesFileName(fileName);
  if (!fileNameInspection.ok) return fileNameInspection;
  if (!(bytes instanceof Uint8Array)) return rejection('MALFORMED', 'bytes-type');
  if (!bytes.byteLength) return rejection('NO_SOURCE', 'empty');
  if (bytes.byteLength > IGES_SOURCE_MAX_BYTES) return rejection('TOO_LARGE', 'size');
  if (bytes.some(value => value > 126 || (value < 32 && value !== 10 && value !== 13))) {
    return rejection('MALFORMED', 'ascii');
  }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return rejection('MALFORMED', 'encoding'); }
  const rows = text.trimEnd().split(/\r?\n/);
  const sections = rows.map(row => row[72]).join('');
  if (rows.some(row => row.length !== 80 || !/^[SGDPT][ 0-9]{7}$/.test(row.slice(72)))
    || !/^S+G+D+P+T$/.test(sections)) return rejection('MALFORMED', 'sections');
  const directory = rows.filter(row => row[72] === 'D');
  if (directory.length % 2) return rejection('MALFORMED', 'directory-pairs');
  for (let index = 0; index < directory.length; index += 2) {
    if (Number(directory[index].slice(0, 8)) === 416) return rejection('UNSUPPORTED', 'external-reference');
  }
  return Object.freeze({ ok: true, code: 'IGES_SOURCE_ACCEPTED', sourceBytes: bytes.byteLength });
}

module.exports = { IGES_SOURCE_MAX_BYTES, inspectIgesFileName, inspectIgesSource };
