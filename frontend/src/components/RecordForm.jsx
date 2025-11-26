import { useEffect, useState } from 'react';

const emptyRecord = { title: '', category: '', amount: 0, status: 'pending' };

function RecordForm ({ initialRecord, onSubmit, onCancel }) {
  const [record, setRecord] = useState(emptyRecord);

  useEffect(() => {
    setRecord(initialRecord || emptyRecord);
  }, [initialRecord]);

  function handleChange (event) {
    const { name, value } = event.target;
    setRecord({ ...record, [name]: name === 'amount' ? Number(value) : value });
  }

  function handleSubmit (event) {
    event.preventDefault();
    onSubmit(record);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium">Título</label>
        <input
          name="title"
          value={record.title}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded border border-slate-300 p-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Categoría</label>
        <input
          name="category"
          value={record.category}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded border border-slate-300 p-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Monto</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          value={record.amount}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded border border-slate-300 p-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Estado</label>
        <select
          name="status"
          value={record.status}
          onChange={handleChange}
          className="mt-1 w-full rounded border border-slate-300 p-2"
        >
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm">
          Cancelar
        </button>
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          Guardar
        </button>
      </div>
    </form>
  );
}

export default RecordForm;
