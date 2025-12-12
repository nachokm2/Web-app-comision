import { Router } from 'express';
import { body } from 'express-validator';
import { login, logout, me, requestPasswordReset, confirmPasswordReset } from '../controllers/authController.js';
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
router.post(
  '/password-reset/request',
  [body('username').isString().trim().isLength({ min: 3 })],
  validateRequest,
  requestPasswordReset
);
router.post(
  '/password-reset/confirm',
  [body('token').isString().isLength({ min: 10 }), body('newPassword').isString().isLength({ min: 8 })],
  validateRequest,
  confirmPasswordReset
);

export default router;
