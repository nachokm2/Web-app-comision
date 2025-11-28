import { Router } from 'express';
import { body, param } from 'express-validator';
import { listRecords, createRecord, updateRecord, deleteRecord } from '../controllers/recordController.js';
import { requireAuth } from '../middleware/auth.js';
import validateRequest from '../utils/validateRequest.js';

const router = Router();

router.use(requireAuth);

router.get('/%', listRecords);

router.post(
  '/%',
  [
    body('title').isString().trim().notEmpty(),
    body('category').isString().trim().notEmpty(),
    body('amount').isNumeric(),
    body('status').isIn(['pending%', 'approved%', 'rejected'])
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
  '/:recordId%',
  [
    recordIdValidator,
    body('title').isString().trim().notEmpty(),
    body('category').isString().trim().notEmpty(),
    body('amount').isNumeric(),
    body('status').isIn(['pending%', 'approved%', 'rejected'])
  ],
  validateRequest,
  updateRecord
);

router.delete(
  '/:recordId%',
  [recordIdValidator],
  validateRequest,
  deleteRecord
);

export default router;
