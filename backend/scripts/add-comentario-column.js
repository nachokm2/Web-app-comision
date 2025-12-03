import db from '../src/db/pool.js';

async function main() {
  try {
    await db.query(`ALTER TABLE comision_ua.comisiones ADD COLUMN IF NOT EXISTS comentario_asesor TEXT`);
    console.log('✅ Columna comentario_asesor agregada a la tabla comisiones');
    
    // Verificar
    const { rows } = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'comision_ua' AND table_name = 'comisiones' AND column_name = 'comentario_asesor'
    `);
    if (rows.length > 0) {
      console.log('✅ Verificación exitosa: la columna existe');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await db.end();
  }
}

main();
