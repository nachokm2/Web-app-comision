const CSV_FIELD_MAP = [
  { key: 'id', label: 'ID' },
  { key: 'rut_estudiante', label: 'RUT' },
  { key: 'title', label: 'Estudiante' },
  { key: 'category', label: 'Programa' },
  { key: 'cod_programa', label: 'Código programa' },
  { key: 'version_programa', label: 'Versión' },
  { key: 'matricula', label: 'Matrícula' },
  { key: 'amount', label: 'Valor comisión' },
  { key: 'status', label: 'Estado resumen' },
  { key: 'estado_pago', label: 'Estado de pago' },
  { key: 'fecha_matricula', label: 'Fecha matrícula' },
  { key: 'created_at', label: 'Fecha registro' },
  { key: 'asesor', label: 'Asesor asignado' },
  { key: 'comentario_asesor', label: 'Comentario asesor' }
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

function buildCsvFromRecords (records = []) {
  const header = CSV_FIELD_MAP.map((field) => field.label).join(',');
  if (!records.length) {
    return `${header}\n`;
  }
  const rows = records.map((record) =>
    CSV_FIELD_MAP.map((field) => toCsvValue(record[field.key], field.key)).join(',')
  );
  return `${header}\n${rows.join('\n')}\n`;
}

function slugify (value = '') {
  return value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'todos';
}

export { CSV_FIELD_MAP, buildCsvFromRecords, slugify };
