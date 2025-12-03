import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    // Columnas de programas
    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'comision_ua' AND table_name = 'programas'
    `);
    console.log('Columnas de programas:', cols.rows.map(r => r.column_name));
    
    // Muestra de datos
    const sample = await pool.query(`SELECT * FROM comision_ua.programas LIMIT 2`);
    console.log('\nMuestra de programas:');
    console.log(sample.rows);
    
    // Contar asesores
    const asesores = await pool.query(`
      SELECT COUNT(*) as total FROM comision_ua.usuarios WHERE bx24_id IS NOT NULL
    `);
    console.log('\nTotal asesores:', asesores.rows[0].total);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
