import { getAllTableData, getCasesByAdvisor, getStudentEntries } from '../services/schemaService.js';
import { createStudentWithProgram, updateStudentCommissionEntry, deleteCommissionEntry } from '../services/studentService.js';
import db from '../db/pool.js';

function toNullable (value) {
  return value === undefined || value === null || value === '' ? undefined : value;
}

function toNumberOrUndefined (value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export async function getSchemaSnapshot (req, res) {
  // Schema snapshot deshabilitado temporalmente (legacy_asesor_id/is_asesor no existen)
  // Solo devuelvo estructura básica
  const tables = await getAllTableData();
  res.json({ tables, casesByAdvisor: [], studentEntries: [] });
}

export async function createStudentEntry (req, res) {
  try {
    const result = await createStudentWithProgram({
      rut: req.body.rut,
      nombres: req.body.nombres,
      apellidos: req.body.apellidos,
      correo: toNullable(req.body.correo),
      telefono: toNullable(req.body.telefono),
      codPrograma: req.body.codPrograma,
      nombrePrograma: req.body.nombrePrograma,
      centroCostos: toNullable(req.body.centroCostos),
      asesorId: Number(req.body.asesorId),
      estadoPago: toNullable(req.body.estadoPago),
      fechaMatricula: toNullable(req.body.fechaMatricula),
      sede: toNullable(req.body.sede),
      valorComision: toNumberOrUndefined(req.body.valorComision),
      matricula: toNumberOrUndefined(req.body.matricula),
      versionPrograma: toNullable(req.body.versionPrograma)
    });

    res.status(201).json({
      message: 'Estudiante registrado correctamente',
      student: result.student,
      program: result.program,
      commission: result.commission
    });
  } catch (error) {
    if (error.code === '22001') {
      return res.status(400).json({ message: 'Revisa los largos máximos: RUT/telefono 12, correo 30, centro de costos 30, código 12, nombres 60, programa 120.' });
    }
    throw error;
  }
}

export async function updateStudentEntry (req, res) {
  try {
    const comisionId = Number(req.params.id);
    const result = await updateStudentCommissionEntry(comisionId, {
      rut: toNullable(req.body.rut),
      nombres: toNullable(req.body.nombres),
      apellidos: toNullable(req.body.apellidos),
      correo: toNullable(req.body.correo),
      telefono: toNullable(req.body.telefono),
      codPrograma: toNullable(req.body.codPrograma),
      nombrePrograma: toNullable(req.body.nombrePrograma),
      centroCostos: toNullable(req.body.centroCostos),
      asesorId: toNumberOrUndefined(req.body.asesorId),
      estadoPago: toNullable(req.body.estadoPago),
      fechaMatricula: toNullable(req.body.fechaMatricula),
      sede: toNullable(req.body.sede),
      valorComision: toNumberOrUndefined(req.body.valorComision),
      matricula: toNumberOrUndefined(req.body.matricula),
      versionPrograma: toNullable(req.body.versionPrograma)
    });

    res.json({
      message: 'Registro actualizado correctamente',
      student: result.student,
      program: result.program,
      commission: result.commission
    });
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({ message: 'No encontramos la comisión solicitada' });
    }
    if (error.code === '22001') {
      return res.status(400).json({ message: 'Revisa los largos máximos: RUT/telefono 12, correo 30, centro de costos 30, código 12, nombres 60, programa 120.' });
    }
    throw error;
  }
}

export async function deleteStudentEntry (req, res) {
  try {
    const comisionId = Number(req.params.id);
    const deleted = await deleteCommissionEntry(comisionId);
    if (!deleted) {
      return res.status(404).json({ message: 'No encontramos la comisión solicitada' });
    }
    res.json({ message: 'Registro eliminado correctamente' });
  } catch (error) {
    throw error;
  }
}

// Lista todas las comisiones enriquecidas (solo admin)
export async function listAllComisiones (req, res) {
  const baseQuery = `
    SELECT c.id,
           COALESCE(NULLIF(TRIM(CONCAT(e.nombres, ' ', e.apellidos)), ''), e.nombres, c.cod_programa) AS title,
           COALESCE(p.nombre, c.cod_programa) AS category,
           c.valor_comision AS amount,
           COALESCE(c.estado_de_pago::text, 'pending') AS status,
           c.fecha_matricula AS created_at,
           c.rut_estudiante,
           c.cod_programa,
           c.version_programa,
           u.nombre_completo AS asesor
    FROM comisiones c
    LEFT JOIN estudiantes e ON c.rut_estudiante = e.rut
    LEFT JOIN usuarios u ON c.id_asesor = u.bx24_id
    LEFT JOIN programas p ON c.cod_programa = p.cod_programa
    ORDER BY c.fecha_matricula DESC
  `;
  const { rows } = await db.query(baseQuery);
  const records = rows.map((r) => ({
    id: r.id,
    title: r.title || 'Sin título',
    category: r.category || 'Sin categoría',
    amount: Number(r.amount) || 0,
    status: r.status?.toLowerCase() || 'pending',
    created_at: r.created_at,
    rut_estudiante: r.rut_estudiante,
    cod_programa: r.cod_programa,
    version_programa: r.version_programa,
    asesor: r.asesor
  }));
  res.json({ records });
}
