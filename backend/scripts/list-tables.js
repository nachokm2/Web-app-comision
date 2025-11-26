import 'dotenv/config';
import db from '../src/db/pool.js';

async function run () {
  const { rows } = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'comision_ua'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  console.log(rows.map((r) => r.table_name));
  process.exit(0);
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
