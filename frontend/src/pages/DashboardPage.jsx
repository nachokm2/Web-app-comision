import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import DataTable from '../components/DataTable.jsx';
import AdminDashboard from '../components/AdminDashboard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { createRecord, deleteRecord, fetchRecords, updateRecord } from '../services/api.js';

function DashboardPage () {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

    const isAdmin = (user?.rol || user?.role || '').toString().toUpperCase() === 'ADMIN';
    if (isAdmin) {
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
    setIsModalOpen(true);
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
      setIsModalOpen(false);
      setEditingRecord(null);
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

  const isAdminView = (user?.rol || user?.role || '').toString().toUpperCase() === 'ADMIN';
  if (isAdminView) {
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
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + Crear registro
          </button>
        </div>

        {loading ? (
          <div className="rounded border border-dashed border-slate-300 p-8 text-center text-slate-500">Cargando datos...</div>
        ) : (
          <DataTable
            records={records}
            onEdit={(record) => {
              setEditingRecord(record);
              setIsModalOpen(true);
            }}
            onDelete={handleDelete}
          />
        )}

        <RecordModal
          open={isModalOpen}
          record={editingRecord}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRecord(null);
          }}
          onSubmit={handleSubmitRecord}
        />
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

// Modal de registro igual al del admin
function RecordModal ({ open, record, onClose, onSubmit }) {
  const [form, setForm] = useState({
    rut_estudiante: '',
    cod_programa: '',
    version_programa: '',
    matricula: '',
    arancel: '',
    estado_de_pago: 'Pendiente de pago',
    fecha_matricula: '',
    comentario_asesor: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setForm({
        rut_estudiante: '',
        cod_programa: '',
        version_programa: '',
        matricula: '',
        arancel: '',
        estado_de_pago: 'Pendiente de pago',
        fecha_matricula: '',
        comentario_asesor: ''
      });
      setError(null);
      return;
    }

    if (record) {
      setForm({
        rut_estudiante: record.rut_estudiante || '',
        cod_programa: record.cod_programa || '',
        version_programa: record.version_programa || '',
        matricula: record.matricula != null ? String(record.matricula) : '',
        arancel: record.arancel != null ? String(record.arancel) : '',
        estado_de_pago: record.status || 'Pendiente de pago',
        fecha_matricula: record.created_at ? record.created_at.substring(0, 10) : '',
        comentario_asesor: record.comentario_asesor || ''
      });
    }
  }, [open, record]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const isEdit = !!record;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        // En modo edición, solo enviar comentario y cambiar estado a "Pendiente de pago"
        await onSubmit({
          comentario_asesor: form.comentario_asesor.trim(),
          estado_de_pago: 'Pendiente de pago'
        });
      } else {
        // En modo creación, enviar todos los campos
        await onSubmit({
          rut_estudiante: form.rut_estudiante.trim(),
          cod_programa: form.cod_programa.trim(),
          version_programa: form.version_programa ? Number(form.version_programa) : undefined,
          matricula: form.matricula ? Number(form.matricula) : undefined,
          arancel: form.arancel ? Number(form.arancel) : undefined,
          estado_de_pago: form.estado_de_pago,
          fecha_matricula: form.fecha_matricula || undefined
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Modal de solo comentario para edición
  if (isEdit) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 overflow-y-auto">
        <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">Agregar comentario</p>
              <h3 className="text-xl font-semibold text-slate-900">Solicitar pago de comisión</h3>
              <p className="mt-1 text-xs text-slate-500">Al agregar un comentario, el estado cambiará a "Pendiente de pago".</p>
            </div>
            <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">✕</button>
          </div>

          {/* Info del registro */}
          <div className="mt-4 rounded-xl bg-slate-50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Estudiante:</span>
              <span className="font-medium text-slate-800">{record.title || record.rut_estudiante}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Programa:</span>
              <span className="font-medium text-slate-800">{record.category || record.cod_programa}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Monto comisión:</span>
              <span className="font-medium text-slate-800">
                {Number(record.amount || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Estado actual:</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                record.status === 'Pagado' ? 'bg-emerald-100 text-emerald-700' :
                record.status === 'Observado' ? 'bg-rose-100 text-rose-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {record.status}
              </span>
            </div>
          </div>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            {error && (
              <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            )}

            <label className="block text-sm text-slate-600">
              Comentario para solicitar pago
              <textarea
                name="comentario_asesor"
                value={form.comentario_asesor}
                onChange={handleChange}
                rows={4}
                placeholder="Escribe aquí tu comentario o justificación para solicitar el pago de esta comisión..."
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
              />
            </label>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !form.comentario_asesor.trim()}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Enviando...' : 'Solicitar pago'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Modal de creación (formulario completo)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">Nuevo registro</p>
            <h3 className="text-xl font-semibold text-slate-900">Registrar comisión</h3>
            <p className="mt-1 text-xs text-slate-500">Los campos marcados con * son obligatorios.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">✕</button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}

          <label className="block text-sm text-slate-600">
            RUT del estudiante *
            <input
              name="rut_estudiante"
              value={form.rut_estudiante}
              onChange={handleChange}
              required
              placeholder="12345678-9"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-600">
              Código de programa *
              <input
                name="cod_programa"
                value={form.cod_programa}
                onChange={handleChange}
                required
                placeholder="DI123_456"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block text-sm text-slate-600">
              Versión del programa
              <input
                name="version_programa"
                type="number"
                value={form.version_programa}
                onChange={handleChange}
                placeholder="1"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-600">
              Valor matrícula *
              <input
                name="matricula"
                type="number"
                step="1"
                value={form.matricula}
                onChange={handleChange}
                required
                placeholder="150000"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block text-sm text-slate-600">
              Valor arancel *
              <input
                name="arancel"
                type="number"
                step="1"
                value={form.arancel}
                onChange={handleChange}
                required
                placeholder="1500000"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          <label className="block text-sm text-slate-600">
            Fecha de matrícula
            <input
              name="fecha_matricula"
              type="date"
              value={form.fecha_matricula}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DashboardPage;
