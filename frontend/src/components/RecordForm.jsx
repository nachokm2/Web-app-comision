import { useEffect, useState } from 'react';

// Campos alineados con la tabla comisiones y el mapeo del backend
const emptyRecord = {
  rut_estudiante: '',
  cod_programa: '',
  version_programa: '',
  valor_comision: 0,
  estado_de_pago: 'pending',
  fecha_matricula: ''
};

function RecordForm ({ initialRecord, onSubmit, onCancel }) {
  const [record, setRecord] = useState(emptyRecord);

  useEffect(() => {
    // Cuando venimos desde edición, el objeto tiene claves normalizadas (amount, status, created_at)
    if (initialRecord) {
      setRecord({
        rut_estudiante: initialRecord.rut_estudiante || '',
        cod_programa: initialRecord.cod_programa || '',
        version_programa: initialRecord.version_programa || '',
        valor_comision: initialRecord.amount ?? 0,
        estado_de_pago: initialRecord.status ?? 'pending',
        fecha_matricula: initialRecord.created_at ? initialRecord.created_at.substring(0, 10) : ''
      });
    } else {
      setRecord(emptyRecord);
    }
  }, [initialRecord]);

  function handleChange (event) {
    const { name, value } = event.target;
    const numericFields = ['valor_comision', 'version_programa'];
    const nextValue = numericFields.includes(name) ? Number(value) : value;
    setRecord({ ...record, [name]: nextValue });
  }

  function handleSubmit (event) {
    event.preventDefault();
    onSubmit(record);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium">RUT del estudiante</label>
        <input
          name="rut_estudiante"
          value={record.rut_estudiante}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded border border-slate-300 p-2"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Código de programa</label>
          <input
            name="cod_programa"
            value={record.cod_programa}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Versión</label>
          <input
            name="version_programa"
            type="number"
            value={record.version_programa}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Monto comisión</label>
          <input
            name="valor_comision"
            type="number"
            step="0.01"
            value={record.valor_comision}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Estado de pago</label>
          <select
            name="estado_de_pago"
            value={record.estado_de_pago}
            onChange={handleChange}
            className="mt-1 w-full rounded border border-slate-300 p-2"
          >
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium">Fecha de matrícula</label>
        <input
          name="fecha_matricula"
          type="date"
          value={record.fecha_matricula}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded border border-slate-300 p-2"
        />
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
