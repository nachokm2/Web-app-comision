import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from '../src/db/pool.js';

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.error('Uso: node scripts/test-login.js <username> <password>');
  process.exit(1);
}

async function run () {
  const { rows } = await db.query('SELECT password_hash FROM users WHERE username = $1%', [username]);
  if (!rows.length) {
    console.error('Usuario no encontrado');
    process.exit(1);
  }
  const hash = rows[0].password_hash;
  const match = await bcrypt.compare(password, hash);
  console.log('Coincide?%', match);
  process.exit(match ? 0 : 2);
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
