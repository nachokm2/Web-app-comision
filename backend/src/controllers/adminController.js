import { getAllTableData, getCasesByAdvisor, getStudentEntries } from '../services/schemaService.js';
import { createStudentWithProgram } from '../services/studentService.js';

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
      correo: req.body.correo,
      telefono: req.body.telefono,
      codPrograma: req.body.codPrograma,
      nombrePrograma: req.body.nombrePrograma,
      centroCostos: req.body.centroCostos
    });

    res.status(201).json({
      message: 'Estudiante registrado correctamente',
      student: result.student,
      program: result.program
    });
  } catch (error) {
    if (error.code === '22001') {
      return res.status(400).json({ message: 'Revisa los largos máximos: RUT/telefono 12, correo 30, centro de costos 30, código 12, nombres 60, programa 120.' });
    }
    throw error;
  }
}
