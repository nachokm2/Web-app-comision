import db from '../src/db/pool.js';

async function main() {
  try {
    // Primero ver un registro existente
    const { rows: sample } = await db.query(`
      SELECT id, estado_de_pago, comentario_asesor, id_asesor 
      FROM comision_ua.comisiones 
      LIMIT 1
    `);
    console.log('Registro de muestra:', sample[0]);
    
    if (sample[0]) {
      const testId = sample[0].id;
      console.log('\nIntentando actualizar registro id:', testId);
      
      // Probar el update
      const { rows: updated } = await db.query(`
        UPDATE comision_ua.comisiones 
        SET comentario_asesor = $1, estado_de_pago = $2 
        WHERE id = $3 
        RETURNING *
      `, ['Test comentario', 'Pendiente de pago', testId]);
      
      console.log('Actualizado:', updated[0]);
    }
  } catch (err) {
    console.error('Error completo:', err);
  }
  process.exit(0);
}

main();
