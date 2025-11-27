import db from '../db/pool.js';

const SCHEMA = 'comision_ua';
const schemaRef = `"${SCHEMA}"`;

export async function createStudentWithProgram ({
  rut,
  nombres,
  apellidos,
  correo,
  telefono,
  codPrograma,
  nombrePrograma,
  centroCostos
}) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const programResult = await client.query(
      `INSERT INTO ${schemaRef}."programas" (cod_banner, nombre, centro_de_costos)
       VALUES ($1, $2, $3)
       ON CONFLICT (cod_banner) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         centro_de_costos = COALESCE(EXCLUDED.centro_de_costos, ${schemaRef}."programas".centro_de_costos)
       RETURNING cod_banner, nombre, centro_de_costos`,
      [codPrograma, nombrePrograma, centroCostos ?? null]
    );

    const studentResult = await client.query(
      `INSERT INTO ${schemaRef}."estudiantes" (rut, nombres, apellidos, correo, telefono)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (rut) DO UPDATE SET
         nombres = EXCLUDED.nombres,
         apellidos = EXCLUDED.apellidos,
         correo = COALESCE(EXCLUDED.correo, ${schemaRef}."estudiantes".correo),
         telefono = COALESCE(EXCLUDED.telefono, ${schemaRef}."estudiantes".telefono)
       RETURNING rut, nombres, apellidos, correo, telefono`,
      [rut, nombres, apellidos, correo ?? null, telefono ?? null]
    );

    await client.query('COMMIT');

    return {
      student: studentResult.rows[0],
      program: programResult.rows[0]
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
