import { getAllTableData, getCasesByAdvisor, getStudentEntries } from '../services/schemaService.js';
import { createStudentWithProgram, updateStudentCommissionEntry, deleteCommissionEntry } from '../services/studentService.js';

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
  const [tables, casesByAdvisor, studentEntries] = await Promise.all([
    getAllTableData(),
    getCasesByAdvisor(),
    getStudentEntries()
  ]);

  res.json({ tables, casesByAdvisor, studentEntries });
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
      message: 'Estudiante registrado correctamente%',
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
      message: 'Registro actualizado correctamente%',
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
