import XLSX from 'xlsx';
import { distance } from 'fastest-levenshtein';
import db from '../db/pool.js';
import { createStudentWithProgram } from './studentService.js';

const SCHEMA = 'comision_ua';
const RECORD_SELECT = `
        SELECT c.id,
      COALESCE(NULLIF(TRIM(CONCAT(e.nombres, ' ', e.apellidos)), ''), e.nombres, c.cod_programa) AS title,
      COALESCE(p.nombre, c.cod_programa) AS category,
      c.valor_comision AS amount,
      COALESCE(c.estado_de_pago::text, 'pending') AS status,
      c.fecha_matricula AS created_at,
      c.rut_estudiante,
      c.cod_programa,
      c.version_programa,
      c.comentario_asesor,
      c.estado_de_pago,
      c.fecha_matricula,
      c.sede,
      c.matricula,
          e.nombres AS estudiante_nombres,
          e.apellidos AS estudiante_apellidos,
          e.correo AS estudiante_correo,
          e.telefono AS estudiante_telefono,
      u.nombre_completo AS asesor
    FROM ${SCHEMA}.comisiones c
    LEFT JOIN ${SCHEMA}.estudiantes e ON c.rut_estudiante = e.rut
    LEFT JOIN ${SCHEMA}.usuarios u ON c.id_asesor = u.bx24_id
    LEFT JOIN ${SCHEMA}.programas p ON c.cod_programa = p.cod_programa
`;

const MAX_BULK_ROWS = 500;
const BULK_COLUMN_MAP = {
  rut: 'rut',
  rutsinpuntos: 'rut',
  nombres: 'nombres',
  apellidos: 'apellidos',
  correo: 'correo',
  email: 'correo',
  telefono: 'telefono',
  codigoprograma: 'codPrograma',
  codigo: 'codPrograma',
  codprograma: 'codPrograma',
  nombreprograma: 'nombrePrograma',
  programa: 'nombrePrograma',
  centrocostos: 'centroCostos',
  centrodecostos: 'centroCostos',
  estadopago: 'estadoPago',
  estado: 'estadoPago',
  fechamatricula: 'fechaMatricula',
  fecha: 'fechaMatricula',
  sede: 'sede',
  valormatricula: 'matricula',
  matricula: 'matricula',
  valorarancel: 'valorComision',
  valorcomision: 'valorComision',
  versionprograma: 'versionPrograma',
  version: 'versionPrograma',
  comentarioasesor: 'comentarioAsesor',
  comentario: 'comentarioAsesor'
};

const REQUIRED_BULK_FIELDS = [
  { key: 'rut', label: 'RUT' },
  { key: 'nombres', label: 'Nombres' },
  { key: 'apellidos', label: 'Apellidos' },
  { key: 'correo', label: 'Correo' },
  { key: 'nombrePrograma', label: 'Nombre de programa' }
];

function buildBulkError (message, detail) {
  const error = new Error(message);
  error.statusCode = 400;
  if (detail) error.detail = detail;
  return error;
}

async function getAdvisorBx24Id (userId) {
  const { rows } = await db.query(`SELECT bx24_id FROM ${SCHEMA}.usuarios WHERE id = $1`, [userId]);
  if (!rows[0] || !rows[0].bx24_id) {
    throw buildBulkError('Tu usuario no tiene un asesor asociado (bx24_id).');
  }
  return rows[0].bx24_id;
}

function normalizeColumnKey (key) {
  return key?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '') || '';
}

function mapBulkRow (rawRow) {
  return Object.entries(rawRow).reduce((acc, [key, value]) => {
    if (key?.startsWith('__')) return acc;
    const normalizedKey = normalizeColumnKey(key);
    const mappedKey = BULK_COLUMN_MAP[normalizedKey];
    if (!mappedKey) return acc;
    acc[mappedKey] = typeof value === 'string' ? value.trim() : value;
    return acc;
  }, {});
}

