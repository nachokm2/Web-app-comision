import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from '../src/db/pool.js';

async function run () {
  console.log('Inicializando esquema base...');


  const statements = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT (md5(random()::text || clock_timestamp()::text))::uuid,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nombre_completo VARCHAR(160),
      correo_institucional VARCHAR(160),
      correo_personal VARCHAR(160),
      telefono VARCHAR(60),
      rut VARCHAR(20),
      sede VARCHAR(120),
      legacy_asesor_id INTEGER UNIQUE,
      is_asesor BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      nombre TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usuario_rol (
      usuario_id UUID REFERENCES users(id) ON DELETE CASCADE,
      rol_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
      PRIMARY KEY (usuario_id, rol_id)
    );

    CREATE TABLE IF NOT EXISTS records (
      id UUID PRIMARY KEY DEFAULT (md5(random()::text || clock_timestamp()::text))::uuid,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending%','approved%','rejected')),
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS users_set_updated_at ON users;
    CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    DROP TRIGGER IF EXISTS records_set_updated_at ON records;
    CREATE TRIGGER records_set_updated_at
    BEFORE UPDATE ON records
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `;

  await db.query(statements);
  console.log('Esquema listo.');

  // Migrar roles existentes de users.role a la nueva estructura
  // 1. Insertar roles únicos en la tabla roles
  await db.query(`
    INSERT INTO roles (nombre)
    SELECT DISTINCT role FROM users WHERE role IS NOT NULL
    ON CONFLICT (nombre) DO NOTHING;
  `);

  // 2. Insertar asignaciones usuario_rol
  await db.query(`
    INSERT INTO usuario_rol (usuario_id, rol_id)
    SELECT u.id, r.id
    FROM users u
    JOIN roles r ON r.nombre = u.role
    WHERE u.role IS NOT NULL
    ON CONFLICT DO NOTHING;
  `);

  // 3. Eliminar columna role de users
  const colCheck = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role'`);
  if (colCheck.rows.length > 0) {
    await db.query('ALTER TABLE users DROP COLUMN role');
    console.log('Columna role eliminada de users.');
  }

  const seedUser = process.env.ADMIN_SEED_USER?.trim();
  const seedPass = process.env.ADMIN_SEED_PASSWORD;

  if (seedUser && seedPass) {
    console.log(`Creando/actualizando usuario seed ${seedUser} (len=${seedPass.length})...`);
    const passwordHash = await bcrypt.hash(seedPass, 12);
    // Crear o actualizar usuario
    const { rows } = await db.query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (username) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         updated_at = now()
       RETURNING id`,
      [seedUser, passwordHash]
    );
    const userId = rows[0].id;
    // Asignar rol admin (id=2)
    await db.query(
      `INSERT INTO usuario_rol (usuario_id, rol_id)
       VALUES ($1, 2)
       ON CONFLICT (usuario_id, rol_id) DO NOTHING`,
      [userId]
    );
    console.log('Usuario seed listo/actualizado con rol admin.');
  } else {
    console.log('Variables ADMIN_SEED_USER / ADMIN_SEED_PASSWORD no definidas, no se creó usuario seed.');
  }

  console.log('Migración completada.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Fallo al inicializar la base de datos:%', err.message);
  process.exit(1);
});
