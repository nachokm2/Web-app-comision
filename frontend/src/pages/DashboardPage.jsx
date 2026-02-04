import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import DataTable from '../components/DataTable.jsx';
import AdminDashboard from '../components/AdminDashboard.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import PaymentTrendChart from '../components/PaymentTrendChart.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { createRecord, deleteRecord, fetchRecords, updateRecord, fetchProgramsCatalog, uploadBulkRecords } from '../services/api.js';
import { buildCsvFromRecords, slugify } from '../utils/csvExport.js';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

function formatCurrency (value = 0) {
  return currencyFormatter.format(Math.max(0, Number(value) || 0));
}

function DashboardPage () {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentMonthOnly, setCurrentMonthOnly] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashReady, setSplashReady] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [tableFiltersInfo, setTableFiltersInfo] = useState({ hasFilters: false, label: '', count: 0, records: [] });

  const handleTableFiltersChange = useCallback((info) => {
    if (info) {
      setTableFiltersInfo({
        hasFilters: Boolean(info.hasFilters),
        label: info.label || '',
        count: info.count || (info.records?.length ?? 0),
        records: info.records || []
      });
    }
  }, []);

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

  useEffect(() => {
    if (!loading) {
      setSplashReady(true);
    }
  }, [loading]);

  const summary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let entriesThisMonth = 0;
    let paid = 0;
    let pending = 0;
    let rejected = 0;
    let totalAmount = 0;
    let monthAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let rejectedAmount = 0;

    records.forEach((record) => {
      const amount = Number(record.amount) || 0;
      totalAmount += amount;
      if (record.created_at) {
        const created = new Date(record.created_at);
        if (created.getMonth() === currentMonth && created.getFullYear() === currentYear) {
          entriesThisMonth += 1;
          monthAmount += amount;
        }
      }

      const status = (record.status || '').toLowerCase();
      if (/pagado|aprobado|paid/.test(status)) {
        paid += 1;
        paidAmount += amount;
      } else if (/pendiente|espera|pending/.test(status)) {
        pending += 1;
        pendingAmount += amount;
      } else if (/rechazado|observado|rejected|expirado/.test(status)) {
        rejected += 1;
        rejectedAmount += amount;
      }
    });

    return {
      totalEntries: records.length,
      entriesThisMonth,
      paid,
      pending,
      rejected,
      totalAmount,
      monthAmount,
      paidAmount,
      pendingAmount,
      rejectedAmount
    };
  }, [records]);

  const paymentTrendData = useMemo(() => {
    if (!records.length) return [];
    const monthFormatter = new Intl.DateTimeFormat('es-CL', { month: 'short', year: 'numeric' });
    const buckets = new Map();

    records.forEach((record) => {
      if (!record.created_at) return;
      const created = new Date(record.created_at);
      if (Number.isNaN(created.getTime())) return;
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          month: monthFormatter.format(created),
          paid: 0,
          pending: 0,
          rejected: 0
        });
      }

      const bucket = buckets.get(key);
      const status = (record.status || '').toLowerCase();
      if (/pagado|aprobado|paid/.test(status)) {
        bucket.paid += 1;
      } else if (/pendiente|espera|pending/.test(status)) {
        bucket.pending += 1;
      } else if (/rechazado|observado|rejected|expirado/.test(status)) {
        bucket.rejected += 1;
      }
    });

    return Array.from(buckets.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-8);
  }, [records]);

  const filteredRecords = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return records.filter((record) => {
      if (currentMonthOnly) {
        if (!record.created_at) return false;
        const created = new Date(record.created_at);
        if (created.getMonth() !== month || created.getFullYear() !== year) {
          return false;
        }
      }

      if (statusFilter === 'all') return true;
      const status = (record.status || '').toLowerCase();
      if (statusFilter === 'paid') {
        return /pagado|aprobado|paid/.test(status);
      }
      if (statusFilter === 'pending') {
        return /pendiente|espera|pending/.test(status);
      }
      if (statusFilter === 'rejected') {
        return /rechazado|observado|rejected|expirado/.test(status);
      }
      return true;
    });
  }, [records, statusFilter, currentMonthOnly]);

  const activeFilterLabel = useMemo(() => {
    if (tableFiltersInfo.hasFilters) {
      return tableFiltersInfo.label || 'Filtro personalizado';
    }
    if (currentMonthOnly) {
      return 'Mes actual';
    }
    if (statusFilter === 'paid') return 'Pagados';
    if (statusFilter === 'pending') return 'Pendientes';
    if (statusFilter === 'rejected') return 'Rechazados';
    return 'Total entradas';
  }, [tableFiltersInfo, currentMonthOnly, statusFilter]);

  const visibleRecords = tableFiltersInfo.hasFilters
    ? (tableFiltersInfo.records || [])
    : filteredRecords;

  const totalVisibleCount = visibleRecords.length;

  const handleBulkDownload = useCallback(() => {
    if (!visibleRecords.length) {
      window.alert('No hay registros para descargar con los filtros actuales.');
      return;
    }
    setIsBulkDownloading(true);
    try {
      const csv = buildCsvFromRecords(visibleRecords);
      const labelSlug = slugify(activeFilterLabel || 'filtro-personalizado');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `comisiones-${labelSlug}-${timestamp}.csv`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsBulkDownloading(false);
    }
  }, [visibleRecords, activeFilterLabel]);

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
      {showSplash ? (
        <LoadingScreen
          isReady={splashReady}
          onComplete={() => setShowSplash(false)}
        />
      ) : null}
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {error ? <Alert message={error} onClose={() => setError(null)} /> : null}
        {paymentTrendData.length > 0 ? (
          <PaymentTrendChart data={paymentTrendData} />
        ) : null}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filtro activo</p>
              <p className="text-lg font-semibold text-slate-900">{activeFilterLabel}</p>
              <p className="text-xs text-slate-500">{totalVisibleCount} registros listos para exportar</p>
            </div>
            <button
              type="button"
              onClick={handleBulkDownload}
              disabled={isBulkDownloading || loading || totalVisibleCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBulkDownloading ? 'Generando CSV...' : `Descargar ${activeFilterLabel}`}
              <span className="text-xs font-normal text-white/80">({totalVisibleCount})</span>
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <SummaryCard
              title="Total entradas"
              value={summary.totalEntries}
              subtitle="Registros de estudiantes"
              icon="👥"
              iconAccent="bg-purple-100 text-purple-600"
              active={statusFilter === 'all' && !currentMonthOnly}
              amountLabel={formatCurrency(summary.totalAmount)}
              onClick={() => {
                setStatusFilter('all');
                setCurrentMonthOnly(false);
              }}
            />
            <SummaryCard
              title="Mes actual"
              value={summary.entriesThisMonth}
              subtitle="Registros del mes en curso"
              icon="📅"
              iconAccent="bg-indigo-100 text-indigo-600"
              active={currentMonthOnly}
              amountLabel={formatCurrency(summary.monthAmount)}
              onClick={() => {
                setCurrentMonthOnly((prev) => {
                  const next = !prev;
                  if (next) {
                    setStatusFilter('all');
                  }
                  return next;
                });
              }}
            />
            <SummaryCard
              title="Pagados"
              value={summary.paid}
              subtitle="En seguimiento"
              icon="📈"
              iconAccent="bg-emerald-100 text-emerald-600"
              active={statusFilter === 'paid'}
              amountLabel={formatCurrency(summary.paidAmount)}
              onClick={() => {
                setStatusFilter('paid');
                setCurrentMonthOnly(false);
              }}
            />
            <SummaryCard
              title="Pendientes"
              value={summary.pending}
              subtitle="Esperando gestión"
              icon="⏳"
              iconAccent="bg-amber-100 text-amber-600"
              active={statusFilter === 'pending'}
              amountLabel={formatCurrency(summary.pendingAmount)}
              onClick={() => {
                setStatusFilter('pending');
                setCurrentMonthOnly(false);
              }}
            />
            <SummaryCard
              title="Rechazados"
              value={summary.rejected}
              subtitle="Casos rechazados"
              icon="🛑"
              iconAccent="bg-rose-100 text-rose-600"
              active={statusFilter === 'rejected'}
              amountLabel={formatCurrency(summary.rejectedAmount)}
              onClick={() => {
                setStatusFilter('rejected');
                setCurrentMonthOnly(false);
              }}
            />
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Tus registros</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
            >
              📥 Carga masiva
            </button>
            <button
              onClick={handleCreateClick}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              + Crear registro
            </button>
          </div>
        </div>

        {!loading && (
          <DataTable
            records={filteredRecords}
            onEdit={(record) => {
              setEditingRecord(record);
              setIsModalOpen(true);
            }}
            onDelete={handleDelete}
            onFiltersChange={handleTableFiltersChange}
          />
        )}

        <RecordModal
          open={isModalOpen}
          record={editingRecord}
          currentUser={user}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRecord(null);
          }}
          onSubmit={handleSubmitRecord}
        />

        <BulkUploadModal
          open={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onUploaded={(newRecords = []) => {
            if (Array.isArray(newRecords) && newRecords.length > 0) {
              setRecords((prev) => [...newRecords, ...prev]);
            }
          }}
        />
      </main>
    </div>
  );
}

