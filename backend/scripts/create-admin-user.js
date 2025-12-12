import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from '../src/db/pool.js';

const username = process.argv[2] || 'admin.demo2';
const password = process.argv[3] || 'ContraseñaSegura123!';

async function ensureRole(name) {
  const { rows } = await db.query('SELECT id FROM roles WHERE nombre = $1', [name]);
  if (rows[0]) return rows[0].id;
  const created = await db.query('INSERT INTO roles (nombre, descripcion) VALUES ($1, $2) RETURNING id', [name, `${name} role`]);
  return created.rows[0].id;
}

async function run() {
  const hash = await bcrypt.hash(password, 12);
  // Intentar insertar usuario (si existe, no hacer nada)
  await db.query(
    `INSERT INTO usuarios (id, username, password_hash, creado_el, actualizado_el)
     VALUES ((md5(random()::text || clock_timestamp()::text))::uuid, $1, $2, now(), now())
     ON CONFLICT (username) DO NOTHING`,
    [username, hash]
  );
  // Asegurar que si el usuario ya existía, actualizar su password vía insert-select evitando UPDATE y triggers
  await db.query(
    `INSERT INTO usuarios (id, username, password_hash, creado_el, actualizado_el)
     SELECT u.id, u.username, $2, u.creado_el, now()
     FROM usuarios u
     WHERE u.username = $1
     ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, actualizado_el = EXCLUDED.actualizado_el`,
    [username, hash]
  );

  const adminRoleId = await ensureRole('admin');
  await db.query(
    `INSERT INTO usuario_rol (id_usuario, id_rol)
     SELECT u.id, $2 FROM usuarios u WHERE u.username = $1
     ON CONFLICT DO NOTHING`,
    [username, adminRoleId]
  );

  console.log(`Usuario '${username}' listo con rol admin.`);
  process.exit(0);
}

run().catch(err => { console.error('Error creando usuario:', err.message); process.exit(1); });