function excelSerialToISO (serial) {
  if (typeof serial !== 'number') return null;
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function normalizeDateValue (value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    return excelSerialToISO(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  }
  return null;
}

function sanitizeRut (value) {
  if (!value) return value;
  return value.toString().replace(/\./g, '').toUpperCase();
}

function evaluateMappedRow (mappedRow) {
  const meaningfulValues = Object.values(mappedRow).filter((val) => val !== undefined && val !== null && `${val}`.trim() !== '');
  if (meaningfulValues.length === 0) {
    return null;
  }

  const errors = [];
  REQUIRED_BULK_FIELDS.forEach(({ key, label }) => {
    if (!mappedRow[key]) {
      errors.push(`${label} es obligatorio`);
    }
  });

  if (mappedRow.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mappedRow.correo)) {
    errors.push('El correo tiene un formato inválido');
  }

  const fechaMatricula = normalizeDateValue(mappedRow.fechaMatricula);
  if (fechaMatricula === null) {
    errors.push('La fecha de matrícula es inválida');
  }

  let matriculaNumber;
  if (mappedRow.matricula !== undefined && mappedRow.matricula !== null && `${mappedRow.matricula}`.trim() !== '') {
    const parsed = Number(mappedRow.matricula);
    if (Number.isNaN(parsed)) {
      errors.push('La matrícula debe ser numérica');
    } else {
      matriculaNumber = parsed;
    }
  }

  let valorComisionNumber;
  if (mappedRow.valorComision !== undefined && mappedRow.valorComision !== null && `${mappedRow.valorComision}`.trim() !== '') {
    const parsed = Number(mappedRow.valorComision);
    if (Number.isNaN(parsed)) {
      errors.push('El valor del arancel debe ser numérico');
    } else {
      valorComisionNumber = parsed;
    }
  }

  const payload = {
    rut: sanitizeRut(mappedRow.rut),
    nombres: mappedRow.nombres,
    apellidos: mappedRow.apellidos,
    correo: mappedRow.correo,
    telefono: mappedRow.telefono ? mappedRow.telefono.toString().replace(/\s+/g, '') : undefined,
    codPrograma: mappedRow.codPrograma,
    nombrePrograma: mappedRow.nombrePrograma,
    centroCostos: mappedRow.centroCostos || undefined,
    estadoPago: 'Pendiente de pago',
    fechaMatricula: fechaMatricula || undefined,
    sede: mappedRow.sede || undefined,
    valorComision: valorComisionNumber ?? 0,
    matricula: matriculaNumber,
    versionPrograma: mappedRow.versionPrograma ? String(mappedRow.versionPrograma) : '1',
    comentarioAsesor: mappedRow.comentarioAsesor || undefined
  };

  return { payload, errors };
}

function prepareBulkRow (rawRow) {
  const mappedRow = mapBulkRow(rawRow);
  const evaluation = evaluateMappedRow(mappedRow);
  if (!evaluation) {
    return null;
  }
  return { ...evaluation, mappedRow };
}

