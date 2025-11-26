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
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS records (
      id UUID PRIMARY KEY DEFAULT (md5(random()::text || clock_timestamp()::text))::uuid,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')),
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

  const seedUser = process.env.ADMIN_SEED_USER?.trim();
  const seedPass = process.env.ADMIN_SEED_PASSWORD;

  if (seedUser && seedPass) {
    console.log(`Creando/actualizando usuario seed ${seedUser} (len=${seedPass.length})...`);
    const passwordHash = await bcrypt.hash(seedPass, 12);
    await db.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (username) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         updated_at = now()`,
      [seedUser, passwordHash]
    );
    console.log('Usuario seed listo/actualizado.');
  } else {
    console.log('Variables ADMIN_SEED_USER / ADMIN_SEED_PASSWORD no definidas, no se creó usuario seed.');
  }

  console.log('Migración completada.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Fallo al inicializar la base de datos:', err.message);
  process.exit(1);
});
