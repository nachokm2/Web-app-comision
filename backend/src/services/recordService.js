import XLSX from 'xlsx';
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
  matricula: 'matricula',
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
  { key: 'codPrograma', label: 'Código de programa' },
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

function prepareBulkRow (rawRow) {
  const mappedRow = mapBulkRow(rawRow);
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
    valorComision: 0,
    matricula: matriculaNumber,
    versionPrograma: mappedRow.versionPrograma ? String(mappedRow.versionPrograma) : '1',
    comentarioAsesor: mappedRow.comentarioAsesor || undefined
  };

  return { payload, errors };
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

  const advisorId = await getAdvisorBx24Id(userId);

  let rows;
  try {
    rows = extractRowsFromBuffer(file.buffer);
  } catch (error) {
    throw buildBulkError('No se pudo leer el archivo. Asegúrate de que el formato sea válido.', error.message);
  }

  if (!rows.length) {
    throw buildBulkError('La plantilla está vacía.');
  }

  if (rows.length > MAX_BULK_ROWS) {
    throw buildBulkError(`Solo se permiten ${MAX_BULK_ROWS} filas por carga.`);
  }

  // NUEVO: Validar duplicados en base de datos antes de insertar
  // 1. Obtener todos los RUT y matrícula de los registros a cargar
  const bulkRutMatricula = rows.map((rawRow) => {
    const mapped = mapBulkRow(rawRow);
    return {
      rut: mapped.rut ? sanitizeRut(mapped.rut) : null,
      matricula: mapped.matricula ? String(mapped.matricula).trim() : null
    };
  }).filter(r => r.rut);

  // 2. Consultar en la base de datos los registros existentes para ese asesor
  const rutList = bulkRutMatricula.map(r => r.rut);
  const matriculaList = bulkRutMatricula.map(r => r.matricula).filter(Boolean);
  let existingRows = [];
  if (rutList.length) {
    const { rows: dbRows } = await db.query(
      `SELECT rut_estudiante, matricula FROM ${SCHEMA}.comisiones WHERE id_asesor = $1 AND rut_estudiante = ANY($2)`,
      [advisorId, rutList]
    );
    existingRows = dbRows.map(r => ({
      rut: sanitizeRut(r.rut_estudiante),
      matricula: r.matricula ? String(r.matricula).trim() : null
    }));
  }

  // 3. Filtrar los que ya existen (por rut y matrícula si está presente)
  function isDuplicate(row) {
    return existingRows.some(dbRow => {
      if (row.rut !== dbRow.rut) return false;
      // Si matrícula está presente, comparar también
      if (row.matricula && dbRow.matricula) {
        return row.matricula === dbRow.matricula;
      }
      return true;
    });
  }

  const inserted = [];
  const errors = [];

  for (let index = 0; index < rows.length; index += 1) {
    const rawRow = rows[index];
    const rowNumber = typeof rawRow.__rowNum__ === 'number' ? rawRow.__rowNum__ + 1 : index + 2;
    const prepared = prepareBulkRow(rawRow);
    if (!prepared) {
      continue;
    }

    // Copia los datos originales para feedback (usar los datos originales del archivo, no el payload)
    const mappedRow = mapBulkRow(rawRow);
    const feedbackData = {
      row: rowNumber,
      rut: mappedRow.rut || '',
      nombres: mappedRow.nombres || '',
      apellidos: mappedRow.apellidos || '',
      correo: mappedRow.correo || '',
      codPrograma: mappedRow.codPrograma || '',
      nombrePrograma: mappedRow.nombrePrograma || '',
      matricula: mappedRow.matricula || '',
      sede: mappedRow.sede || '',
      versionPrograma: mappedRow.versionPrograma || '',
    };

    if (prepared.errors.length > 0) {
      errors.push({ ...feedbackData, messages: prepared.errors });
      continue;
    }

    // Validación de duplicados
    const rut = prepared.payload.rut;
    const matricula = prepared.payload.matricula ? String(prepared.payload.matricula).trim() : null;
    if (isDuplicate({ rut, matricula })) {
      errors.push({ ...feedbackData, messages: ['Registro duplicado: ya existe en la base de datos'] });
      continue;
    }

    try {
      const result = await createStudentWithProgram({
        ...prepared.payload,
        asesorId: advisorId
      });
      const record = await fetchRecordById(result.commission.id);
      if (record) {
        inserted.push(record);
      }
    } catch (error) {
      errors.push({ ...feedbackData, messages: [error.message || 'No se pudo crear el registro'] });
    }
  }

  return {
    inserted: inserted.length,
    failed: errors.length,
    errors,
    records: inserted
  };
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