function extractRowsFromBuffer (buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
  const [firstSheetName] = workbook.SheetNames;
  if (!firstSheetName) {
    return [];
  }
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function normalizeProgramName (value) {
  if (!value) return '';
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'Y')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildProgramMatcher (programs = []) {
  const entries = programs.map((program) => ({
    ...program,
    normalizedName: normalizeProgramName(program.nombre || '')
  }));

  const nameMap = new Map();
  const codeMap = new Map();
  entries.forEach((entry) => {
    if (entry.normalizedName) {
      nameMap.set(entry.normalizedName, entry);
    }
    if (entry.cod_programa) {
      codeMap.set(entry.cod_programa.toUpperCase(), entry);
    }
  });

  function suggest (name, limit = 3) {
    const normalizedInput = normalizeProgramName(name);
    if (!normalizedInput) {
      return entries.slice(0, limit);
    }
    const ranking = entries
      .map((entry) => ({
        entry,
        score: entry.normalizedName
          ? distance(normalizedInput, entry.normalizedName)
          : Number.MAX_SAFE_INTEGER
      }))
      .filter((item) => Number.isFinite(item.score))
      .sort((a, b) => a.score - b.score);

    const maxDistance = Math.max(4, Math.floor(normalizedInput.length / 2));
    const filtered = ranking.filter((item) => item.score <= maxDistance);
    const source = filtered.length > 0 ? filtered : ranking;
    return source.slice(0, limit).map((item) => item.entry);
  }

  return {
    matchByName: (name) => {
      const normalized = normalizeProgramName(name);
      if (!normalized) return null;
      return nameMap.get(normalized) || null;
    },
    matchByCode: (code) => {
      if (!code) return null;
      return codeMap.get(code.toString().toUpperCase()) || null;
    },
    suggest
  };
}

function resolveProgramForPayload (payload, matcher) {
  if (!payload?.nombrePrograma && !payload?.codPrograma) {
    return { errorCode: 'PROGRAM_NAME_REQUIRED' };
  }

  const byName = matcher.matchByName(payload.nombrePrograma);
  if (byName) {
    return { program: byName };
  }

  const byCode = matcher.matchByCode(payload.codPrograma);
  if (byCode) {
    return { program: byCode };
  }

  if (!payload?.nombrePrograma) {
    return { errorCode: 'PROGRAM_NAME_REQUIRED' };
  }

  return {
    errorCode: 'PROGRAM_NAME_MISMATCH',
    suggestions: matcher.suggest(payload.nombrePrograma)
  };
}

function extractRowNumber (rawRow, index) {
  if (rawRow && typeof rawRow.row === 'number') return rawRow.row;
  if (rawRow && typeof rawRow.rowNumber === 'number') return rawRow.rowNumber;
  if (rawRow && typeof rawRow.fila === 'number') return rawRow.fila;
  if (rawRow && typeof rawRow.__rowNum__ === 'number') return rawRow.__rowNum__ + 1;
  return index + 2;
}

function buildFeedbackData (mappedRow, rowNumber) {
  return {
    row: rowNumber,
    rut: mappedRow.rut || '',
    nombres: mappedRow.nombres || '',
    apellidos: mappedRow.apellidos || '',
    correo: mappedRow.correo || '',
    codPrograma: mappedRow.codPrograma || '',
    nombrePrograma: mappedRow.nombrePrograma || '',
    matricula: mappedRow.matricula || '',
    sede: mappedRow.sede || '',
    versionPrograma: mappedRow.versionPrograma || ''
  };
}

function buildManualBulkError (entries) {
  const error = new Error('La carga contiene filas que requieren revisión');
  error.statusCode = 400;
  const codes = Array.from(new Set(entries.map((entry) => entry.errorCode).filter(Boolean)));
  error.code = codes.length === 1 ? codes[0] : 'BULK_VALIDATION_FAILED';
  error.issues = entries.map((entry) => ({
    fila: entry.row,
    mensajes: entry.messages,
    nombreIngresado: entry.nombrePrograma,
    sugerencias: entry.suggestions || []
  }));
  return error;
}

function mapRecordRow (row) {
  return {
    id: row.id,
    title: row.title || 'Sin título',
    category: row.category || 'Sin categoría',
    amount: Number(row.amount) || 0,
    status: row.status || 'pending',
    created_at: row.created_at || new Date().toISOString(),
    rut_estudiante: row.rut_estudiante,
    cod_programa: row.cod_programa,
    version_programa: row.version_programa,
    comentario_asesor: row.comentario_asesor,
    asesor: row.asesor,
    estado_pago: row.estado_de_pago || row.status,
    fecha_matricula: row.fecha_matricula || row.created_at,
    sede: row.sede,
    matricula: row.matricula ? Number(row.matricula) : null,
    estudiante_nombres: row.estudiante_nombres,
    estudiante_apellidos: row.estudiante_apellidos,
    estudiante_correo: row.estudiante_correo,
    estudiante_telefono: row.estudiante_telefono
  };
}

async function fetchUserAccess (userId) {
  const { rows } = await db.query(
    `SELECT u.bx24_id, array_agg(r.nombre) AS roles
     FROM ${SCHEMA}.usuarios u
     LEFT JOIN ${SCHEMA}.usuario_rol ur ON ur.id_usuario = u.id
     LEFT JOIN ${SCHEMA}.roles r ON r.id = ur.id_rol
     WHERE u.id = $1
     GROUP BY u.bx24_id`,
    [userId]
  );
  if (!rows[0]) return null;
  const roles = Array.isArray(rows[0].roles) ? rows[0].roles : [];
  const isAdmin = roles.some((role) => role?.toUpperCase() === 'ADMIN');
  return { bx24_id: rows[0].bx24_id, roles, isAdmin };
}

async function fetchRecordById (recordId) {
  const { rows } = await db.query(`${RECORD_SELECT} WHERE c.id = $1`, [recordId]);
  return rows[0] ? mapRecordRow(rows[0]) : null;
}

async function buildDuplicateChecker (advisorId, candidates) {
  if (!candidates.length) {
    return () => null;
  }

  const rutList = Array.from(new Set(candidates.map((entry) => entry.payload.rut).filter(Boolean)));
  let existingRows = [];
  if (rutList.length) {
    const { rows } = await db.query(
      `SELECT rut_estudiante, matricula FROM ${SCHEMA}.comisiones WHERE id_asesor = $1 AND rut_estudiante = ANY($2)`,
      [advisorId, rutList]
    );
    existingRows = rows.map((row) => ({
      rut: sanitizeRut(row.rut_estudiante),
      matricula: row.matricula ? String(row.matricula).trim() : ''
    }));
  }

  const seenBatch = new Set();
  return (payload) => {
    if (!payload.rut) return null;
    const matriculaKey = payload.matricula !== undefined && payload.matricula !== null
      ? String(payload.matricula).trim()
      : '';
    const key = `${payload.rut}::${matriculaKey}`;
    if (seenBatch.has(key)) {
      return 'Registro duplicado dentro del archivo';
    }
    seenBatch.add(key);
    const duplicate = existingRows.some((row) => {
      if (row.rut !== payload.rut) return false;
      if (matriculaKey && row.matricula) {
        return row.matricula === matriculaKey;
      }
      return true;
    });
    return duplicate ? 'Registro duplicado: ya existe en la base de datos' : null;
  };
}

async function processBulkRows (userId, rawRows, { strict = false } = {}) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw buildBulkError('La plantilla está vacía.');
  }

  if (rawRows.length > MAX_BULK_ROWS) {
    throw buildBulkError(`Solo se permiten ${MAX_BULK_ROWS} filas por carga.`);
  }

  const advisorId = await getAdvisorBx24Id(userId);
  const programs = await getProgramsCatalog();
  const matcher = buildProgramMatcher(programs);

  const errors = [];
  const candidates = [];

  for (let index = 0; index < rawRows.length; index += 1) {
    const rawRow = rawRows[index];
    const prepared = prepareBulkRow(rawRow);
    if (!prepared) {
      continue;
    }

    const rowNumber = extractRowNumber(rawRow, index);
    const feedbackData = buildFeedbackData(prepared.mappedRow, rowNumber);

    if (prepared.errors.length) {
      errors.push({ ...feedbackData, messages: prepared.errors, errorCode: 'VALIDATION_ERROR' });
      continue;
    }

    candidates.push({ payload: prepared.payload, feedbackData });
  }

  const resolvedCandidates = [];

  candidates.forEach((candidate) => {
    const resolution = resolveProgramForPayload(candidate.payload, matcher);
    if (!resolution.program) {
      const message = resolution.errorCode === 'PROGRAM_NAME_REQUIRED'
        ? 'El nombre del programa es obligatorio'
        : 'Nombre de programa no reconocido';
      errors.push({
        ...candidate.feedbackData,
        messages: [message],
        errorCode: resolution.errorCode,
        suggestions: (resolution.suggestions || []).map((item) => item.nombre)
      });
      return;
    }

    candidate.payload.codPrograma = resolution.program.cod_programa;
    candidate.payload.nombrePrograma = resolution.program.nombre;
    resolvedCandidates.push(candidate);
  });

  const duplicateChecker = await buildDuplicateChecker(advisorId, resolvedCandidates);
  const readyForInsert = [];

  resolvedCandidates.forEach((candidate) => {
    const duplicateMessage = duplicateChecker(candidate.payload);
    if (duplicateMessage) {
      errors.push({
        ...candidate.feedbackData,
        messages: [duplicateMessage],
        errorCode: 'DUPLICATE_ENTRY'
      });
      return;
    }
    readyForInsert.push(candidate);
  });

  if (strict && errors.length) {
    throw buildManualBulkError(errors);
  }

  const inserted = [];
  for (const entry of readyForInsert) {
    try {
      const result = await createStudentWithProgram({
        ...entry.payload,
        asesorId: advisorId
      });
      const record = await fetchRecordById(result.commission.id);
      inserted.push(record ?? result.commission);
    } catch (error) {
      const entryError = {
        ...entry.feedbackData,
        messages: [error.message || 'No se pudo crear el registro']
      };
      if (strict) {
        throw buildManualBulkError([entryError]);
      }
      errors.push(entryError);
    }
  }

  return {
    inserted: inserted.length,
    failed: errors.length,
    errors,
    records: inserted
  };
}

