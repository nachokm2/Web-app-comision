
import bcrypt from 'bcryptjs';
import db from '../db/pool.js';
import logger from '../logger/index.js';

// Obtiene usuario y roles asociados
export async function findUserByUsername(username) {
  const { rows } = await db.query(
    `SELECT u.id, u.username, u.password_hash, array_agg(r.nombre) AS roles
     FROM usuarios u
    LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id
    LEFT JOIN roles r ON r.id = ur.id_rol
     WHERE u.username = $1
     GROUP BY u.id, u.username, u.password_hash`,
    [username]
  );
  if (!rows[0]) return null;
  const user = rows[0];
  user.rol = user.roles && user.roles.length > 0 ? user.roles[0] : null; // Para compatibilidad con el middleware actual
  return user;
}

export async function findUserById(id) {
  const { rows } = await db.query(
    `SELECT u.id, u.username, array_agg(r.nombre) AS roles
     FROM usuarios u
    LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id
    LEFT JOIN roles r ON r.id = ur.id_rol
     WHERE u.id = $1
     GROUP BY u.id, u.username`,
    [id]
  );
  if (!rows[0]) return null;
  const user = rows[0];
  user.rol = user.roles && user.roles.length > 0 ? user.roles[0] : null;
  return user;
}

export async function validateCredentials(username, plainPassword) {
  const user = await findUserByUsername(username);
  if (!user) return null;
  const match = await bcrypt.compare(plainPassword, user.password_hash);
  if (!match) return null;
  return { id: user.id, username: user.username, rol: user.rol, roles: user.roles };
}

// Crea usuario y asigna rol
export async function createUser({ username, password, rol = 'viewer' }) {
  const passwordHash = await bcrypt.hash(password, 12);
  // Crear usuario
  const { rows } = await db.query(
    'INSERT INTO usuarios (username, password_hash) VALUES ($1, $2) RETURNING id, username',
    [username, passwordHash]
  );
  const user = rows[0];
  // Buscar id del rol
  const { rows: roleRows } = await db.query('SELECT id FROM roles WHERE nombre = $1', [rol]);
  if (!roleRows[0]) throw new Error(`Rol no encontrado: ${rol}`);
  const rolId = roleRows[0].id;
  // Asignar rol
  await db.query('INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, rolId]);
  logger.info('Usuario creado', { userId: user.id, username });
  user.rol = rol;
  user.roles = [rol];
  return user;
}
