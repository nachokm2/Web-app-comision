import { Router } from 'express';
import { getSchemaSnapshot } from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));
router.get('/schema', getSchemaSnapshot);

export default router;
