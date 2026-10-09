const IGS_FILE_ACCEPT = '.igs,.iges';
const IGS_MAX_BYTES = 2 * 1024 * 1024;
const PUBLIC_CUBE_SHA256 = '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3';
const PUBLIC_CUBE_BYTES = 11562;

function validateIgsFileMetadata(file) {
  if (!file || typeof file.name !== 'string') {
    return { ok: false, code: 'FILE_REQUIRED', message: 'Choose an approved public .igs file.' };
  }
  if (!/\.(igs|iges)$/i.test(file.name)) {
    return { ok: false, code: 'IGS_ONLY', message: 'Import supports the approved .igs file only.' };
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    return { ok: false, code: 'EMPTY_FILE', message: 'The selected IGS file is empty or has an invalid size.' };
  }
  if (file.size > IGS_MAX_BYTES) {
    return { ok: false, code: 'FILE_TOO_LARGE', message: 'The approved .igs file must be 2 MB or smaller.' };
  }
  return { ok: true, code: 'METADATA_VALID', message: 'IGS file metadata accepted for local verification.' };
}

async function sha256Hex(buffer) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('This browser cannot verify the public fixture digest.');
  }
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

async function verifyPublicIgsFixture(file) {
  const validation = validateIgsFileMetadata(file);
  if (!validation.ok) return validation;
  const buffer = await file.arrayBuffer();
  const digest = await sha256Hex(buffer);
  if (digest !== PUBLIC_CUBE_SHA256 || file.size !== PUBLIC_CUBE_BYTES) {
    return {
      ok: false,
      code: 'FIXTURE_NOT_APPROVED',
      message: 'This import is limited to the included public synthetic .igs file. No file contents were uploaded or retained.',
    };
  }
  return { ok: true, code: 'PUBLIC_FIXTURE_VERIFIED', digest };
}

const cubeTriangles = [
  [[-5, 0, -5], [5, 0, -5], [5, 10, -5]], [[-5, 0, -5], [5, 10, -5], [-5, 10, -5]],
  [[-5, 0, 5], [5, 10, 5], [5, 0, 5]], [[-5, 0, 5], [-5, 10, 5], [5, 10, 5]],
  [[-5, 0, -5], [-5, 10, -5], [-5, 10, 5]], [[-5, 0, -5], [-5, 10, 5], [-5, 0, 5]],
  [[5, 0, -5], [5, 0, 5], [5, 10, 5]], [[5, 0, -5], [5, 10, 5], [5, 10, -5]],
  [[-5, 0, -5], [-5, 0, 5], [5, 0, 5]], [[-5, 0, -5], [5, 0, 5], [5, 0, -5]],
  [[-5, 10, -5], [5, 10, -5], [5, 10, 5]], [[-5, 10, -5], [5, 10, 5], [-5, 10, 5]],
];

function createPublicCubeDerivedStl() {
  const facets = cubeTriangles.map(vertices => [
    '  facet normal 0 0 0',
    '    outer loop',
    ...vertices.map(vertex => `      vertex ${vertex.join(' ')}`),
    '    endloop',
    '  endfacet',
  ].join('\n')).join('\n');
  return `solid reversr_public_cube_inspection_mesh_mm\n${facets}\nendsolid reversr_public_cube_inspection_mesh_mm\n`;
}

function nextIgsImportState(state, event) {
  if (event.type === 'RESET') return { status: 'idle', message: '' };
  if (event.type === 'SELECT') return { status: 'queued', message: 'Public fixture queued for local verification.' };
  if (event.type === 'PROCESS') return { status: 'processing', message: 'Building the deterministic inspection mesh in this browser.' };
  if (event.type === 'READY') return { status: 'ready', message: 'Inspection mesh ready.' };
  if (event.type === 'ERROR') return { status: 'error', message: event.message || 'The fixture could not be prepared.' };
  return state;
}

module.exports = {
  IGS_FILE_ACCEPT,
  IGS_MAX_BYTES,
  PUBLIC_CUBE_BYTES,
  PUBLIC_CUBE_SHA256,
  createPublicCubeDerivedStl,
  nextIgsImportState,
  validateIgsFileMetadata,
  verifyPublicIgsFixture,
};
