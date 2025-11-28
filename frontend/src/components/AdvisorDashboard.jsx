import { useEffect, useMemo, useState } from 'react';
import DataTable from './DataTable.jsx';
import RecordForm from './RecordForm.jsx';
import { fetchRecords, createRecord, updateRecord, deleteRecord } from '../services/api.js';

export default function AdvisorDashboard () {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    async function load (pg = page) {
      try {
        setLoading(true);
        const data = await fetchRecords(pg, limit);
        setRecords(data.records);
        setTotal(data.total);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load(page);
  }, [page]);

  const summary = useMemo(() => {
    const totals = records.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      acc.amount = (acc.amount || 0) + Number(item.amount || 0);
      return acc;
    }, {});
    return totals;
  }, [records]);

  function handleCreateClick () {
    setEditingRecord(null);
    setShowForm(true);
  }

  async function handleSubmitRecord (payload) {
    try {
      if (editingRecord) {
        await updateRecord(editingRecord.id, payload);
      } else {
        await createRecord(payload);
      }
      // refetch current page
      setShowForm(false);
      setPage(1); // go back to first page to see new records
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete (recordId) {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await deleteRecord(recordId);
      // refetch page
      setPage(1);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      {error ? <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total registros</p>
          <p className="text-2xl font-bold text-slate-800">{total}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Monto total</p>
          <p className="text-2xl font-bold text-slate-800">{summary.amount?.toLocaleString('es-CL%', { style: 'currency%', currency: 'CLP' }) || '$0'}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Aprobados</p>
          <p className="text-2xl font-bold text-slate-800">{summary.approved || 0}</p>
        </div>
      </section>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-800">Mis comisiones</h2>
        <button
          onClick={handleCreateClick}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Crear registro
        </button>
      </div>

      {loading ? (
        <div className="rounded border border-dashed border-slate-300 p-8 text-center text-slate-500">Cargando datos...</div>
      ) : (
        <>
          <DataTable
            records={records}
            onEdit={(record) => {
              setEditingRecord(record);
              setShowForm(true);
            }}
            onDelete={handleDelete}
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Mostrando {Math.min((page - 1) * limit + 1, total || 0)}–{Math.min(page * limit, total || 0)} de {total}
            </div>
            <div className="flex items-center gap-2">
              <div className="space-x-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border px-3 py-1 text-sm">Anterior</button>
                <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage((p) => p + 1)} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">Siguiente</button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Ir a página</label>
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, Math.ceil(total / limit))}
                  value={page}
                  onChange={(e) => {
                    const v = Number(e.target.value || 1);
                    if (v >= 1 && v <= Math.max(1, Math.ceil(total / limit))) setPage(v);
                  }}
                  className="w-20 rounded border px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {showForm ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm mt-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">{editingRecord ? 'Editar registro' : 'Nuevo registro'}</h3>
          <RecordForm
            initialRecord={editingRecord}
            onSubmit={handleSubmitRecord}
            onCancel={() => setShowForm(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
