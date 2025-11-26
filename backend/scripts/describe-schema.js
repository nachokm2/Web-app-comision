import 'dotenv/config';
import db from '../src/db/pool.js';

async function run () {
  const { rows } = await db.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'comision_ua'
    ORDER BY table_name, ordinal_position
  `);
  const grouped = rows.reduce((acc, row) => {
    acc[row.table_name] = acc[row.table_name] || [];
    acc[row.table_name].push({ column: row.column_name, type: row.data_type });
    return acc;
  }, {});
  console.dir(grouped, { depth: null });
  process.exit(0);
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
