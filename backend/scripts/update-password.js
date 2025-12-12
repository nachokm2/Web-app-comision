import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from '../src/db/pool.js';

const username = process.argv[2];
const plain = process.argv[3];

if (!username || !plain) {
  console.error('Uso: node scripts/update-password.js <username> <password>');
  process.exit(1);
}

async function run() {
  const hash = await bcrypt.hash(plain, 12);
  await db.query("SET session_replication_role = 'replica'");
  const res = await db.query('UPDATE usuarios SET password_hash = $1 WHERE username = $2', [hash, username]);
  await db.query("SET session_replication_role = 'origin'");
  console.log('Filas afectadas:', res.rowCount);
  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
