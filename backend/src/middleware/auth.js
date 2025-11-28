
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { findUserById } from '../services/userService.js';

// Middleware de autenticación
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies[config.sessionCookieName] || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }
    // Solo un rol por usuario: req.user.rol
    req.user = {
      ...user,
      rol: user.rol, // el primer rol encontrado (o null)
      bx24_id: user.bx24_id
    };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Sesión inválida o expirada' });
  }
}

// Middleware de autorización por rol
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    return next();
  };
}