// Obtiene las comisiones asociadas a un usuario autenticado (por id UUID)
export async function getRecordsForUser (userId) {
  const access = await fetchUserAccess(userId);
  if (!access) return [];
  const { bx24_id, isAdmin } = access;

  let rows;
  if (isAdmin) {
    ({ rows } = await db.query(`${RECORD_SELECT} ORDER BY c.fecha_matricula DESC`));
  } else {
    if (!bx24_id) return [];
    ({ rows } = await db.query(`${RECORD_SELECT} WHERE c.id_asesor = $1 ORDER BY c.fecha_matricula DESC`, [bx24_id]));
  }

  return rows.map(mapRecordRow);
}


// Puedes adaptar esta función según los campos de comisiones que quieras permitir crear
export async function createRecordForUser (userId, payload) {
  const bx24_id = await getAdvisorBx24Id(userId);

  const {
    rut,
    nombres,
    apellidos,
    correo,
    telefono,
    codPrograma,
    nombrePrograma,
    centroCostos,
    estadoPago,
    fechaMatricula,
    sede,
    valorComision,
    matricula,
    versionPrograma,
    comentarioAsesor
  } = payload;

  const valorComisionSeguro = valorComision ?? 0;

  const result = await createStudentWithProgram({
    rut,
    nombres,
    apellidos,
    correo,
    telefono,
    codPrograma,
    nombrePrograma,
    centroCostos,
    asesorId: bx24_id,
    estadoPago,
    fechaMatricula,
    sede,
    valorComision: valorComisionSeguro,
    matricula,
    versionPrograma,
    comentarioAsesor
  });

  const record = await fetchRecordById(result.commission.id);
  return record ?? result.commission;
}


