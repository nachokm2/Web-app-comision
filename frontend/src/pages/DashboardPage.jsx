import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import DataTable from '../components/DataTable.jsx';
import RecordForm from '../components/RecordForm.jsx';
import AdminDashboard from '../components/AdminDashboard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { createRecord, deleteRecord, fetchRecords, updateRecord } from '../services/api.js';

function DashboardPage () {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function loadRecords () {
      try {
        setLoading(true);
        const data = await fetchRecords();
        setRecords(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (user?.role === 'admin') {
      setLoading(false);
      setRecords([]);
      return;
    }

    loadRecords();
  }, [user]);

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
        const updated = await updateRecord(editingRecord.id, payload);
        setRecords((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createRecord(payload);
        setRecords((prev) => [created, ...prev]);
      }
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete (recordId) {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await deleteRecord(recordId);
      setRecords((prev) => prev.filter((item) => item.id !== recordId));
    } catch (err) {
      setError(err.message);
    }
  }

  if (user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
          <AdminDashboard />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {error ? <Alert message={error} onClose={() => setError(null)} /> : null}
        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard title="Total registros" value={records.length} />
          <SummaryCard title="Monto total" value={summary.amount?.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' }) || '$0'} />
          <SummaryCard title="Aprobados" value={summary.approved || 0} accent="bg-emerald-100 text-emerald-800" />
        </section>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Tus registros</h2>
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
          <DataTable
            records={records}
            onEdit={(record) => {
              setEditingRecord(record);
              setShowForm(true);
            }}
            onDelete={handleDelete}
          />
        )}

        {showForm ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              {editingRecord ? 'Editar registro' : 'Nuevo registro'}
            </h3>
            <RecordForm
              initialRecord={editingRecord}
              onSubmit={handleSubmitRecord}
              onCancel={() => setShowForm(false)}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}

function SummaryCard ({ title, value, accent }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${accent || ''}`}>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function Alert ({ message, onClose }) {
  return (
    <div className="flex items-center justify-between rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <p>{message}</p>
      <button onClick={onClose} className="font-semibold">Cerrar</button>
    </div>
  );
}

export default DashboardPage;
