import { useCallback, useEffect, useMemo, useState } from 'react';
import GenericTable from './GenericTable.jsx';
import { fetchAdminSchemaSnapshot, createStudentEntry } from '../services/api.js';

const STATUS_VARIANTS = {
  active: { label: 'Activo', className: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
  expired: { label: 'Observado', className: 'bg-rose-100 text-rose-700' },
  default: { label: 'Sin estado', className: 'bg-slate-100 text-slate-600' }
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'expired', label: 'Observados' }
];

function AdminDashboard () {
  const [snapshot, setSnapshot] = useState(null);
  const [activeTable, setActiveTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [entriesRequested, setEntriesRequested] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadSnapshot = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminSchemaSnapshot();
      setSnapshot(data);
      const firstTable = Object.keys(data.tables)[0];
      setActiveTable(firstTable);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const handleCreateStudent = useCallback(async (payload) => {
    await createStudentEntry(payload);
    await loadSnapshot();
  }, [loadSnapshot]);

  const summary = useMemo(() => {
    if (!snapshot) return null;
    const studentEntries = snapshot.studentEntries || [];
    const totalAsesores = snapshot.casesByAdvisor.length;
    const totalEntradas = studentEntries.length;
    const totalActivos = studentEntries.filter((entry) => normaliseStatus(entry.estado_pago).kind === 'active').length;
    const totalPendientes = studentEntries.filter((entry) => normaliseStatus(entry.estado_pago).kind === 'pending').length;
    const totalExpirados = studentEntries.filter((entry) => normaliseStatus(entry.estado_pago).kind === 'expired').length;
    return {
      totalAsesores,
      totalEntradas,
      totalActivos,
      totalPendientes,
      totalExpirados
    };
  }, [snapshot]);

  const filteredEntries = useMemo(() => {
    if (!snapshot) return [];
    const entries = snapshot.studentEntries || [];
    return entries
      .map((entry) => ({
        ...entry,
        advisorName: entry.asesor_nombre || 'Sin asesor',
        advisorEmail: entry.asesor_correo,
        estudiante: `${entry.nombres || ''} ${entry.apellidos || ''}`.trim() || entry.rut,
        programa: entry.programa_nombre || 'Sin programa',
        estado: normaliseStatus(entry.estado_pago),
        fecha: entry.fecha_matricula,
        sede: entry.sede || '—',
        categorias: entry.categorias || []
      }))
      .filter((entry) => {
        const matchesFilter = filter === 'all' ? true : entry.estado.kind === filter;
        if (!matchesFilter) return false;
        if (!query) return true;
        const haystack = `${entry.advisorName} ${entry.advisorEmail ?? ''} ${entry.estudiante} ${entry.programa} ${entry.rut}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      });
  }, [snapshot, filter, query]);

  if (loading) {
    return <div className="rounded border border-dashed border-slate-300 p-8 text-center text-slate-500">Cargando información global...</div>;
  }

  if (error) {
    return <div className="rounded border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>;
  }

  if (!snapshot) {
    return null;
  }

  const tableNames = Object.keys(snapshot.tables);
  const totalEntries = snapshot.studentEntries?.length ?? 0;

  return (
    <>
      <div className="space-y-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">Panel administrativo</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">Gestión integral de comisiones</h1>
            <p className="mt-2 max-w-3xl text-base text-slate-500">
              Monitorea en un solo lugar los casos asignados, el estado de pago y los registros del esquema <span className="font-semibold text-slate-700">comision_ua</span>.
            </p>
          </div>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="self-start rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + Agregar registro
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <SummaryCard label="Total entradas" value={summary.totalEntradas} helper="Registros de estudiantes" icon="👥" />
          <SummaryCard label="Activos" value={summary.totalActivos} helper="En seguimiento" accent="bg-emerald-50 text-emerald-600" icon="📈" />
          <SummaryCard label="Pendientes" value={summary.totalPendientes} helper="Esperando gestión" accent="bg-amber-50 text-amber-600" icon="⏳" />
          <SummaryCard label="Observados" value={summary.totalExpirados} helper="Casos objetados" accent="bg-slate-50 text-slate-600" icon="🛑" />
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Casos por asesor</h2>
            <p className="text-sm text-slate-500">Resumen detallado por responsable con métricas clave.</p>
          </div>
          <span className="text-sm text-slate-500">Ordenados descendentemente por total de casos</span>
        </div>
        <div className="space-y-4">
          {snapshot.casesByAdvisor.map((advisor) => (
            <AdvisorCard key={advisor.asesor_id} advisor={advisor} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Entradas del esquema</h2>
            <p className="text-sm text-slate-500">Filtra por estado o busca por nombre, correo o programa.</p>
          </div>
          <div className="flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
            Total asesores: <span className="ml-2 font-semibold text-slate-900">{summary.totalAsesores}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setFilter(option.id);
                  setEntriesRequested(true);
                }}
                className={`rounded-full px-4 py-1 text-sm font-medium transition ${
                  filter === option.id
                    ? 'bg-slate-900 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {option.label}
                {option.id === 'all'
                  ? ` ${totalEntries}`
                  : option.id === 'active'
                    ? ` ${summary.totalActivos}`
                    : option.id === 'pending'
                      ? ` ${summary.totalPendientes}`
                      : ` ${summary.totalExpirados}`}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por asesor, estudiante o programa"
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">⌕</span>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          {entriesRequested ? (
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Asesor</th>
                  <th className="px-4 py-3">Estudiante</th>
                  <th className="px-4 py-3">Programa</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha matrícula</th>
                  <th className="px-4 py-3">Sede</th>
                  <th className="px-4 py-3">Categorías</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-slate-400">
                      No encontramos registros con esos filtros.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.comision_id ? `comision-${entry.comision_id}` : `estudiante-${entry.rut}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{entry.advisorName}</div>
                        <p className="text-xs text-slate-500">{entry.advisorEmail || 'Sin correo'}</p>
                      </td>
                      <td className="px-4 py-3">{entry.estudiante}</td>
                      <td className="px-4 py-3">{entry.programa}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${entry.estado.className}`}>
                          {entry.estado.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">{entry.fecha ? new Date(entry.fecha).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3">{entry.sede}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{entry.categorias.length ? entry.categorias.join(', ') : 'Sin categoría'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
              Presiona <span className="font-semibold">“Todos”</span> o cualquier filtro para cargar los registros del esquema.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Inventario del esquema comision_ua</h2>
            <p className="text-sm text-slate-500">Explora cualquier tabla sin salir del panel.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tableNames.map((table) => (
              <button
                key={table}
                onClick={() => setActiveTable(table)}
                className={`rounded-full px-4 py-1 text-sm font-medium transition ${
                  activeTable === table
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {table}
              </button>
            ))}
          </div>
        </div>
        {activeTable ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-slate-500">Mostrando {snapshot.tables[activeTable].length} registros de {activeTable}.</p>
            <GenericTable rows={snapshot.tables[activeTable]} />
          </div>
        ) : null}
      </section>
        </div>

        <StudentDialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSubmit={handleCreateStudent}
          programs={snapshot.tables.programas || []}
        />
      </>
  );
}

function SummaryCard ({ label, value, helper, accent = 'bg-slate-100 text-slate-800', icon = '📊' }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-xl ${accent}`}>{icon}</div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="text-xs text-slate-400">{helper}</p> : null}
    </div>
  );
}

function AdvisorCard ({ advisor }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-transparent hover:ring-indigo-100">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-900">{advisor.nombre_completo}</p>
          <p className="text-sm text-slate-500">{advisor.correo || 'Sin correo registrado'}</p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <Metric label="Casos" value={advisor.total_casos} />
          <Metric label="Matrículas" value={advisor.total_matricula} />
          <Metric label="Valor comisión" value={advisor.total_valor_comision.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })} />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {advisor.casos.length === 0 ? (
          <p className="text-sm text-slate-500">Sin casos asignados.</p>
        ) : (
          advisor.casos.map((caso) => (
            <div key={caso.comision_id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">#{caso.comision_id} · {caso.programa}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(caso.estado_pago).className}`}>
                  {getStatusStyles(caso.estado_pago).label}
                </span>
              </div>
              <div className="mt-1 grid gap-1 text-xs text-slate-500 md:grid-cols-2">
                <p>Estudiante: <span className="text-slate-800">{caso.estudiante || caso.rut_estudiante || '—'}</span></p>
                <p>Fecha matrícula: {caso.fecha_matricula ? new Date(caso.fecha_matricula).toLocaleDateString() : '—'}</p>
                <p>Sede: {caso.sede || '—'}</p>
                <p>Versión: {caso.version_programa ?? '—'}</p>
                <p>Categorías: {caso.categorias?.length ? caso.categorias.join(', ') : 'Sin categoría'}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Metric ({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

const initialStudentForm = () => ({
  rut: '',
  nombres: '',
  apellidos: '',
  correo: '',
  telefono: '',
  codPrograma: '',
  nombrePrograma: '',
  centroCostos: ''
});

function StudentDialog ({ open, onClose, onSubmit, programs }) {
  const [form, setForm] = useState(initialStudentForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setForm(initialStudentForm());
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === 'rut'
      ? value.replace(/[.\-]/g, '').toUpperCase()
      : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleProgramSelect = (event) => {
    const selectedCode = event.target.value;
    if (!selectedCode) {
      setForm((prev) => ({ ...prev, codPrograma: '', nombrePrograma: '' }));
      return;
    }
    const selectedProgram = programs.find((program) => program.cod_banner === selectedCode);
    setForm((prev) => ({
      ...prev,
      codPrograma: selectedCode,
      nombrePrograma: selectedProgram?.nombre || prev.nombrePrograma
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const cleanRut = form.rut.replace(/[.\-]/g, '').toUpperCase();
      await onSubmit({
        ...form,
        rut: cleanRut.trim(),
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        correo: form.correo.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        codPrograma: form.codPrograma.trim(),
        nombrePrograma: form.nombrePrograma.trim(),
        centroCostos: form.centroCostos.trim() || undefined
      });
      setForm(initialStudentForm());
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">Nuevo estudiante</p>
            <h3 className="text-2xl font-semibold text-slate-900">Registrar estudiante y programa</h3>
            <p className="mt-1 text-sm text-slate-500">Los campos marcados con * son obligatorios.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">✕</button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error ? <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              RUT *
              <input
                name="rut"
                value={form.rut}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="12.345.678-9"
                maxLength={12}
                required
              />
            </label>
            <label className="text-sm text-slate-600">
              Teléfono
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="+56 9 1234 5678"
                maxLength={12}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Nombres *
              <input
                name="nombres"
                value={form.nombres}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Genesis"
                maxLength={60}
                required
              />
            </label>
            <label className="text-sm text-slate-600">
              Apellidos *
              <input
                name="apellidos"
                value={form.apellidos}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Valdés"
                maxLength={60}
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Correo
              <input
                name="correo"
                type="email"
                value={form.correo}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="correo@dominio.cl"
              />
            </label>
            <label className="text-sm text-slate-600">
              Centro de costos
              <input
                name="centroCostos"
                value={form.centroCostos}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Opcional"
                maxLength={30}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Programa existente
              <select
                value={form.codPrograma && programs.some((program) => program.cod_banner === form.codPrograma) ? form.codPrograma : ''}
                onChange={handleProgramSelect}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Seleccionar de la lista</option>
                {programs.map((program) => (
                  <option key={program.cod_banner} value={program.cod_banner}>
                    {program.cod_banner} · {program.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Código programa *
              <input
                name="codPrograma"
                value={form.codPrograma}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="COD123"
                maxLength={12}
                required
              />
            </label>
          </div>

          <div>
            <label className="text-sm text-slate-600">
              Nombre programa *
              <input
                name="nombrePrograma"
                value={form.nombrePrograma}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="MBA Gestión"
                maxLength={120}
                required
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? 'Guardando...' : 'Guardar registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function normaliseStatus (value) {
  const normalized = (value || '').toLowerCase();
  if (['pagado', 'aprobado', 'activo'].some((keyword) => normalized.includes(keyword))) {
    return { ...STATUS_VARIANTS.active, kind: 'active' };
  }
  if (['pendiente', 'revision', 'revisión', 'espera'].some((keyword) => normalized.includes(keyword))) {
    return { ...STATUS_VARIANTS.pending, kind: 'pending' };
  }
  if (['expirado', 'inactivo', 'rechazado', 'cancelado'].some((keyword) => normalized.includes(keyword))) {
    return { ...STATUS_VARIANTS.expired, kind: 'expired' };
  }
  return { ...STATUS_VARIANTS.default, kind: 'all' };
}

function getStatusStyles (value) {
  return normaliseStatus(value);
}

export default AdminDashboard;
