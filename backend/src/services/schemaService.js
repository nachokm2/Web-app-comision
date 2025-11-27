import db from '../db/pool.js';

const SCHEMA = 'comision_ua';
const schemaRef = `"${SCHEMA}"`;
const EXCLUDED_TABLES = new Set(['users']);
const SAFE_IDENTIFIER = /^[a-zA-Z0-9_]+$/;


function quoteIdentifier (identifier) {
  if (!SAFE_IDENTIFIER.test(identifier)) {
    throw new Error(`Identificador inválido: ${identifier}`);
  }
  return `"${identifier}"`;
}

export async function getSchemaTables () {
  const { rows } = await db.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    [SCHEMA]
  );
  return rows
    .map((row) => row.table_name)
    .filter((name) => !EXCLUDED_TABLES.has(name));
}

export async function getAllTableData () {
  const tables = await getSchemaTables();
  const entries = await Promise.all(
    tables.map(async (tableName) => {
      const safeName = quoteIdentifier(tableName);
      const { rows } = await db.query(`SELECT * FROM ${schemaRef}.${safeName}`);
      return [tableName, rows];
    })
  );
  const data = Object.fromEntries(entries);
  data.asesores = await getAdvisorDirectory();
  return data;
}

async function getAdvisorDirectory () {
  const { rows } = await db.query(`
    SELECT
      legacy_asesor_id AS id,
      nombre_completo,
      correo_institucional AS correo,
      correo_personal,
      telefono,
      rut,
      sede
    FROM ${schemaRef}."users"
    WHERE is_asesor = TRUE AND legacy_asesor_id IS NOT NULL
    ORDER BY nombre_completo
  `);
  return rows;
}

export async function getCasesByAdvisor () {
  const { rows } = await db.query(`
    WITH casos AS (
      SELECT
        c.id,
        c.id_asesor,
        c.valor_comision,
        c.matricula,
        c.estado_de_pago,
        c.version_programa,
        c.fecha_matricula,
        c.sede,
        e.nombres || ' ' || e.apellidos AS estudiante,
        c.rut_estudiante,
        p.nombre AS programa,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT cat.nombre_del_caso), NULL) AS categorias
      FROM ${schemaRef}."comisiones" c
      LEFT JOIN ${schemaRef}."estudiantes" e ON e.rut = c.rut_estudiante
      LEFT JOIN ${schemaRef}."programas" p ON p.cod_banner = c.cod_programa
      LEFT JOIN ${schemaRef}."categoria_comision" cc ON cc.id_comision = c.id
      LEFT JOIN ${schemaRef}."categorias" cat ON cat.id = cc.id_categoria
      GROUP BY c.id, c.id_asesor, c.valor_comision, c.matricula, c.estado_de_pago, c.version_programa,
        c.fecha_matricula, c.sede, e.nombres, e.apellidos, c.rut_estudiante, p.nombre
    )
    SELECT
      a.legacy_asesor_id AS asesor_id,
      a.nombre_completo,
      a.correo_institucional AS correo,
      a.sede,
      a.correo_personal,
      a.telefono,
      a.rut,
      COUNT(casos.id) AS total_casos,
      COALESCE(SUM(casos.valor_comision), 0) AS total_valor_comision,
      COALESCE(SUM(casos.matricula), 0) AS total_matricula,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'comision_id', casos.id,
            'estado_pago', casos.estado_de_pago,
            'valor_comision', casos.valor_comision,
            'programa', casos.programa,
            'version_programa', casos.version_programa,
            'categorias', casos.categorias,
            'estudiante', casos.estudiante,
            'rut_estudiante', casos.rut_estudiante,
            'fecha_matricula', casos.fecha_matricula,
            'sede', casos.sede
          ) ORDER BY casos.fecha_matricula DESC
        ) FILTER (WHERE casos.id IS NOT NULL),
        '[]'::json
      ) AS casos
    FROM ${schemaRef}."users" a
    LEFT JOIN casos ON casos.id_asesor = a.legacy_asesor_id
    WHERE a.is_asesor = TRUE AND a.legacy_asesor_id IS NOT NULL
    GROUP BY a.id, a.legacy_asesor_id, a.nombre_completo, a.correo_institucional, a.sede, a.correo_personal, a.telefono, a.rut
    ORDER BY COUNT(casos.id) DESC, a.nombre_completo
  `);

  return rows.map((row) => ({
    asesor_id: row.asesor_id,
    nombre_completo: row.nombre_completo,
    correo: row.correo,
    institucion: row.sede,
    sede: row.sede,
    correo_personal: row.correo_personal,
    telefono: row.telefono,
    rut: row.rut,
    total_casos: Number(row.total_casos) || 0,
    total_valor_comision: Number(row.total_valor_comision) || 0,
    total_matricula: Number(row.total_matricula) || 0,
    casos: Array.isArray(row.casos) ? row.casos : JSON.parse(row.casos || '[]')
  }));
}

export async function getStudentEntries () {
  const { rows } = await db.query(`
    SELECT
      e.rut,
      e.nombres,
      e.apellidos,
      e.correo AS correo_estudiante,
      e.telefono,
      c.id AS comision_id,
      c.estado_de_pago,
      c.fecha_matricula,
      c.sede,
      c.valor_comision,
      c.matricula,
      c.id_asesor AS asesor_id,
      a.nombre_completo AS asesor_nombre,
      a.correo_institucional AS asesor_correo,
      p.cod_banner,
      p.nombre AS programa_nombre,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT cat.nombre_del_caso), NULL) AS categorias
    FROM ${schemaRef}."estudiantes" e
    LEFT JOIN ${schemaRef}."comisiones" c ON c.rut_estudiante = e.rut
    LEFT JOIN ${schemaRef}."users" a ON a.legacy_asesor_id = c.id_asesor AND a.is_asesor = TRUE
    LEFT JOIN ${schemaRef}."programas" p ON p.cod_banner = c.cod_programa
    LEFT JOIN ${schemaRef}."categoria_comision" cc ON cc.id_comision = c.id
    LEFT JOIN ${schemaRef}."categorias" cat ON cat.id = cc.id_categoria
    GROUP BY e.rut, e.nombres, e.apellidos, e.correo, e.telefono,
      c.id, c.estado_de_pago, c.fecha_matricula, c.sede, c.valor_comision, c.matricula,
      c.id_asesor, a.nombre_completo, a.correo_institucional,
      p.cod_banner, p.nombre
    ORDER BY COALESCE(c.fecha_matricula, DATE '1900-01-01') DESC, e.apellidos, e.nombres
  `);

  return rows.map((row) => ({
    rut: row.rut,
    nombres: row.nombres,
    apellidos: row.apellidos,
    correo: row.correo_estudiante,
    telefono: row.telefono,
    comision_id: row.comision_id,
    estado_pago: row.estado_de_pago,
    fecha_matricula: row.fecha_matricula,
    sede: row.sede,
    valor_comision: row.valor_comision ? Number(row.valor_comision) : null,
    matricula: row.matricula ? Number(row.matricula) : null,
    asesor_id: row.asesor_id,
    asesor_nombre: row.asesor_nombre,
    asesor_correo: row.asesor_correo,
    cod_programa: row.cod_banner,
    programa_nombre: row.programa_nombre,
    categorias: Array.isArray(row.categorias) ? row.categorias : []
  }));
}
