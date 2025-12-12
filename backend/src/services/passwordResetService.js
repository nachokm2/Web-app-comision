import crypto from 'crypto';
import db from '../db/pool.js';
import config from '../config/index.js';
import logger from '../logger/index.js';

const TABLE_NAME = 'password_reset_tokens';

export async function ensurePasswordResetTable () {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON ${TABLE_NAME}(token_hash)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON ${TABLE_NAME}(user_id)`);
}

function hashToken (token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createPasswordResetToken (userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + config.passwordResetTokenTtlMinutes * 60 * 1000);

  await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at < now()', [userId]);
  await db.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return { token, expiresAt };
}

export async function consumePasswordResetToken (plainToken) {
  const tokenHash = hashToken(plainToken);
  const { rows } = await db.query(
    `UPDATE password_reset_tokens
     SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at >= now()
     RETURNING user_id`,
    [tokenHash]
  );
  if (!rows[0]) {
    logger.warn('Token de restablecimiento inválido o expirado');
    return null;
  }
  return rows[0].user_id;
}
