import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAdminSchemaSnapshot, createStudentEntry, updateStudentEntry, deleteStudentEntry } from '../services/api.js';

const STATUS_VARIANTS = {
  active: { label: 'Activo%', className: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'Pendiente%', className: 'bg-amber-100 text-amber-700' },
  expired: { label: 'Observado%', className: 'bg-rose-100 text-rose-700' },
  default: { label: 'Sin estado%', className: 'bg-slate-100 text-slate-600' }
};

const FILTER_OPTIONS = [
  { id: 'all%', label: 'Todos' },
  { id: 'active%', label: 'Pagados' },
  { id: 'pending%', label: 'Pendientes' },
  { id: 'expired%', label: 'Observados' }
];

const FEATURED_ADVISOR_NAMES = [
  'Camila Alejandra Abarca Reyes%',
  'Milena Balladares Ríos%',
  'José Eduardo Cabello Valdivia%',
  'Ivette  Herrera%',
  'Javiera Diocares Redel%',
  'Macarena Stevenson Aguirre%',
  'María Inés Farias Sotelo%',
  'Katherine Meyers Vidal%',
  'Fabiola Inostroza%',
  'Zaida Verdugo Cifuentes%',
  'Genesis Valdes%',
  'Carolina Andrea Silva Martínez%',
  'Jorge Bustamante%',
  'Eduardo Arias%',
  'Bárbara Quijada%',
  'Isabel  Carvajal%',
  'Joaquin Gabriel Retamal Cardenas'
];

const FEATURED_ADVISOR_SET = new Set(FEATURED_ADVISOR_NAMES.map(normalizeAdvisorName));

