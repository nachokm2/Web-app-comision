import {
  getRecordsForUser,
  createRecordForUser,
  updateRecordForUser,
  deleteRecordForUser,
  getProgramsCatalog,
  bulkCreateRecordsForUser,
  exportRecordForUser
} from '../services/recordService.js';

const CSV_FIELD_MAP = [
  { key: 'rut_estudiante', label: 'RUT' },
  { key: 'estudiante_nombres', label: 'Nombres' },
  { key: 'estudiante_apellidos', label: 'Apellidos' },
  { key: 'estudiante_correo', label: 'Correo' },
  { key: 'estudiante_telefono', label: 'Teléfono' },
  { key: 'cod_programa', label: 'Código programa' },
  { key: 'category', label: 'Nombre programa' },
  { key: 'version_programa', label: 'Versión' },
  { key: 'matricula', label: 'Matrícula' },
  { key: 'amount', label: 'Valor comisión' },
  { key: 'estado_pago', label: 'Estado de pago' },
  { key: 'status', label: 'Estado resumen' },
  { key: 'fecha_matricula', label: 'Fecha matrícula' },
  { key: 'created_at', label: 'Fecha registro' },
  { key: 'sede', label: 'Sede' },
  { key: 'comentario_asesor', label: 'Comentario asesor' },
  { key: 'asesor', label: 'Asesor asignado' }
];

function normalizeDateValue (value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().split('T')[0];
}

function toCsvValue (value, fieldKey) {
  if (['fecha_matricula', 'created_at'].includes(fieldKey)) {
    value = normalizeDateValue(value);
  } else if (value instanceof Date) {
    value = value.toISOString();
  } else if (typeof value === 'number') {
    value = value.toString();
  } else if (value === undefined || value === null) {
    value = '';
  }
  const escaped = String(value).replace(/"/g, '""');
  return `"${escaped}"`;
}

function buildRecordCsv (record) {
  const header = CSV_FIELD_MAP.map((field) => field.label).join(',');
  const row = CSV_FIELD_MAP
    .map((field) => toCsvValue(record[field.key], field.key))
    .join(',');
  return `${header}\n${row}\n`;
}

export async function listRecords (req, res) {
  const records = await getRecordsForUser(req.user.id);
  res.json({ records });
}

export async function createRecord (req, res) {
  const record = await createRecordForUser(req.user.id, req.body);
  res.status(201).json({ record });
}

export async function updateRecord (req, res) {
  const { recordId } = req.params;
  const record = await updateRecordForUser(req.user.id, recordId, req.body);
  if (!record) {
    return res.status(404).json({ message: 'Registro no encontrado' });
  }
  res.json({ record });
}

export async function deleteRecord (req, res) {
  const { recordId } = req.params;
  const deleted = await deleteRecordForUser(req.user.id, recordId);
  if (!deleted) {
    return res.status(404).json({ message: 'Registro no encontrado' });
  }
  res.status(204).send();
}

export async function listPrograms (req, res) {
  const programs = await getProgramsCatalog();
  res.json({ programs });
}

export async function bulkCreateRecords (req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Debes adjuntar un archivo .csv o .xlsx.' });
  }
  try {
    const result = await bulkCreateRecordsForUser(req.user.id, req.file);
    res.status(201).json(result);
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ message: error.message || 'No se pudo procesar el archivo', detail: error.detail });
  }
}

export async function exportRecord (req, res) {
  const { recordId } = req.params;
  const record = await exportRecordForUser(req.user.id, recordId);
  if (!record) {
    return res.status(404).json({ message: 'Registro no encontrado' });
  }
  const csv = buildRecordCsv(record);
  const safeRut = (record.rut_estudiante || `registro-${record.id}`).replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `comision-${safeRut || record.id}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}
