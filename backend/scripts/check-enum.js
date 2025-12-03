import db from '../src/db/pool.js';

async function main() {
  try {
    // Ver tipo del ENUM
    const { rows: enumInfo } = await db.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname LIKE '%estado%' OR t.typname LIKE '%pago%'
      ORDER BY e.enumsortorder
    `);
    console.log('Valores del ENUM estado_de_pago:');
    enumInfo.forEach(r => console.log(`  - "${r.enumlabel}"`));
    
    // Ver una muestra de datos
    const { rows: sample } = await db.query(`
      SELECT DISTINCT estado_de_pago FROM comision_ua.comisiones WHERE estado_de_pago IS NOT NULL LIMIT 10
    `);
    console.log('\nValores existentes en la tabla:');
    sample.forEach(r => console.log(`  - "${r.estado_de_pago}"`));
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

main();
