import { Router } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import { listRecords, createRecord, updateRecord, deleteRecord, listPrograms, bulkCreateRecords, exportRecord } from '../controllers/recordController.js';
import { requireAuth } from '../middleware/auth.js';
import validateRequest from '../utils/validateRequest.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.use(requireAuth);

router.get('/', listRecords);
router.get('/programs', listPrograms);

// Valores válidos del ENUM estado_de_pago
const estadosDePagoValidos = ['Aprobado', 'Toku', 'Rechazado', 'Webpay', 'Pagado', 'Pendiente de pago'];

router.post(
  '/',
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
    body('estadoPago')
      .optional()
      .trim()
      .isIn(estadosDePagoValidos),
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
  createRecord
);

router.post('/bulk', upload.single('file'), bulkCreateRecords);

const recordIdValidator = param('recordId').custom((value) => {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  const numericRegex = /^\d+$/;
  if (uuidRegex.test(value) || numericRegex.test(value)) {
    return true;
  }
  throw new Error('recordId debe ser UUID o entero');
});

router.get(
  '/:recordId/export',
  [recordIdValidator],
  validateRequest,
  exportRecord
);

router.put(
  '/:recordId',
  [
    recordIdValidator,
    body('comentario_asesor').optional().isString().trim(),
    body('estado_de_pago').optional().isIn(estadosDePagoValidos)
  ],
  validateRequest,
  updateRecord
);

router.delete(
  '/:recordId',
  [recordIdValidator],
  validateRequest,
  deleteRecord
);

export default router;
