import db from '../src/db/pool.js';

async function main() {
  try {
    const { rows } = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema='comision_ua' AND table_name='usuarios' 
      ORDER BY ordinal_position
    `);
    console.log('Columnas de usuarios:');
    rows.forEach(r => console.log('  -', r.column_name));
    
    // También ver ejemplo de dato
    const { rows: sample } = await db.query('SELECT * FROM comision_ua.usuarios LIMIT 1');
    console.log('\nEjemplo de fila:');
    console.log(sample[0]);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
