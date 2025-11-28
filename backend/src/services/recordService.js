import db from '../db/pool.js';

// Obtiene las comisiones asociadas a un usuario autenticado (por id UUID)
export async function getRecordsForUser (userId) {
  // Obtener roles y bx24_id del usuario
  const { rows: userRows } = await db.query(
    `SELECT u.bx24_id, array_agg(r.nombre) AS roles
     FROM usuarios u
     LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id
     LEFT JOIN roles r ON r.id = ur.id_rol
     WHERE u.id = $1
     GROUP BY u.bx24_id`,
    [userId]
  );
  if (!userRows[0]) return [];
  const { bx24_id, roles } = userRows[0];

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
    FROM comisiones c
    LEFT JOIN estudiantes e ON c.rut_estudiante = e.rut
    LEFT JOIN usuarios u ON c.id_asesor = u.bx24_id
    LEFT JOIN programas p ON c.cod_programa = p.cod_programa
  `;

  let rows;
  const isAdmin = Array.isArray(roles) && roles.some((role) => role?.toUpperCase() === 'ADMIN');
  if (isAdmin) {
    ({ rows } = await db.query(baseQuery + 'ORDER BY c.fecha_matricula DESC'));
  } else {
    if (!bx24_id) return [];
    ({ rows } = await db.query(baseQuery + 'WHERE c.id_asesor = $1 ORDER BY c.fecha_matricula DESC', [bx24_id]));
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title || 'Sin título',
    category: r.category || 'Sin categoría',
    amount: Number(r.amount) || 0,
    status: r.status?.toLowerCase() || 'pending',
    created_at: r.created_at || new Date().toISOString(),
    rut_estudiante: r.rut_estudiante,
    cod_programa: r.cod_programa,
    version_programa: r.version_programa,
    asesor: r.asesor
  }));
}


// Puedes adaptar esta función según los campos de comisiones que quieras permitir crear
export async function createRecordForUser (userId, payload) {
  // Primero obtenemos el bx24_id del usuario
  const { rows: userRows } = await db.query('SELECT bx24_id FROM usuarios WHERE id = $1', [userId]);
  if (!userRows[0] || !userRows[0].bx24_id) throw new Error('Usuario sin bx24_id');
  const bx24_id = userRows[0].bx24_id;
  // Aquí deberías mapear los campos de payload a los de comisiones
  // Ejemplo mínimo:
  const { arancel, comentario_admin_contable, comentario_finanzas, estado_de_pago, descuento_aplicado, fecha_matricula, matricula, matriculados_programa, meta_asesor, metodo_de_pago, sede, valor_comision, version_programa, rut_estudiante, cod_programa } = payload;
  const { rows } = await db.query(
    `INSERT INTO comisiones (arancel, comentario_admin_contable, comentario_finanzas, estado_de_pago, descuento_aplicado, fecha_matricula, matricula, matriculados_programa, meta_asesor, metodo_de_pago, sede, valor_comision, version_programa, id_asesor, rut_estudiante, cod_programa)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [arancel, comentario_admin_contable, comentario_finanzas, estado_de_pago, descuento_aplicado, fecha_matricula, matricula, matriculados_programa, meta_asesor, metodo_de_pago, sede, valor_comision, version_programa, bx24_id, rut_estudiante, cod_programa]
  );
  return rows[0];
}


// Actualiza una comisión solo si pertenece al usuario
export async function updateRecordForUser (userId, recordId, payload) {
  const { rows: userRows } = await db.query('SELECT bx24_id FROM usuarios WHERE id = $1', [userId]);
  if (!userRows[0] || !userRows[0].bx24_id) return null;
  const bx24_id = userRows[0].bx24_id;
  // Aquí deberías mapear los campos de payload a los de comisiones
  // Ejemplo mínimo:
  const campos = [];
  const valores = [];
  let idx = 1;
  for (const [k, v] of Object.entries(payload)) {
    campos.push(`${k} = $${idx++}`);
    valores.push(v);
  }
  valores.push(recordId);
  valores.push(bx24_id);
  const { rows } = await db.query(
    `UPDATE comisiones SET ${campos.join(', ')} WHERE id = $${idx++} AND id_asesor = $${idx} RETURNING *`,
    valores
  );
  return rows[0];
}


// Borra una comisión solo si pertenece al usuario
export async function deleteRecordForUser (userId, recordId) {
  const { rows: userRows } = await db.query('SELECT bx24_id FROM usuarios WHERE id = $1', [userId]);
  if (!userRows[0] || !userRows[0].bx24_id) return false;
  const bx24_id = userRows[0].bx24_id;
  const { rowCount } = await db.query(
    'DELETE FROM comisiones WHERE id = $1 AND id_asesor = $2',
    [recordId, bx24_id]
  );
  return rowCount > 0;
}
