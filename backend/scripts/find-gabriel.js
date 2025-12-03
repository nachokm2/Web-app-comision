import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    // Top 10 asesores con más comisiones
    const top = await pool.query(`
      SELECT c.id_asesor, u.nombre_completo, u.correo_institucional, u.sede,
             COUNT(*) as total,
             SUM(c.valor_comision) as total_comision
      FROM comision_ua.comisiones c
      LEFT JOIN comision_ua.usuarios u ON u.bx24_id = c.id_asesor
      GROUP BY c.id_asesor, u.nombre_completo, u.correo_institucional, u.sede
      ORDER BY total DESC
      LIMIT 15
    `);
    
    console.log('=== TOP 15 ASESORES CON COMISIONES ===\n');
    top.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.nombre_completo || 'ID: ' + row.id_asesor}`);
      console.log(`   Casos: ${row.total} | Comisión total: $${Number(row.total_comision || 0).toLocaleString()}`);
      console.log(`   Sede: ${row.sede || 'N/A'}`);
      console.log('');
    });
    
    // Buscar específicamente Gabriel Herrera (307865)
    console.log('=== DETALLE GABRIEL HERRERA (bx24_id: 307865) ===\n');
    
    const user = await pool.query(`SELECT * FROM comision_ua.usuarios WHERE bx24_id = 307865`);
    if (user.rows[0]) {
      const u = user.rows[0];
      console.log('INFORMACIÓN DEL ASESOR:');
      console.log(`  Nombre: ${u.nombre_completo}`);
      console.log(`  Username: ${u.username}`);
      console.log(`  Correo: ${u.correo_institucional || 'N/A'}`);
      console.log(`  Teléfono: ${u.telefono || 'N/A'}`);
      console.log(`  RUT: ${u.rut || 'N/A'}`);
      console.log(`  Sede: ${u.sede || 'N/A'}`);
    }
    
    // Resumen de sus comisiones
    const resumen = await pool.query(`
      SELECT 
        estado_de_pago,
        COUNT(*) as cantidad,
        SUM(valor_comision) as total_comision,
        SUM(matricula) as total_matricula
      FROM comision_ua.comisiones
      WHERE id_asesor = 307865
      GROUP BY estado_de_pago
    `);
    
    console.log('\nRESUMEN POR ESTADO:');
    resumen.rows.forEach(r => {
      console.log(`  ${r.estado_de_pago}: ${r.cantidad} casos | Comisión: $${Number(r.total_comision || 0).toLocaleString()} | Matrícula: $${Number(r.total_matricula || 0).toLocaleString()}`);
    });
    
    // Detalle de algunas comisiones
    const comisiones = await pool.query(`
      SELECT c.*, p.nombre as programa_nombre
      FROM comision_ua.comisiones c
      LEFT JOIN comision_ua.programas p ON p.cod_programa = c.cod_programa
      WHERE c.id_asesor = 307865
      ORDER BY c.fecha_matricula DESC
      LIMIT 10
    `);
    
    console.log('\nÚLTIMAS 10 COMISIONES:');
    comisiones.rows.forEach((c, i) => {
      console.log(`\n${i+1}. ID: ${c.id}`);
      console.log(`   RUT Estudiante: ${c.rut_estudiante}`);
      console.log(`   Programa: ${c.programa_nombre || c.cod_programa}`);
      console.log(`   Fecha matrícula: ${c.fecha_matricula}`);
      console.log(`   Estado: ${c.estado_de_pago}`);
      console.log(`   Valor comisión: $${Number(c.valor_comision || 0).toLocaleString()}`);
      console.log(`   Matrícula: $${Number(c.matricula || 0).toLocaleString()}`);
      console.log(`   Sede: ${c.sede}`);
    });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
