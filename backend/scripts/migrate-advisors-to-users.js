import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from '../src/db/pool.js';

const SCHEMA = 'comision_ua';
const schemaRef = `"${SCHEMA}"`;

function normalizeWhitespace (value) {
  if (!value) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function normalizeEmail (value = '') {
  const trimmed = normalizeWhitespace(value).toLowerCase();
  return trimmed || null;
}

function sanitizeRut (value = '') {
  const trimmed = value.replace(/[.\s-]/g, '').toUpperCase();
  return trimmed || null;
}

function sanitizePhone (value = '') {
  const trimmed = normalizeWhitespace(value);
  return trimmed || null;
}

function sanitizeSede (value = '') {
  const trimmed = normalizeWhitespace(value);
  return trimmed || null;
}

function sanitizeName (value = '') {
  const trimmed = normalizeWhitespace(value);
  return trimmed || null;
}

function buildBaseUsername ({ correo, correo_personal: correoPersonal, rut, id }) {
  if (correo) return correo;
  if (correoPersonal) return correoPersonal;
  if (rut) return `${rut.toLowerCase()}@asesores.local`;
  return `asesor_${id}@asesores.local`;
}

function withSuffix (username, suffix) {
  if (!suffix) return username;
  if (username.includes('@')) {
    const [local, domain] = username.split('@');
    return `${local}+${suffix}@${domain}`;
  }
  return `${username}_${suffix}`;
}

async function ensureUserColumns () {
  await db.query(`
    ALTER TABLE ${schemaRef}."users"
      ADD COLUMN IF NOT EXISTS nombre_completo VARCHAR(160),
      ADD COLUMN IF NOT EXISTS correo_institucional VARCHAR(160),
      ADD COLUMN IF NOT EXISTS correo_personal VARCHAR(160),
      ADD COLUMN IF NOT EXISTS telefono VARCHAR(60),
      ADD COLUMN IF NOT EXISTS rut VARCHAR(20),
      ADD COLUMN IF NOT EXISTS sede VARCHAR(120),
      ADD COLUMN IF NOT EXISTS legacy_asesor_id INTEGER,
      ADD COLUMN IF NOT EXISTS is_asesor BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_schema = '${SCHEMA}'
          AND table_name = 'users'
          AND constraint_name = 'users_legacy_asesor_id_key'
      ) THEN
        ALTER TABLE ${schemaRef}."users"
        ADD CONSTRAINT users_legacy_asesor_id_key UNIQUE (legacy_asesor_id);
      END IF;
    END $$;
  `);
}

async function dropOldForeignKey () {
  await db.query(`
    DO $$
    DECLARE
      fk_name TEXT;
    BEGIN
      SELECT tc.constraint_name INTO fk_name
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = '${SCHEMA}'
        AND tc.table_name = 'comisiones'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_name LIKE 'comisiones_id_asesor%';

      IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE ${schemaRef}."comisiones" DROP CONSTRAINT %I', fk_name);
      END IF;
    END $$;
  `);
}

async function createNewForeignKey () {
  await db.query(`
    ALTER TABLE ${schemaRef}."comisiones"
    ADD CONSTRAINT comisiones_id_asesor_fkey
    FOREIGN KEY (id_asesor)
    REFERENCES ${schemaRef}."users" (legacy_asesor_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
  `);
}

async function ensureAdvisorUser (advisor, passwordHash) {
  const nombreCompleto = sanitizeName(advisor.nombre_completo) || `Asesor ${advisor.id}`;
  const correoInstitucional = normalizeEmail(advisor.correo);
  const correoPersonal = normalizeEmail(advisor.correo_personal ?? '');
  const telefono = sanitizePhone(advisor.telefono ?? '');
  const rut = sanitizeRut(advisor.rut ?? '');
  const sede = sanitizeSede(advisor.institucion ?? '');
  let username = buildBaseUsername({
    correo: correoInstitucional,
    correo_personal: correoPersonal,
    rut,
    id: advisor.id
  });

  let attempts = 0;
  while (true) {
    const { rows } = await db.query(
      `SELECT legacy_asesor_id FROM ${schemaRef}."users" WHERE username = $1 LIMIT 1`,
      [username]
    );
    if (rows.length === 0 || rows[0].legacy_asesor_id === advisor.id) {
      break;
    }
    attempts += 1;
    username = withSuffix(username, `${advisor.id}-${attempts}`);
  }

  await db.query(
    `INSERT INTO ${schemaRef}."users"
      (username, password_hash, role, nombre_completo, correo_institucional, correo_personal, telefono, rut, sede, legacy_asesor_id, is_asesor)
     VALUES ($1, $2, 'advisor', $3, $4, $5, $6, $7, $8, $9, TRUE)
     ON CONFLICT (legacy_asesor_id) DO UPDATE SET
       username = EXCLUDED.username,
       role = 'advisor',
       nombre_completo = EXCLUDED.nombre_completo,
       correo_institucional = EXCLUDED.correo_institucional,
       correo_personal = EXCLUDED.correo_personal,
       telefono = EXCLUDED.telefono,
       rut = EXCLUDED.rut,
       sede = EXCLUDED.sede,
       is_asesor = TRUE`,
    [
      username,
      passwordHash,
      nombreCompleto,
      correoInstitucional,
      correoPersonal,
      telefono,
      rut,
      sede,
      advisor.id
    ]
  );
}

async function migrateAdvisors () {
  const defaultPassword = process.env.ADVISOR_DEFAULT_PASSWORD;
  if (!defaultPassword) {
    throw new Error('Define la variable ADVISOR_DEFAULT_PASSWORD antes de ejecutar la migración.');
  }
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  const { rows: advisors } = await db.query(
    `SELECT id, nombre_completo, correo, institucion, correo_personal, telefono, rut FROM ${schemaRef}."asesores" ORDER BY id`
  );

  if (!advisors.length) {
    console.log('No se encontraron asesores para migrar.');
    return;
  }

  for (const advisor of advisors) {
    await ensureAdvisorUser(advisor, passwordHash);
  }

  console.log(`Se migraron ${advisors.length} asesores hacia la tabla users.`);
}

async function dropAdvisorTable () {
  await db.query(`DROP TABLE IF EXISTS ${schemaRef}."asesores" CASCADE`);
  console.log('Tabla asesores eliminada.');
}

async function ensureLegacySequence () {
  await db.query(`CREATE SEQUENCE IF NOT EXISTS ${schemaRef}.asesores_id_seq OWNED BY NONE`);
  const { rows } = await db.query(`SELECT MAX(legacy_asesor_id) AS max_id FROM ${schemaRef}."users"`);
  const maxId = Number(rows[0]?.max_id) || 0;
  await db.query(`SELECT setval('${SCHEMA}.asesores_id_seq', $1)`, [maxId]);
}

async function run () {
  try {
    await ensureUserColumns();
    await migrateAdvisors();
    await dropOldForeignKey();
    await createNewForeignKey();
    await dropAdvisorTable();
    await ensureLegacySequence();
    console.log('Migración completada.');
    process.exit(0);
  } catch (error) {
    console.error('Fallo la migración asesores -> users:', error);
    process.exit(1);
  }
}

run();
