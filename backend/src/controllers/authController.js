import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import {
  validateCredentials,
  findUserById,
  findUserByUsername,
  findInstitutionalEmailByUsername,
  updateUserPassword
} from '../services/userService.js';
import { createPasswordResetToken, consumePasswordResetToken } from '../services/passwordResetService.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import logger from '../logger/index.js';

function buildToken (user) {
  return jwt.sign(
    { sub: user.id, username: user.username, rol: user.rol },
    config.jwtSecret,
    { expiresIn: `${config.sessionTtlMinutes}m` }
  );
}

export async function login (req, res) {
  const { username, password } = req.body;
  const user = await validateCredentials(username, password);
  if (!user) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }
  const token = buildToken(user);
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(config.sessionCookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',  // 'none' para cross-site en producción
    maxAge: config.sessionTtlMinutes * 60 * 1000
  });
  res.json({ user, token });
}

export async function me (req, res) {
  const user = await findUserById(req.user.id);
  res.json({ user });
}

export function logout (req, res) {
  res.clearCookie(config.sessionCookieName);
  res.status(204).send();
}

export async function requestPasswordReset (req, res) {
  const { username } = req.body;
  try {
    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(204).send();
    }

    const institutionalEmail = await findInstitutionalEmailByUsername(user.username);
    if (!institutionalEmail) {
      logger.warn('Usuario sin correo institucional para restablecer', { username: user.username });
      return res.status(204).send();
    }

    const { token, expiresAt } = await createPasswordResetToken(user.id);
    const resetLink = `${config.appBaseUrl.replace(/\/$/, '')}/reset-password?token=${token}`;
    await sendPasswordResetEmail({ to: institutionalEmail, username: user.username, resetLink, expiresAt });
  } catch (error) {
    logger.error('Error solicitando restablecimiento', { error: error.message });
    return res.status(500).json({ message: 'No fue posible iniciar el restablecimiento. Intenta nuevamente.' });
  }

  return res.status(204).send();
}

export async function confirmPasswordReset (req, res) {
  const { token, newPassword } = req.body;
  try {
    const userId = await consumePasswordResetToken(token);
    if (!userId) {
      return res.status(400).json({ message: 'Token inválido o expirado.' });
    }

    await updateUserPassword(userId, newPassword);
    return res.status(204).send();
  } catch (error) {
    logger.error('Error confirmando restablecimiento', { error: error.message });
    return res.status(500).json({ message: 'No fue posible actualizar la contraseña.' });
  }
}
