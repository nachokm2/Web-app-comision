import db from '../src/db/pool.js';

async function main() {
  try {
    // Columnas de comisiones
    const cols = await db.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_schema = 'comision_ua' AND table_name = 'comisiones'
      ORDER BY ordinal_position
    `);
    console.log('Columnas de comisiones:');
    cols.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
    
    const { rows: countRows } = await db.query('SELECT COUNT(*) FROM comision_ua.comisiones');
    console.log('\nTotal comisiones:', countRows[0].count);
    
    const { rows: sample } = await db.query('SELECT * FROM comision_ua.comisiones LIMIT 1');
    console.log('\nEjemplo de comisión:');
    console.log(JSON.stringify(sample[0], null, 2));
    
    // También probar la query del endpoint
    const baseQuery = `
      SELECT c.id,
             COALESCE(NULLIF(TRIM(CONCAT(e.nombres, ' ', e.apellidos)), ''), e.nombres, c.cod_programa) AS title,
             COALESCE(p.nombre, c.cod_programa) AS category,
             c.valor_comision AS amount,
             COALESCE(c.estado_de_pago::text, 'pending') AS status,
             c.fecha_matricula AS created_at,
             c.rut_estudiante,
             c.cod_programa,
             c.version_programa,
             u.nombre_completo AS asesor
      FROM comision_ua.comisiones c
      LEFT JOIN comision_ua.estudiantes e ON c.rut_estudiante = e.rut
      LEFT JOIN comision_ua.usuarios u ON c.id_asesor = u.bx24_id
      LEFT JOIN comision_ua.programas p ON c.cod_programa = p.cod_programa
      ORDER BY c.fecha_matricula DESC
      LIMIT 5
    `;
    const { rows: enriched } = await db.query(baseQuery);
    console.log('\nQuery enriquecida:');
    console.log(JSON.stringify(enriched, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