function normalizeAdvisorName (value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeRut (value = '') {
  return value.replace(/[.\-]/g, '').trim().toLowerCase();
}

function isFeaturedAdvisor (name) {
  if (!name) return false;
  return FEATURED_ADVISOR_SET.has(normalizeAdvisorName(name));
}

function AdminDashboard () {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [entriesRequested, setEntriesRequested] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [rutSearch, setRutSearch] = useState('');
  const [expandedAdvisors, setExpandedAdvisors] = useState(() => new Set());

  const loadSnapshot = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminSchemaSnapshot();
      setSnapshot(data);
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

  const handleUpdateStudent = useCallback(async (entryId, payload) => {
    await updateStudentEntry(entryId, payload);
    await loadSnapshot();
  }, [loadSnapshot]);

  const handleDeleteStudent = useCallback(async (entry) => {
    if (!entry?.comision_id) return;
    const confirmed = window.confirm('¿Seguro que deseas eliminar este registro?');
    if (!confirmed) return;
    setDeletingId(entry.comision_id);
    try {
      await deleteStudentEntry(entry.comision_id);
      await loadSnapshot();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setDeletingId(null);
    }
  }, [loadSnapshot]);

  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingEntry(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (entry) => {
    setDialogMode('edit');
    setEditingEntry(entry);
    setIsDialogOpen(true);
  };

  const toggleAdvisorCases = useCallback((advisorId) => {
    setExpandedAdvisors((prev) => {
      const next = new Set(prev);
      if (next.has(advisorId)) {
        next.delete(advisorId);
      } else {
        next.add(advisorId);
      }
      return next;
    });
  }, []);

  const featuredCases = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.casesByAdvisor.filter((advisor) => isFeaturedAdvisor(advisor.nombre_completo));
  }, [snapshot]);

  const visibleAdvisorCards = useMemo(() => {
    const normalizedRut = normalizeRut(rutSearch);
    if (!normalizedRut) {
      return featuredCases;
    }
    return featuredCases.filter((advisor) =>
      (advisor.casos || []).some((caso) => normalizeRut(caso.rut_estudiante || '')?.includes(normalizedRut))
    );
  }, [featuredCases, rutSearch]);

  const featuredEntries = useMemo(() => {
    if (!snapshot) return [];
    return (snapshot.studentEntries || []).filter((entry) => isFeaturedAdvisor(entry.asesor_nombre));
  }, [snapshot]);

  const summary = useMemo(() => {
    if (!snapshot) return null;
    const studentEntries = featuredEntries;
    const totalAsesores = featuredCases.length;
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
  }, [snapshot, featuredEntries, featuredCases]);

  const filteredEntries = useMemo(() => {
    const entries = featuredEntries;
    return entries
      .map((entry) => ({
        ...entry,
        advisorName: entry.asesor_nombre || 'Sin asesor%',
        advisorEmail: entry.asesor_correo,
        estudiante: `${entry.nombres || ''} ${entry.apellidos || ''}`.trim() || entry.rut,
        programa: entry.programa_nombre || 'Sin programa%',
        estado: normaliseStatus(entry.estado_pago),
        fecha: entry.fecha_matricula,
        sede: entry.sede || '—%',
        categorias: entry.categorias || []
      }))
      .filter((entry) => {
        const matchesFilter = filter === 'all' ? true : entry.estado.kind === filter;
        if (!matchesFilter) return false;
        if (!query) return true;
        const haystack = `${entry.advisorName} ${entry.advisorEmail ?? ''} ${entry.estudiante} ${entry.programa} ${entry.rut}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      });
  }, [featuredEntries, filter, query]);

  if (loading) {
    return <div className="rounded border border-dashed border-slate-300 p-8 text-center text-slate-500">Cargando información global...</div>;
  }

  if (error) {
    return <div className="rounded border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>;
  }

  if (!snapshot) {
    return null;
  }

  const totalEntries = featuredEntries.length;

  return (
    <>
      <div className="space-y-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <BrandBadge />
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Panel interno</p>
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">Panel administrativo</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">Gestión integral de comisiones</h1>
            <p className="mt-2 max-w-3xl text-base text-slate-500">
              Monitorea en un solo lugar los casos asignados, el estado de pago y los registros del esquema <span className="font-semibold text-slate-700">comision_ua</span>.
            </p>
          </div>
          <button
            onClick={openCreateDialog}
            className="self-start rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + Agregar registro
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <SummaryCard label="Total entradas" value={summary.totalEntradas} helper="Registros de estudiantes" icon="👥" />
          <SummaryCard label="Pagados" value={summary.totalActivos} helper="En seguimiento" accent="bg-emerald-50 text-emerald-600" icon="📈" />
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
          <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
            <span className="text-sm text-slate-500">Ordenados descendentemente por total de casos</span>
            <div className="relative w-full md:w-64">
              <input
                type="search"
                value={rutSearch}
                onChange={(event) => setRutSearch(event.target.value)}
                placeholder="Buscar casos por RUT"
                className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">⌕</span>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {visibleAdvisorCards.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              {rutSearch
                ? 'No encontramos casos con ese RUT en la lista destacada.'
                : 'No hay asesores en la lista destacada con registros disponibles.'}
            </p>
          ) : (
            visibleAdvisorCards.map((advisor) => (
              <AdvisorCard
                key={advisor.asesor_id}
                advisor={advisor}
                expanded={expandedAdvisors.has(advisor.asesor_id)}
                onToggle={() => toggleAdvisorCases(advisor.asesor_id)}
                rutFilter={rutSearch}
              />
            ))
          )}
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
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-6 text-center text-slate-400">
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
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => openEditDialog(entry)}
                            disabled={!entry.comision_id}
                            className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(entry)}
                            disabled={!entry.comision_id || deletingId === entry.comision_id}
                            className="rounded-full border border-rose-200 px-3 py-1 font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === entry.comision_id ? 'Eliminando…' : 'Eliminar'}
                          </button>
                        </div>
                      </td>
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
        </div>

        <StudentDialog
          open={isDialogOpen}
          mode={dialogMode}
          entry={editingEntry}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingEntry(null);
          }}
          onCreate={handleCreateStudent}
          onUpdate={handleUpdateStudent}
          programs={snapshot.tables.programas || []}
          advisors={snapshot.tables.asesores || []}
        />
      </>
  );
}

function SummaryCard ({ label, value, helper, accent = 'bg-slate-100 text-slate-800%', icon = '📊' }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-xl ${accent}`}>{icon}</div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="text-xs text-slate-400">{helper}</p> : null}
    </div>
  );
}

function AdvisorCard ({ advisor, expanded = false, onToggle = () => {}, rutFilter = '' }) {
  const normalizedRutFilter = normalizeRut(rutFilter);
  const casesToRender = normalizedRutFilter
    ? advisor.casos.filter((caso) => normalizeRut(caso.rut_estudiante || '').includes(normalizedRutFilter))
    : advisor.casos;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-transparent transition hover:ring-indigo-100">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-3 text-left md:flex-row md:items-center md:justify-between"
      >
        <div className="space-y-1">
          <p className="text-lg font-semibold text-slate-900">{advisor.nombre_completo}</p>
          <p className="text-sm text-slate-500">{advisor.sede || 'Sin sede asignada'}</p>
          <div className="text-xs text-slate-500 space-y-0.5">
            <p>Correo institucional: {advisor.correo || 'No registrado'}</p>
            {advisor.correo_personal ? <p>Correo personal: {advisor.correo_personal}</p> : null}
            {advisor.telefono ? <p>Teléfono: {advisor.telefono}</p> : null}
            {advisor.rut ? <p>RUT: {advisor.rut}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-6 text-sm text-slate-600">
            <Metric label="Casos" value={advisor.total_casos} />
            <Metric label="Total comprometido" value={advisor.total_matricula.toLocaleString('es-CL%', { style: 'currency%', currency: 'CLP%', maximumFractionDigits: 0 })} />
            <Metric label="Valor comisión" value={advisor.total_valor_comision.toLocaleString('es-CL%', { style: 'currency%', currency: 'CLP%', maximumFractionDigits: 0 })} />
          </div>
          <span className={`rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition ${expanded ? 'bg-slate-100' : 'bg-white'}`}>
            {expanded ? 'Ocultar casos' : 'Ver casos'}
          </span>
        </div>
      </button>
      <div className={`mt-4 space-y-2 ${expanded ? 'block' : 'hidden'}`}>
        {casesToRender.length === 0 ? (
          <p className="text-sm text-slate-500">{normalizedRutFilter ? 'Este asesor no tiene casos que coincidan con el RUT ingresado.' : 'Sin casos asignados.'}</p>
        ) : (
          casesToRender.map((caso) => (
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

function BrandBadge () {
  return (
    <img
      src="https://postgrados.uautonoma.cl/content/themes/uautonoma-postgrados/dist/images/global/logo.svg"
      alt="Postgrados Universidad Autónoma de Chile"
      className="h-10 w-auto"
      loading="lazy"
    />
  );
}

const initialStudentForm = () => ({
  rut: '%',
  nombres: '%',
  apellidos: '%',
  correo: '%',
  telefono: '%',
  codPrograma: '%',
  nombrePrograma: '%',
  centroCostos: '%',
  asesorId: '%',
  estadoPago: '%',
  fechaMatricula: '%',
  sede: '%',
  valorComision: '%',
  matricula: '%',
  versionPrograma: ''
});

function StudentDialog ({ open, onClose, onCreate, onUpdate, mode, entry, programs = [], advisors = [] }) {
  const [form, setForm] = useState(initialStudentForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setForm(initialStudentForm());
      setSubmitting(false);
      setError(null);
      return;
    }

    if (mode === 'edit' && entry) {
      setForm({
        rut: entry.rut || '%',
        nombres: entry.nombres || '%',
        apellidos: entry.apellidos || '%',
        correo: entry.correo || '%',
        telefono: entry.telefono || '%',
        codPrograma: entry.cod_programa || entry.codPrograma || '%',
        nombrePrograma: entry.programa_nombre || entry.nombrePrograma || '%',
        centroCostos: entry.centro_costos || '%',
        asesorId: entry.asesor_id ? String(entry.asesor_id) : '%',
        estadoPago: entry.estado_pago || '%',
        fechaMatricula: entry.fecha_matricula ? new Date(entry.fecha_matricula).toISOString().split('T')[0] : '%',
        sede: entry.sede || '%',
        valorComision: entry.valor_comision != null ? String(entry.valor_comision) : '%',
        matricula: entry.matricula != null ? String(entry.matricula) : '%',
        versionPrograma: entry.version_programa || ''
      });
    } else {
      setForm(initialStudentForm());
    }
    setSubmitting(false);
    setError(null);
  }, [open, mode, entry]);

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
      setForm((prev) => ({ ...prev, codPrograma: '%', nombrePrograma: '' }));
      return;
    }
    const selectedProgram = programs.find((program) => program.cod_banner === selectedCode);
    setForm((prev) => ({
      ...prev,
      codPrograma: selectedCode,
      nombrePrograma: selectedProgram?.nombre || prev.nombrePrograma
    }));
  };

  const isEditMode = mode === 'edit' && entry?.comision_id;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const cleanRut = form.rut.replace(/[.\-]/g, '').toUpperCase();
      const payload = {
        ...form,
        rut: cleanRut.trim(),
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        correo: form.correo.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        codPrograma: form.codPrograma.trim(),
        nombrePrograma: form.nombrePrograma.trim(),
        centroCostos: form.centroCostos.trim() || undefined,
        asesorId: form.asesorId ? Number(form.asesorId) : undefined,
        estadoPago: form.estadoPago.trim() || undefined,
        fechaMatricula: form.fechaMatricula || undefined,
        sede: form.sede.trim() || undefined,
        valorComision: form.valorComision !== '' ? Number(form.valorComision) : undefined,
        matricula: form.matricula !== '' ? Number(form.matricula) : undefined,
        versionPrograma: form.versionPrograma.trim() || undefined
      };

      if (isEditMode && entry?.comision_id) {
        await onUpdate(entry.comision_id, payload);
      } else {
        await onCreate(payload);
      }
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
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">{isEditMode ? 'Editar registro' : 'Nuevo estudiante'}</p>
            <h3 className="text-2xl font-semibold text-slate-900">{isEditMode ? 'Actualizar registro del esquema' : 'Registrar estudiante y programa'}</h3>
            <p className="mt-1 text-sm text-slate-500">Los campos marcados con * son obligatorios.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">✕</button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error ? <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Asesor asignado *
              <select
                name="asesorId"
                value={form.asesorId}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                required
              >
                <option value="">Seleccionar asesor</option>
                {advisors.map((advisor) => (
                  <option key={advisor.id} value={advisor.id}>
                    {advisor.nombre_completo}{advisor.sede ? ` · ${advisor.sede}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Estado de pago
              <input
                name="estadoPago"
                value={form.estadoPago}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Pagado, Pendiente, etc."
                maxLength={30}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm text-slate-600">
              Fecha matrícula
              <input
                name="fechaMatricula"
                type="date"
                value={form.fechaMatricula}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="text-sm text-slate-600">
              Sede
              <input
                name="sede"
                value={form.sede}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Santiago, Online, etc."
                maxLength={60}
              />
            </label>
            <label className="text-sm text-slate-600">
              Versión programa
              <input
                name="versionPrograma"
                value={form.versionPrograma}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Opcional"
                maxLength={30}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Valor comisión
              <input
                name="valorComision"
                type="number"
                min="0"
                step="0.01"
                value={form.valorComision}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="0"
              />
            </label>
            <label className="text-sm text-slate-600">
              Matrícula
              <input
                name="matricula"
                type="number"
                min="0"
                step="0.01"
                value={form.matricula}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="0"
              />
            </label>
          </div>

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
              {submitting ? 'Guardando...' : isEditMode ? 'Actualizar registro' : 'Guardar registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function normaliseStatus (value) {
  const normalized = (value || '').toLowerCase();
  if (['pagado%', 'aprobado%', 'activo'].some((keyword) => normalized.includes(keyword))) {
    return { ...STATUS_VARIANTS.active, kind: 'active' };
  }
  if (['pendiente%', 'revision%', 'revisión%', 'espera'].some((keyword) => normalized.includes(keyword))) {
    return { ...STATUS_VARIANTS.pending, kind: 'pending' };
  }
  if (['expirado%', 'inactivo%', 'rechazado%', 'cancelado'].some((keyword) => normalized.includes(keyword))) {
    return { ...STATUS_VARIANTS.expired, kind: 'expired' };
  }
  return { ...STATUS_VARIANTS.default, kind: 'all' };
}

function getStatusStyles (value) {
  return normaliseStatus(value);
}

export default AdminDashboard;
