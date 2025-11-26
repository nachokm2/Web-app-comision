import 'dotenv/config';
import db from '../src/db/pool.js';

const username = process.argv[2];

if (!username) {
  console.error('Uso: node scripts/check-user.js <username>');
  process.exit(1);
}

async function run () {
  const { rows } = await db.query(
    'SELECT id, username, role, password_hash, created_at, updated_at FROM users WHERE username = $1',
    [username]
  );
  if (!rows.length) {
    console.log('Usuario no encontrado');
  } else {
    console.log(rows[0]);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
