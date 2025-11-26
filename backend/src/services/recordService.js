import db from '../db/pool.js';

export async function getRecordsForUser (userId) {
  const { rows } = await db.query(
    `SELECT r.id, r.title, r.category, r.amount, r.status, r.owner_id, r.created_at
     FROM records r
     WHERE r.owner_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function createRecordForUser (userId, payload) {
  const { title, category, amount, status } = payload;
  const { rows } = await db.query(
    `INSERT INTO records (title, category, amount, status, owner_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, category, amount, status, owner_id, created_at`,
    [title, category, amount, status, userId]
  );
  return rows[0];
}

export async function updateRecordForUser (userId, recordId, payload) {
  const { title, category, amount, status } = payload;
  const { rows } = await db.query(
    `UPDATE records SET title = $1, category = $2, amount = $3, status = $4
     WHERE id = $5 AND owner_id = $6
     RETURNING id, title, category, amount, status, owner_id, created_at`,
    [title, category, amount, status, recordId, userId]
  );
  return rows[0];
}

export async function deleteRecordForUser (userId, recordId) {
  const { rowCount } = await db.query(
    'DELETE FROM records WHERE id = $1 AND owner_id = $2',
    [recordId, userId]
  );
  return rowCount > 0;
}
