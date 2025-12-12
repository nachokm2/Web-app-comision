import db from '../db/pool.js';

const SCHEMA = 'comision_ua';
const schemaRef = `"${SCHEMA}"`;

function toNullableNumber (value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

async function upsertProgram (client, { codPrograma, nombrePrograma, centroCostos }) {
  if (!codPrograma) {
    throw new Error('El código de programa es obligatorio');
  }
  const { rows } = await client.query(
    `INSERT INTO ${schemaRef}."programas" (cod_programa, nombre, centro_de_costos)
     VALUES ($1, $2, $3)
     ON CONFLICT (cod_programa) DO UPDATE SET
       nombre = EXCLUDED.nombre,
       centro_de_costos = COALESCE(EXCLUDED.centro_de_costos, ${schemaRef}."programas".centro_de_costos)
     RETURNING cod_programa, nombre, centro_de_costos`,
    [codPrograma, nombrePrograma, centroCostos ?? null]
  );
  return rows[0];
}

async function upsertStudent (client, { rut, nombres, apellidos, correo, telefono }) {
  if (!rut) {
    throw new Error('El RUT del estudiante es obligatorio');
  }
  const { rows } = await client.query(
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
  return rows[0];
}

async function insertCommission (client, {
  rut,
  codPrograma,
  asesorId,
  estadoPago,
  fechaMatricula,
  sede,
  valorComision,
  matricula,
  versionPrograma,
  comentarioAsesor
}) {
  if (!asesorId) {
    throw new Error('El ID del asesor es obligatorio');
  }
  const { rows } = await client.query(
    `INSERT INTO ${schemaRef}."comisiones" (
       rut_estudiante,
       cod_programa,
       id_asesor,
       estado_de_pago,
       fecha_matricula,
       sede,
       valor_comision,
       matricula,
       version_programa,
       comentario_asesor
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, rut_estudiante, cod_programa, id_asesor, estado_de_pago, fecha_matricula, sede, valor_comision, matricula, version_programa, comentario_asesor`,
    [
      rut,
      codPrograma,
      asesorId,
      estadoPago ?? null,
      fechaMatricula ?? null,
      sede ?? null,
      toNullableNumber(valorComision),
      toNullableNumber(matricula),
      versionPrograma ?? null,
      comentarioAsesor ?? null
    ]
  );
  return rows[0];
}

function buildNotFoundError () {
  const error = new Error('Comisión no encontrada');
  error.code = 'NOT_FOUND';
  return error;
}

export async function createStudentWithProgram ({
  rut,
  nombres,
  apellidos,
  correo,
  telefono,
  codPrograma,
  nombrePrograma,
  centroCostos,
  asesorId,
  estadoPago,
  fechaMatricula,
  sede,
  valorComision,
  matricula,
  versionPrograma,
  comentarioAsesor
}) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const program = await upsertProgram(client, { codPrograma, nombrePrograma, centroCostos });
    const student = await upsertStudent(client, { rut, nombres, apellidos, correo, telefono });
    const commission = await insertCommission(client, {
      rut: student.rut,
      codPrograma: program.cod_programa,
      asesorId,
      estadoPago,
      fechaMatricula,
      sede,
      valorComision,
      matricula,
      versionPrograma,
      comentarioAsesor
    });

    await client.query('COMMIT');

    return { student, program, commission };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateStudentCommissionEntry (comisionId, {
  rut,
  nombres,
  apellidos,
  correo,
  telefono,
  codPrograma,
  nombrePrograma,
  centroCostos,
  asesorId,
  estadoPago,
  fechaMatricula,
  sede,
  valorComision,
  matricula,
  versionPrograma
}) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    let program;
    if (codPrograma && nombrePrograma) {
      program = await upsertProgram(client, { codPrograma, nombrePrograma, centroCostos });
    }

    let student;
    if (rut) {
      student = await upsertStudent(client, { rut, nombres, apellidos, correo, telefono });
    }

    const fields = [];
    const values = [];
    let index = 1;
    const pushField = (column, value, transform = (val) => val ?? null) => {
      if (value === undefined) return;
      fields.push(`${column} = $${index}`);
      values.push(transform(value));
      index += 1;
    };

    pushField('rut_estudiante', rut);
    pushField('cod_programa', codPrograma);
    pushField('id_asesor', asesorId, (val) => val);
    pushField('estado_de_pago', estadoPago);
    pushField('fecha_matricula', fechaMatricula);
    pushField('sede', sede);
    pushField('valor_comision', valorComision, toNullableNumber);
    pushField('matricula', matricula, toNullableNumber);
    pushField('version_programa', versionPrograma);

    let commission;
    if (fields.length > 0) {
      values.push(comisionId);
      const { rows } = await client.query(
        `UPDATE ${schemaRef}."comisiones"
         SET ${fields.join(', ')}
         WHERE id = $${index}
         RETURNING id, rut_estudiante, cod_programa, id_asesor, estado_de_pago, fecha_matricula, sede, valor_comision, matricula, version_programa`,
        values
      );
      if (rows.length === 0) {
        throw buildNotFoundError();
      }
      commission = rows[0];
    } else {
      const { rows } = await client.query(
        `SELECT id, rut_estudiante, cod_programa, id_asesor, estado_de_pago, fecha_matricula, sede, valor_comision, matricula, version_programa
         FROM ${schemaRef}."comisiones"
         WHERE id = $1`,
        [comisionId]
      );
      if (rows.length === 0) {
        throw buildNotFoundError();
      }
      commission = rows[0];
    }

    await client.query('COMMIT');

    return { student, program, commission };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteCommissionEntry (comisionId) {
  const { rowCount } = await db.query(
    `DELETE FROM ${schemaRef}."comisiones" WHERE id = $1`,
    [comisionId]
  );
  return rowCount > 0;
}
