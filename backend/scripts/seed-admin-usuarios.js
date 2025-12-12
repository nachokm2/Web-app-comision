import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from '../src/db/pool.js';

const username = process.argv[2] || process.env.ADMIN_SEED_USER || 'admin.demo';
const password = process.argv[3] || process.env.ADMIN_SEED_PASSWORD || 'ContraseñaSegura123!';

async function ensureRoleAdmin () {
  const { rows } = await db.query('SELECT id FROM roles WHERE nombre = $1', ['admin']);
  if (rows[0]) return rows[0].id;
  const { rows: created } = await db.query('INSERT INTO roles (nombre, descripcion) VALUES ($1, $2) RETURNING id', ['admin', 'Administrador']);
  return created[0].id;
}

async function run () {
  console.log(`Seed/Update usuario '${username}'...`);
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await db.query(
    `INSERT INTO usuarios (username, password_hash, actualizado_el)
     VALUES ($1, $2, now())
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, actualizado_el = now()
     RETURNING id`,
    [username, hash]
  );
  const userId = rows[0].id;
  const adminRoleId = await ensureRoleAdmin();
  await db.query(
    `INSERT INTO usuario_rol (id_usuario, id_rol)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, adminRoleId]
  );
  console.log('Usuario seed listo con rol admin.');
  process.exit(0);
}

run().catch(err => { console.error('Seed fallo:', err.message); process.exit(1); });
