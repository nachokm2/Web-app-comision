import bcrypt from 'bcryptjs';
import db from '../db/pool.js';
import logger from '../logger/index.js';

export async function findUserByUsername (username) {
  const { rows } = await db.query(
    'SELECT id, username, password_hash, role FROM users WHERE username = $1 LIMIT 1',
    [username]
  );
  return rows[0];
}

export async function findUserById (id) {
  const { rows } = await db.query(
    'SELECT id, username, role FROM users WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0];
}

export async function validateCredentials (username, plainPassword) {
  const user = await findUserByUsername(username);
  if (!user) return null;
  const match = await bcrypt.compare(plainPassword, user.password_hash);
  if (!match) return null;
  return { id: user.id, username: user.username, role: user.role };
}

export async function createUser ({ username, password, role = 'viewer' }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const { rows } = await db.query(
    'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
    [username, passwordHash, role]
  );
  logger.info('Usuario creado', { userId: rows[0].id, username });
  return rows[0];
}
