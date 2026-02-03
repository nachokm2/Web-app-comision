import bcrypt from 'bcryptjs'
import db from '../db/pool.js'
import logger from '../logger/index.js'

// Obtiene usuario y roles asociados
export async function findUserByUsername (username) {
  const { rows } = await db.query(
    //  LEFT JOIN comision_ua.usuarios cu ON cu.id = u.id
    `SELECT u.id,
            u.username,
            u.password_hash,
            array_agg(r.nombre) AS roles,
            u.nombre_completo,
            u.bx24_id
     FROM comision_ua.usuarios u
     LEFT JOIN comision_ua.usuario_rol ur ON ur.id_usuario = u.id
     LEFT JOIN comision_ua.roles r ON r.id = ur.id_rol
     WHERE u.username = $1
     GROUP BY u.id, u.username, u.password_hash, u.nombre_completo, u.bx24_id`,
    [username]
  )
  if (!rows[0]) return null
  const user = rows[0]
  user.rol = user.roles && user.roles.length > 0 ? user.roles[0] : null // Para compatibilidad con el middleware actual
  return user
}

export async function findUserById (id) {
  const { rows } = await db.query(
    `SELECT u.id,
            u.username,
            array_agg(r.nombre) AS roles,
            u.nombre_completo,
            u.bx24_id
     FROM comision_ua.usuarios u
     LEFT JOIN comision_ua.usuario_rol ur ON ur.id_usuario = u.id
     LEFT JOIN comision_ua.roles r ON r.id = ur.id_rol
     WHERE u.id = $1
     GROUP BY u.id, u.username, u.nombre_completo, u.bx24_id`,
    [id]
  )
  if (!rows[0]) return null
  const user = rows[0]
  user.rol = user.roles && user.roles.length > 0 ? user.roles[0] : null
  return user
}

export async function validateCredentials (username, plainPassword) {
  const user = await findUserByUsername(username)
  if (!user) return null
  const match = await bcrypt.compare(plainPassword, user.password_hash)
  if (!match) return null
  return {
    id: user.id,
    username: user.username,
    rol: user.rol,
    roles: user.roles,
    nombre_completo: user.nombre_completo,
    bx24_id: user.bx24_id
  }
}

export async function findInstitutionalEmailByUsername (username) {
  const { rows } = await db.query(
    `SELECT correo_institucional
     FROM 'comision_ua'.'usuarios'
     WHERE LOWER(username) = LOWER($1)
     LIMIT 1`,
    [username]
  )
  return rows[0]?.correo_institucional || null
}

export async function updateUserPassword (userId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await db.query(
    'UPDATE usuarios SET password_hash = $1, actualizado_el = now() WHERE id = $2',
    [passwordHash, userId]
  )
  logger.info('Contraseña actualizada tras restablecimiento', { userId })
}

// Crea usuario y asigna rol
export async function createUser ({ username, password, rol = 'viewer' }) {
  const passwordHash = await bcrypt.hash(password, 12)
  const { rows } = await db.query(
    'INSERT INTO usuarios (username, password_hash) VALUES ($1, $2) RETURNING id, username',
    [username, passwordHash]
  )
  const user = rows[0]
  const { rows: roleRows } = await db.query(
    'SELECT id FROM roles WHERE nombre = $1',
    [rol]
  )
  if (!roleRows[0]) throw new Error(`Rol no encontrado: ${rol}`)
  const rolId = roleRows[0].id
  await db.query(
    'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [user.id, rolId]
  )
  logger.info('Usuario creado', { userId: user.id, username })
  user.rol = rol
  user.roles = [rol]
  return user
}
