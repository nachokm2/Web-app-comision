import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import DataTable from '../components/DataTable.jsx';
import RecordForm from '../components/RecordForm.jsx';
import AdminDashboard from '../components/AdminDashboard.jsx';
import AdvisorDashboard from '../components/AdvisorDashboard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { createRecord, deleteRecord, fetchRecords, updateRecord } from '../services/api.js';

function DashboardPage () {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    async function loadRecords (pg = page) {
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

    if (user?.role === 'admin') {
      setLoading(false);
      setRecords([]);
      return;
    }

    // Si el usuario tiene el rol con id = 1 (Asesor comercial), no cargamos aquí: AdvisorDashboard gestionará su carga
    const roleIds = Array.isArray(user?.role_ids) ? user.role_ids.map((id) => Number(id)) : [];
    const isAsesorById = roleIds.includes(1);
    if (isAsesorById) {
      setLoading(false);
      setRecords([]);
      return;
    }

    loadRecords(page);
  }, [user, page]);

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
      setShowForm(false);
      setPage(1); // go back to first page to show new record
    } catch (err) {
      setError(err.message);
    }
  }
  async function handleDelete (recordId) {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await deleteRecord(recordId);
      setPage(1);
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

  // Vista para Asesor comercial: comprobar por id de rol = 1
  const roleIds = Array.isArray(user?.role_ids) ? user.role_ids.map((id) => Number(id)) : [];
  const isAsesorById = roleIds.includes(1);
  if (isAsesorById) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
          <AdvisorDashboard />
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
          <SummaryCard title="🚀 Total registros" value={total} />
          <SummaryCard title="📈 Monto total" value={summary.amount?.toLocaleString('es-CL%', { style: 'currency%', currency: 'CLP' }) || '$0'} />
          <SummaryCard title="✅ Aprobados" value={summary.approved || 0} accent="bg-emerald-100 text-emerald-800" />
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
              <div className="text-sm text-slate-600">Mostrando {Math.min((page - 1) * limit + 1, total || 0)}–{Math.min(page * limit, total || 0)} de {total}</div>
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
    <div className={`flex flex-col gap-y-2 items-center rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${accent || ''}`}>
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
