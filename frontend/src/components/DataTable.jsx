function DataTable ({ records, onEdit, onDelete }) {
  if (!records.length) {
    return <p className="text-sm text-slate-500">No hay registros asignados.</p>;
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Título</th>
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Categoría</th>
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Monto</th>
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Estado</th>
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Creado</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {records.map((record) => (
            <tr key={record.id}>
              <td className="px-4 py-2 text-sm">{record.title}</td>
              <td className="px-4 py-2 text-sm">{record.category}</td>
              <td className="px-4 py-2 text-sm">{Number(record.amount).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</td>
              <td className="px-4 py-2 text-sm">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusBadge(record.status)}`}>
                  {record.status}
                </span>
              </td>
              <td className="px-4 py-2 text-sm text-slate-500">{new Date(record.created_at).toLocaleString()}</td>
              <td className="px-4 py-2 text-sm text-right space-x-2">
                <button className="text-blue-600 hover:underline" onClick={() => onEdit(record)}>Editar</button>
                <button className="text-red-600 hover:underline" onClick={() => onDelete(record.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function statusBadge (status) {
  const colorMap = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800'
  };
  return colorMap[status] || 'bg-slate-100 text-slate-700';
}

export default DataTable;
