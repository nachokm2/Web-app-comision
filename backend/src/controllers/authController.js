import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { validateCredentials, findUserById } from '../services/userService.js';

function buildToken (user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
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
  res.cookie(config.sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
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
