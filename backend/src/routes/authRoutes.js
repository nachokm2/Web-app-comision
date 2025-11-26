import { Router } from 'express';
import { body } from 'express-validator';
import { login, logout, me } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import validateRequest from '../utils/validateRequest.js';

const router = Router();

router.post(
  '/login',
  [body('username').isString().trim(), body('password').isString().isLength({ min: 6 })],
  validateRequest,
  login
);

router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);

export default router;