// Actualiza una comisión solo si pertenece al usuario
export async function updateRecordForUser (userId, recordId, payload) {
  const { rows: userRows } = await db.query(`SELECT bx24_id FROM ${SCHEMA}.usuarios WHERE id = $1`, [userId]);
  if (!userRows[0] || !userRows[0].bx24_id) return null;
  const bx24_id = userRows[0].bx24_id;
  // Aquí deberías mapear los campos de payload a los de comisiones
  // Ejemplo mínimo:
  const campos = [];
  const valores = [];
  let idx = 1;
  for (const [k, v] of Object.entries(payload)) {
    campos.push(`${k} = $${idx++}`);
    valores.push(v);
  }
  valores.push(recordId);
  valores.push(bx24_id);
  const { rows } = await db.query(
    `UPDATE ${SCHEMA}.comisiones SET ${campos.join(', ')} WHERE id = $${idx++} AND id_asesor = $${idx} RETURNING *`,
    valores
  );
  return rows[0];
}


// Borra una comisión solo si pertenece al usuario
export async function deleteRecordForUser (userId, recordId) {
  const { rows: userRows } = await db.query(`SELECT bx24_id FROM ${SCHEMA}.usuarios WHERE id = $1`, [userId]);
  if (!userRows[0] || !userRows[0].bx24_id) return false;
  const bx24_id = userRows[0].bx24_id;
  const { rowCount } = await db.query(
    `DELETE FROM ${SCHEMA}.comisiones WHERE id = $1 AND id_asesor = $2`,
    [recordId, bx24_id]
  );
  return rowCount > 0;
}

export async function bulkCreateRecordsForUser (userId, file) {
  if (!file || !file.buffer) {
    throw buildBulkError('No se recibió un archivo válido.');
  }

  const allowedMimeTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  if (file.mimetype && !allowedMimeTypes.includes(file.mimetype)) {
    throw buildBulkError('Solo se permiten archivos .csv o .xlsx.');
  }

  let rows;
  try {
    rows = extractRowsFromBuffer(file.buffer);
  } catch (error) {
    throw buildBulkError('No se pudo leer el archivo. Asegúrate de que el formato sea válido.', error.message);
  }
  return processBulkRows(userId, rows);
}

export async function bulkCreateRecordsFromManualPayload (userId, rows) {
  if (!Array.isArray(rows)) {
    throw buildBulkError('Debes enviar un arreglo de filas.');
  }
  return processBulkRows(userId, rows, { strict: true });
}

export async function exportRecordForUser (userId, recordId) {
  const access = await fetchUserAccess(userId);
  if (!access) return null;
  const { bx24_id, isAdmin } = access;

  const params = [recordId];
  let query = `${RECORD_SELECT} WHERE c.id = $1`;
  if (!isAdmin) {
    if (!bx24_id) {
      return null;
    }
    params.push(bx24_id);
    query += ' AND c.id_asesor = $2';
  }

  const { rows } = await db.query(query, params);
  if (!rows[0]) {
    return null;
  }
  return mapRecordRow(rows[0]);
}

export async function getProgramsCatalog () {
  const { rows } = await db.query(
    `SELECT cod_programa, nombre, centro_de_costos
     FROM ${SCHEMA}.programas
     ORDER BY nombre`
  );
  return rows;
}
