import { Router } from 'express';
import { body } from 'express-validator';
import { getSchemaSnapshot, createStudentEntry } from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import validateRequest from '../utils/validateRequest.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));
router.get('/schema', getSchemaSnapshot);
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
			.isLength({ max: 30 }).withMessage('El centro de costos supera el largo permitido (30)')
	],
	validateRequest,
	createStudentEntry
);

export default router;