function SummaryCard ({ title, value = 0, subtitle, icon, iconAccent = 'bg-slate-100 text-slate-600', active, onClick, amountLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 ${
        active ? 'border-indigo-200 bg-indigo-50 ring-2 ring-indigo-200' : ''
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-xl ${iconAccent}`}>
          <span aria-hidden="true">{icon}</span>
        </div>
        {amountLabel ? (
          <p className="text-xs font-semibold text-slate-500">{amountLabel}</p>
        ) : null}
      </div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
    </button>
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

const MAX_BULK_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

function BulkUploadModal ({ open, onClose, onUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setUploading(false);
      setError(null);
      setSummary(null);
    }
  }, [open]);

  if (!open) return null;

  const handleFileSelection = (file) => {
    if (!file) return;
    if (file.size > MAX_BULK_FILE_SIZE) {
      setError('El archivo supera el límite de 2 MB.');
      setSelectedFile(null);
      setSummary(null);
      return;
    }
    setSelectedFile(file);
    setError(null);
    setSummary(null);
  };

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];
    handleFileSelection(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    handleFileSelection(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Selecciona un archivo para continuar.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const result = await uploadBulkRecords(selectedFile);
      setSummary(result);
      onUploaded?.(result.records || []);
    } catch (err) {
      setSummary(null);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const templateUrl = '/templates/carga_masiva_comisiones.csv';

  // Helper para descargar observaciones como CSV
  function handleDownloadObservations () {
    if (!summary?.errors?.length) {
      window.alert('No hay registros con observaciones para descargar.');
      return;
    }
    // Generar CSV con fila, mensajes y todos los datos relevantes
    const header = [
      'Fila', 'RUT', 'Nombres', 'Apellidos', 'Correo', 'Código programa', 'Nombre programa', 'Matrícula', 'Sede', 'Versión', 'Observaciones'
    ];
    const rows = summary.errors.map((err) => {
      const messages = Array.isArray(err.messages) ? err.messages.join('; ') : err.message;
      return [
        err.row,
        err.rut,
        err.nombres,
        err.apellidos,
        err.correo,
        err.codPrograma,
        err.nombrePrograma,
        err.matricula,
        err.sede,
        err.versionPrograma,
        messages
      ];
    });
    const csv = `${header.join(',')}` + '\n' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n') + '\n';
    const filename = `observaciones-carga-masiva-${new Date().toISOString().split('T')[0]}.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  const errorsPreview = summary?.errors?.slice(0, 5) || [];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">Carga masiva</p>
            <h3 className="text-xl font-semibold text-slate-900">Sube varias comisiones desde Excel</h3>
            <p className="mt-1 text-sm text-slate-500">Sigue los pasos para validar tus datos antes de enviarlos.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">✕</button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-700">1. Descarga la plantilla</p>
            <p className="mt-1 text-xs text-slate-500">Incluye ejemplos y todos los campos obligatorios.</p>
            <a
              href={templateUrl}
              download
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              ⬇️ Descargar plantilla CSV
            </a>
          </div>

          <div
            className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-slate-400"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              id="bulk-upload-input"
              type="file"
              accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={handleInputChange}
            />
            <label htmlFor="bulk-upload-input" className="flex cursor-pointer flex-col items-center gap-2 text-sm text-slate-600">
              <span className="text-3xl">📄</span>
              <span className="font-semibold">2. Arrastra o selecciona tu archivo</span>
              <span className="text-xs text-slate-500">Formatos admitidos: .csv o .xlsx (máx. 2 MB)</span>
            </label>
            {selectedFile ? (
              <div className="mt-3 rounded-full bg-slate-100 px-4 py-1 text-xs font-medium text-slate-600">
                {selectedFile.name} · {(selectedFile.size / 1024).toFixed(0)} KB
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {summary ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                  {summary.inserted} registros creados
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                  {summary.failed} con observaciones
                </span>
                {summary.failed > 0 ? (
                  <button
                    type="button"
                    onClick={handleDownloadObservations}
                    className="rounded-full bg-amber-600 px-4 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    Descargar observaciones
                  </button>
                ) : null}
              </div>
              {errorsPreview.length > 0 ? (
                <div>
                  <p className="text-sm font-semibold text-slate-700">Filas que necesitan revisión:</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {errorsPreview.map((errItem, index) => (
                      <li key={`${errItem.row}-${index}`} className="rounded bg-slate-100 px-3 py-1">
                        Fila {errItem.row}: {Array.isArray(errItem.messages) ? errItem.messages.join('; ') : errItem.message}
                      </li>
                    ))}
                  </ul>
                  {summary?.errors && summary.errors.length > errorsPreview.length ? (
                    <p className="mt-2 text-xs text-slate-500">Se ocultaron {summary.errors.length - errorsPreview.length} filas adicionales.</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-600">¡Todo listo! Los registros ya están disponibles en tu tabla.</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? 'Cargando...' : 'Subir archivo'}
          </button>
        </div>
      </div>
    </div>
  );
}

const initialRecordForm = () => ({
  rut: '',
  nombres: '',
  apellidos: '',
  correo: '',
  telefono: '',
  codPrograma: '',
  nombrePrograma: '',
  centroCostos: '',
  estadoPago: 'Pendiente de pago',
  fechaMatricula: '',
  sede: 'Santiago',
  matricula: '',
  versionPrograma: '1',
  comentario_asesor: ''
});

// Modal de registro igual al del admin
function RecordModal ({ open, record, onClose, onSubmit, currentUser }) {
  const [form, setForm] = useState(() => initialRecordForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [catalogError, setCatalogError] = useState(null);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const advisorNameFromFields = [currentUser?.nombres, currentUser?.apellidos].filter(Boolean).join(' ').trim();
  const usernameFallback = currentUser?.username ? currentUser.username.split('@')[0] || currentUser.username : undefined;
  const advisorDisplayName = advisorNameFromFields || currentUser?.nombre_completo || currentUser?.nombreCompleto || currentUser?.nombre || usernameFallback || 'Asesor asignado';

  useEffect(() => {
    if (!open) {
      setForm(initialRecordForm());
      setError(null);
      setCatalogError(null);
      return;
    }

    if (record) {
      setForm((prev) => ({
        ...prev,
        comentario_asesor: record.comentario_asesor || ''
      }));
    } else {
      setForm(initialRecordForm());
    }
    setError(null);
  }, [open, record]);

  useEffect(() => {
    if (!open || record) return;
    let cancelled = false;
    setLoadingPrograms(true);
    setCatalogError(null);
    fetchProgramsCatalog()
      .then((list) => {
        if (!cancelled) {
          setPrograms(Array.isArray(list) ? list : []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalogError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPrograms(false);
        }
      });
    return () => { cancelled = true; };
  }, [open, record]);

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;
    if (name === 'rut') {
      nextValue = value.replace(/[.\-]/g, '').toUpperCase();
    } else if (name === 'matricula') {
      nextValue = value.replace(/[^0-9]/g, '');
    }
    setForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleProgramSelect = (event) => {
    const selectedCode = event.target.value;
    if (!selectedCode) {
      setForm((prev) => ({ ...prev, codPrograma: '', nombrePrograma: '' }));
      return;
    }
    const selectedProgram = programs.find((program) => program.cod_programa === selectedCode);
    setForm((prev) => ({
      ...prev,
      codPrograma: selectedCode,
      nombrePrograma: selectedProgram?.nombre || '',
      centroCostos: selectedProgram?.centro_de_costos || prev.centroCostos
    }));
  };

  const isEdit = !!record;
  const programReadOnly = programs.length > 0 && !catalogError;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        await onSubmit({
          comentario_asesor: form.comentario_asesor.trim(),
          estado_de_pago: 'Pendiente de pago'
        });
      } else {
        const payload = {
          rut: form.rut.trim(),
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          correo: form.correo.trim(),
          telefono: form.telefono.trim() || undefined,
          codPrograma: form.codPrograma.trim(),
          nombrePrograma: form.nombrePrograma.trim(),
          centroCostos: form.centroCostos.trim() || undefined,
                 estadoPago: 'Pendiente de pago',
          fechaMatricula: form.fechaMatricula || undefined,
          sede: form.sede || undefined,
          matricula: form.matricula !== '' ? parseInt(form.matricula, 10) : undefined,
          versionPrograma: form.versionPrograma || undefined,
          comentarioAsesor: form.comentario_asesor.trim() || undefined
        };
        await onSubmit(payload);
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

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-600">
              Asesor asignado *
              <input
                value={advisorDisplayName}
                disabled
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
              />
              <span className="mt-1 block text-xs text-slate-400">Este registro se asociará automáticamente a tu usuario.</span>
            </label>
            <label className="block text-sm text-slate-600">
              Estado de pago
                <input
                  name="estadoPago"
                  value={form.estadoPago}
                  readOnly
                  disabled
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
                />
                <span className="mt-1 block text-xs text-slate-400">El estado lo gestiona el equipo administrativo.</span>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm text-slate-600">
              Fecha matrícula
              <input
                name="fechaMatricula"
                type="date"
                value={form.fechaMatricula}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block text-sm text-slate-600">
              Sede
              <select
                name="sede"
                value={form.sede}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="Santiago">Santiago</option>
                <option value="Temuco">Temuco</option>
                <option value="Online">Online</option>
              </select>
            </label>
            <label className="block text-sm text-slate-600">
              Versión programa
              <select
                name="versionPrograma"
                value={form.versionPrograma}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4">
            <label className="block text-sm text-slate-600">
              Matrícula
              <input
                name="matricula"
                value={form.matricula}
                onChange={handleChange}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-600">
              RUT *
              <input
                name="rut"
                value={form.rut}
                onChange={handleChange}
                required
                placeholder="12.345.678-9"
                maxLength={12}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block text-sm text-slate-600">
              Teléfono
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                placeholder="+56 9 1234 5678"
                maxLength={12}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-600">
              Nombres *
              <input
                name="nombres"
                value={form.nombres}
                onChange={handleChange}
                required
                placeholder="Genesis"
                maxLength={60}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block text-sm text-slate-600">
              Apellidos *
              <input
                name="apellidos"
                value={form.apellidos}
                onChange={handleChange}
                required
                placeholder="Valdés"
                maxLength={60}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-600">
              Correo *
              <input
                name="correo"
                type="email"
                value={form.correo}
                onChange={handleChange}
                required
                placeholder="correo@dominio.cl"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block text-sm text-slate-600">
              Centro de costos
              <input
                name="centroCostos"
                value={form.centroCostos}
                onChange={handleChange}
                placeholder="Opcional"
                maxLength={30}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-600">
              Programa existente
              <select
                value={form.codPrograma && programs.some((program) => program.cod_programa === form.codPrograma) ? form.codPrograma : ''}
                onChange={handleProgramSelect}
                disabled={loadingPrograms}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
              >
                <option value="">Seleccionar de la lista</option>
                {programs.map((program) => (
                  <option key={program.cod_programa} value={program.cod_programa}>
                    {program.cod_programa} · {program.nombre}
                  </option>
                ))}
              </select>
              {loadingPrograms ? (
                <span className="mt-1 inline-block text-xs text-slate-400">Cargando programas...</span>
              ) : null}
              {catalogError ? (
                <span className="mt-1 inline-block text-xs text-amber-600">{catalogError}</span>
              ) : null}
            </label>
            <label className="block text-sm text-slate-600">
              Código programa *
              <input
                name="codPrograma"
                value={form.codPrograma}
                onChange={handleChange}
                required
                placeholder="COD123"
                maxLength={12}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm text-slate-600">
              Nombre programa *
              <input
                name="nombrePrograma"
                value={form.nombrePrograma}
                onChange={handleChange}
                readOnly={programReadOnly}
                required
                placeholder="Selecciona un programa"
                maxLength={120}
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-slate-800 focus:outline-none ${programReadOnly ? 'border-slate-200 bg-slate-50 cursor-not-allowed' : 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
              />
            </label>
          </div>

          <div>
            <label className="block text-sm text-slate-600">
              Comentario (opcional)
              <textarea
                name="comentario_asesor"
                value={form.comentario_asesor}
                onChange={handleChange}
                rows={3}
                maxLength={500}
                placeholder="Agregar contexto para el equipo administrativo"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              disabled={submitting}
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
