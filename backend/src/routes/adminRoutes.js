import { Router } from 'express';
import { body, param } from 'express-validator';
import { getSchemaSnapshot, createStudentEntry, updateStudentEntry, deleteStudentEntry, listAllComisiones } from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import validateRequest from '../utils/validateRequest.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));
router.get('/schema', getSchemaSnapshot);
router.get('/comisiones', listAllComisiones);
router.post(
	'/students',
	[
		body('rut')
			.trim()
			.notEmpty().withMessage('El RUT es obligatorio')
			.isLength({ max: 12 }).withMessage('El RUT debe tener como máximo 12 caracteres'),
		body('nombres')
			.trim()
			.notEmpty().withMessage('Los nombres son obligatorios')
			.isLength({ max: 60 }).withMessage('Los nombres superan el largo permitido (60)'),
		body('apellidos')
			.trim()
			.notEmpty().withMessage('Los apellidos son obligatorios')
			.isLength({ max: 60 }).withMessage('Los apellidos superan el largo permitido (60)'),
		body('codPrograma')
			.trim()
			.notEmpty().withMessage('Se requiere el código del programa')
			.isLength({ max: 12 }).withMessage('El código de programa debe tener máximo 12 caracteres'),
		body('nombrePrograma')
			.trim()
			.notEmpty().withMessage('Se requiere el nombre del programa')
			.isLength({ max: 120 }).withMessage('El nombre del programa supera el largo permitido (120)'),
		body('correo')
			.optional()
			.trim()
			.isEmail().withMessage('Correo inválido'),
		body('telefono')
			.optional()
			.trim()
			.isLength({ max: 12 }).withMessage('El teléfono debe tener máximo 12 caracteres'),
		body('centroCostos')
			.optional()
			.trim()
			.isLength({ max: 30 }).withMessage('El centro de costos supera el largo permitido (30)'),
		body('asesorId')
			.notEmpty().withMessage('Debes seleccionar un asesor')
			.isInt({ min: 1 }).withMessage('El asesor es inválido'),
		body('estadoPago')
			.optional()
			.trim()
			.isLength({ max: 30 }).withMessage('El estado de pago supera el largo permitido (30)'),
		body('fechaMatricula')
			.optional()
			.isISO8601().withMessage('La fecha de matrícula es inválida'),
		body('sede')
			.optional()
			.trim()
			.isLength({ max: 60 }).withMessage('La sede supera el largo permitido (60)'),
		body('valorComision')
			.optional()
			.isFloat({ min: 0 }).withMessage('El valor de comisión debe ser numérico'),
		body('matricula')
			.optional()
			.isFloat({ min: 0 }).withMessage('La matrícula debe ser numérica'),
		body('versionPrograma')
			.optional()
			.trim()
			.isLength({ max: 30 }).withMessage('La versión del programa supera el largo permitido (30)')
	],
	validateRequest,
	createStudentEntry
);

router.put(
	'/students/:id',
	[
		param('id').isInt({ min: 1 }).withMessage('El identificador de la comisión es inválido'),
		body('rut')
			.optional()
			.trim()
			.isLength({ max: 12 }).withMessage('El RUT debe tener como máximo 12 caracteres'),
		body('nombres')
			.optional()
			.trim()
			.isLength({ max: 60 }).withMessage('Los nombres superan el largo permitido (60)'),
		body('apellidos')
			.optional()
			.trim()
			.isLength({ max: 60 }).withMessage('Los apellidos superan el largo permitido (60)'),
		body('codPrograma')
			.optional()
			.trim()
			.isLength({ max: 12 }).withMessage('El código de programa debe tener máximo 12 caracteres'),
		body('nombrePrograma')
			.optional()
			.trim()
			.isLength({ max: 120 }).withMessage('El nombre del programa supera el largo permitido (120)'),
		body('correo')
			.optional()
			.trim()
			.isEmail().withMessage('Correo inválido'),
		body('telefono')
			.optional()
			.trim()
			.isLength({ max: 12 }).withMessage('El teléfono debe tener máximo 12 caracteres'),
		body('centroCostos')
			.optional()
			.trim()
			.isLength({ max: 30 }).withMessage('El centro de costos supera el largo permitido (30)'),
		body('asesorId')
			.optional()
			.isInt({ min: 1 }).withMessage('El asesor es inválido'),
		body('estadoPago')
			.optional()
			.trim()
			.isLength({ max: 30 }).withMessage('El estado de pago supera el largo permitido (30)'),
		body('fechaMatricula')
			.optional()
			.isISO8601().withMessage('La fecha de matrícula es inválida'),
		body('sede')
			.optional()
			.trim()
			.isLength({ max: 60 }).withMessage('La sede supera el largo permitido (60)'),
		body('valorComision')
			.optional()
			.isFloat({ min: 0 }).withMessage('El valor de comisión debe ser numérico'),
		body('matricula')
			.optional()
			.isFloat({ min: 0 }).withMessage('La matrícula debe ser numérica'),
		body('versionPrograma')
			.optional()
			.trim()
			.isLength({ max: 30 }).withMessage('La versión del programa supera el largo permitido (30)')
	],
	validateRequest,
	updateStudentEntry
);

router.delete(
	'/students/:id',
	[param('id').isInt({ min: 1 }).withMessage('El identificador de la comisión es inválido')],
	validateRequest,
	deleteStudentEntry
);

export default router;
