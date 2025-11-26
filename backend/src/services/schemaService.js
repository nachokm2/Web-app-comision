import db from '../db/pool.js';

const SCHEMA = 'comision_ua';
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
  const schemaRef = `"${SCHEMA}"`;
  const entries = await Promise.all(
    tables.map(async (tableName) => {
      const safeName = quoteIdentifier(tableName);
      const { rows } = await db.query(`SELECT * FROM ${schemaRef}.${safeName}`);
      return [tableName, rows];
    })
  );
  return Object.fromEntries(entries);
}

export async function getCasesByAdvisor () {
  const schemaRef = `"${SCHEMA}"`;
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
      a.id AS asesor_id,
      a.nombre_completo,
      a.correo,
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
    FROM ${schemaRef}."asesores" a
    LEFT JOIN casos ON casos.id_asesor = a.id
    GROUP BY a.id
    ORDER BY COUNT(casos.id) DESC, a.nombre_completo
  `);

  return rows.map((row) => ({
    asesor_id: row.asesor_id,
    nombre_completo: row.nombre_completo,
    correo: row.correo,
    total_casos: Number(row.total_casos) || 0,
    total_valor_comision: Number(row.total_valor_comision) || 0,
    total_matricula: Number(row.total_matricula) || 0,
    casos: Array.isArray(row.casos) ? row.casos : JSON.parse(row.casos || '[]')
  }));
}
