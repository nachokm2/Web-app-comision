import { Router } from 'express';
import { body, param } from 'express-validator';
import { listRecords, createRecord, updateRecord, deleteRecord } from '../controllers/recordController.js';
import { requireAuth } from '../middleware/auth.js';
import validateRequest from '../utils/validateRequest.js';

const router = Router();

router.use(requireAuth);

router.get('/', listRecords);

// Valores válidos del ENUM estado_de_pago
const estadosDePagoValidos = ['Aprobado', 'Toku', 'Rechazado', 'Webpay', 'Pagado', 'Pendiente de pago'];

router.post(
  '/',
  [
    body('rut_estudiante').optional().isString().trim(),
    body('cod_programa').optional().isString().trim(),
    body('version_programa').optional().isInt(),
    body('matricula').optional().isNumeric(),
    body('arancel').optional().isNumeric(),
    body('estado_de_pago').optional().isIn(estadosDePagoValidos),
    body('fecha_matricula').optional().isISO8601()
  ],
  validateRequest,
  createRecord
);

const recordIdValidator = param('recordId').custom((value) => {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  const numericRegex = /^\d+$/;
  if (uuidRegex.test(value) || numericRegex.test(value)) {
    return true;
  }
  throw new Error('recordId debe ser UUID o entero');
});

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
