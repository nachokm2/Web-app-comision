import 'dotenv/config';
import db from '../src/db/pool.js';

const query = process.argv[2];

if (!query) {
  console.error('Uso: node scripts/test-query.js "SELECT ..."');
  process.exit(1);
}

async function run () {
  const { rows } = await db.query(query);
  console.log({ rows });
  process.exit(0);
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
