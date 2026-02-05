import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAdminSchemaSnapshot,
  fetchAdminComisiones,
  createStudentEntry,
  updateStudentEntry,
  deleteStudentEntry,
} from "../services/api.js";
import LoadingScreen from "./LoadingScreen.jsx";
import AdvisorCasesSection from "./AdvisorCasesSection.jsx";
import { buildCsvFromRecords, slugify } from "../utils/csvExport.js";

const STATUS_VARIANTS = {
  active: { label: "Activo", className: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-700" },
  expired: { label: "Rechazado", className: "bg-rose-100 text-rose-700" },
  default: { label: "Sin estado", className: "bg-slate-100 text-slate-600" },
};

const STATUS_FILTER_LABELS = {
  all: "Total comisiones",
  active: "Pagados",
  pending: "Pendientes",
  expired: "Rechazados",
};

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function formatCurrency(value = 0) {
  return currencyFormatter.format(Math.max(0, Number(value) || 0));
}

const FILTER_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Pagados" },
  { id: "pending", label: "Pendientes" },
  { id: "expired", label: "Rechazados" },
];

const FEATURED_ADVISOR_NAMES = [
  "Camila Alejandra Abarca Reyes",
  "Milena Balladares Ríos",
  "José Eduardo Cabello Valdivia",
  "Ivette  Herrera",
  "Javiera Diocares Redel",
  "Macarena Stevenson Aguirre",
  "María Inés Farias Sotelo",
  "Katherine Meyers Vidal",
  "Fabiola Inostroza",
  "Zaida Verdugo Cifuentes",
  "Genesis Valdes",
  "Carolina Andrea Silva Martínez",
  "Jorge Bustamante",
  "Eduardo Arias",
  "Bárbara Quijada",
  "Isabel  Carvajal",
  "Joaquin Gabriel Retamal Cardenas",
];

const FEATURED_ADVISOR_SET = new Set(
  FEATURED_ADVISOR_NAMES.map(normalizeAdvisorName),
);

function normalizeAdvisorName(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeRut(value = "") {
  return value.replace(/[.\-]/g, "").trim().toLowerCase();
}

function formatDateLabel(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-CL");
}

function isFeaturedAdvisor(name) {
  if (!name) return false;
  return FEATURED_ADVISOR_SET.has(normalizeAdvisorName(name));
}

function AdminDashboard() {
  const [snapshot, setSnapshot] = useState(null);
  const [comisiones, setComisiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [entriesRequested, setEntriesRequested] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [showSplash, setShowSplash] = useState(true);
  const [splashReady, setSplashReady] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Filtros para la tabla de comisiones
  const [filterRut, setFilterRut] = useState("");
  const [filterAsesor, setFilterAsesor] = useState("");
  const [filterPrograma, setFilterPrograma] = useState("");
  const [filterFechaDesde, setFilterFechaDesde] = useState("");
  const [filterFechaHasta, setFilterFechaHasta] = useState("");
  const [tempFechaDesde, setTempFechaDesde] = useState("");
  const [tempFechaHasta, setTempFechaHasta] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentMonthOnly, setCurrentMonthOnly] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Cambios Mauri: consideramos todos los filtros activos para reflejar correctamente el estado del panel.
  const hasAnyFilter = Boolean(
    filterRut ||
    filterAsesor ||
    filterPrograma ||
    filterFechaDesde ||
    filterFechaHasta ||
    currentMonthOnly ||
    statusFilter !== "all",
  );

  const hasPendingDateChange =
    tempFechaDesde !== filterFechaDesde || tempFechaHasta !== filterFechaHasta;

  useEffect(() => {
    if (filterAsesor.length > 2) {
      fetch(`/api/`);
    }
  }, []);

  const loadSnapshot = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminSchemaSnapshot();
      setSnapshot(data);
      const all = await fetchAdminComisiones();
      setComisiones(all);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (!loading) {
      setSplashReady(true);
    }
  }, [loading]);

  const handleCreateStudent = useCallback(
    async (payload) => {
      await createStudentEntry(payload);
      await loadSnapshot();
    },
    [loadSnapshot],
  );

  const handleUpdateStudent = useCallback(
    async (entryId, payload) => {
      await updateStudentEntry(entryId, payload);
      await loadSnapshot();
    },
    [loadSnapshot],
  );

  const handleDeleteStudent = useCallback(
    async (entry) => {
      if (!entry?.comision_id) return;
      const confirmed = window.confirm(
        "¿Seguro que deseas eliminar este registro?",
      );
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
    },
    [loadSnapshot],
  );

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditingEntry(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (entry) => {
    setDialogMode("edit");
    setEditingEntry(entry);
    setIsDialogOpen(true);
  };

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  }, []);

  const getSortIndicator = useCallback(
    (key) => {
      if (sortConfig.key !== key) return "";
      return sortConfig.direction === "asc" ? "↑" : "↓";
    },
    [sortConfig],
  );

  const featuredCases = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.casesByAdvisor.filter((advisor) =>
      isFeaturedAdvisor(advisor.nombre_completo),
    );
  }, [snapshot]);

  const featuredEntries = useMemo(() => {
    if (!snapshot) return [];
    return (snapshot.studentEntries || []).filter((entry) =>
      isFeaturedAdvisor(entry.asesor_nombre),
    );
  }, [snapshot]);

  // Solo asesores que tienen al menos una comisión registrada
  const advisorsWithComision = useMemo(() => {
    if (!snapshot) return [];
    const allAdvisors = snapshot.tables?.asesores || [];
    if (!comisiones.length) return allAdvisors;

    const advisorNamesWithComision = new Set(
      comisiones.map((c) => (c.asesor || "").trim()).filter(Boolean),
    );

    return allAdvisors.filter((advisor) =>
      advisorNamesWithComision.has((advisor.nombre_completo || "").trim()),
    );
  }, [snapshot, comisiones]);

  // Lista única de asesores para los filtros
  const listaAsesores = useMemo(() => {
    const asesores = [
      ...new Set(comisiones.map((c) => c.asesor).filter(Boolean)),
    ];
    return asesores.sort((a, b) => a.localeCompare(b, "es"));
  }, [comisiones]);

  // Lista única de programas para los filtros
  const listaProgramas = useMemo(() => {
    const programas = [
      ...new Set(comisiones.map((c) => c.category).filter(Boolean)),
    ];
    return programas.sort((a, b) => a.localeCompare(b, "es"));
  }, [comisiones]);

  // Comisiones filtradas compartidas entre tabla y KPIs
  // Cambios Mauri: reutilizamos la misma lista filtrada para tabla y KPIs.
  const comisionesFiltradas = useMemo(() => {
    let filtered = comisiones;

    if (filterRut.trim()) {
      const rutNorm = normalizeRut(filterRut);
      filtered = filtered.filter((c) =>
        normalizeRut(c.rut_estudiante || "").includes(rutNorm),
      );
    }

    if (filterAsesor) {
      filtered = filtered.filter((c) => c.asesor === filterAsesor);
    }

    if (filterPrograma) {
      filtered = filtered.filter((c) => c.category === filterPrograma);
    }

    if (filterFechaDesde) {
      const from = new Date(filterFechaDesde);
      filtered = filtered.filter(
        (c) => c.created_at && new Date(c.created_at) >= from,
      );
    }

    if (filterFechaHasta) {
      const to = new Date(filterFechaHasta);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (c) => c.created_at && new Date(c.created_at) <= to,
      );
    }

    if (currentMonthOnly) {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      filtered = filtered.filter((c) => {
        if (!c.created_at) return false;
        const createdDate = new Date(c.created_at);
        return (
          createdDate.getMonth() === currentMonth &&
          createdDate.getFullYear() === currentYear
        );
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (c) => normaliseStatus(c.status).kind === statusFilter,
      );
    }

    return filtered;
  }, [
    comisiones,
    filterRut,
    filterAsesor,
    filterPrograma,
    filterFechaDesde,
    filterFechaHasta,
    statusFilter,
    currentMonthOnly,
  ]);

  // Cambios Mauri: habilitamos ordenamiento dinámico sobre las columnas seleccionadas.
  const sortedComisiones = useMemo(() => {
    const data = [...comisionesFiltradas];
    if (!sortConfig.key) return data;
    const multiplier = sortConfig.direction === "asc" ? 1 : -1;

    data.sort((a, b) => {
      const valueA = getSortableValue(a, sortConfig.key);
      const valueB = getSortableValue(b, sortConfig.key);

      if (typeof valueA === "number" && typeof valueB === "number") {
        return (valueA - valueB) * multiplier;
      }

      const stringA = String(valueA ?? "").toLowerCase();
      const stringB = String(valueB ?? "").toLowerCase();
      return (
        stringA.localeCompare(stringB, "es", { sensitivity: "base" }) *
        multiplier
      );
    });

    return data;
  }, [comisionesFiltradas, sortConfig]);

  // Cambios Mauri: los totales del panel se recalculan con comisionesFiltradas.
  const summary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const totalEntradas = comisionesFiltradas.length;
    let totalMesActual = 0;
    let totalActivos = 0;
    let totalPendientes = 0;
    let totalExpirados = 0;
    let totalAmount = 0;
    let monthAmount = 0;
    let totalActivosAmount = 0;
    let totalPendientesAmount = 0;
    let totalExpiradosAmount = 0;

    comisionesFiltradas.forEach((comision) => {
      const amount = Number(comision.amount) || 0;
      totalAmount += amount;

      if (comision.created_at) {
        const createdDate = new Date(comision.created_at);
        if (
          !Number.isNaN(createdDate.getTime()) &&
          createdDate.getMonth() === currentMonth &&
          createdDate.getFullYear() === currentYear
        ) {
          totalMesActual += 1;
          monthAmount += amount;
        }
      }

      const statusKind = normaliseStatus(comision.status).kind;
      if (statusKind === "active") {
        totalActivos += 1;
        totalActivosAmount += amount;
      } else if (statusKind === "pending") {
        totalPendientes += 1;
        totalPendientesAmount += amount;
      } else if (statusKind === "expired") {
        totalExpirados += 1;
        totalExpiradosAmount += amount;
      }
    });

    return {
      totalAsesores: featuredCases.length,
      totalEntradas,
      totalMesActual,
      totalActivos,
      totalPendientes,
      totalExpirados,
      totalAmount,
      monthAmount,
      totalActivosAmount,
      totalPendientesAmount,
      totalExpiradosAmount,
    };
  }, [comisionesFiltradas, featuredCases]);

  const activeFilterLabel = useMemo(() => {
    const parts = [];
    if (filterRut) parts.push(`RUT ${filterRut}`);
    if (filterAsesor) parts.push(`Asesor ${filterAsesor}`);
    if (filterPrograma) parts.push(`Programa ${filterPrograma}`);
    if (filterFechaDesde)
      parts.push(`Desde ${formatDateLabel(filterFechaDesde)}`);
    if (filterFechaHasta)
      parts.push(`Hasta ${formatDateLabel(filterFechaHasta)}`);
    if (currentMonthOnly) parts.push("Mes actual");
    if (statusFilter !== "all")
      parts.push(STATUS_FILTER_LABELS[statusFilter] || statusFilter);
    if (!parts.length) return STATUS_FILTER_LABELS.all;
    return parts.join(" · ");
  }, [
    filterRut,
    filterAsesor,
    filterPrograma,
    filterFechaDesde,
    filterFechaHasta,
    currentMonthOnly,
    statusFilter,
  ]);

  const filteredExportCount = comisionesFiltradas.length;

  const handleAdminDownload = useCallback(() => {
    if (!comisionesFiltradas.length) {
      window.alert("No hay registros para descargar con los filtros actuales.");
      return;
    }
    setIsExportingCsv(true);
    try {
      const csv = buildCsvFromRecords(comisionesFiltradas);
      const labelSlug = slugify(activeFilterLabel || "filtro-admin");
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `admin-comisiones-${labelSlug}-${timestamp}.csv`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExportingCsv(false);
    }
  }, [comisionesFiltradas, activeFilterLabel]);

  const filteredEntries = useMemo(() => {
    const entries = featuredEntries;
    return entries
      .map((entry) => ({
        ...entry,
        advisorName: entry.asesor_nombre || "Sin asesor",
        advisorEmail: entry.asesor_correo,
        estudiante:
          `${entry.nombres || ""} ${entry.apellidos || ""}`.trim() || entry.rut,
        programa: entry.programa_nombre || "Sin programa",
        estado: normaliseStatus(entry.estado_pago),
        fecha: entry.fecha_matricula,
        sede: entry.sede || "—",
        categorias: entry.categorias || [],
      }))
      .filter((entry) => {
        const matchesFilter =
          filter === "all" ? true : entry.estado.kind === filter;
        if (!matchesFilter) return false;
        if (!query) return true;
        const haystack =
          `${entry.advisorName} ${entry.advisorEmail ?? ""} ${entry.estudiante} ${entry.programa} ${entry.rut}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      });
  }, [featuredEntries, filter, query]);

  if (error) {
    return (
      <>
        {showSplash ? (
          <LoadingScreen
            isReady={splashReady}
            onComplete={() => setShowSplash(false)}
          />
        ) : null}
        <div className="rounded border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {error}
        </div>
      </>
    );
  }

  if (!snapshot) {
    return (
      <>
        {showSplash ? (
          <LoadingScreen
            isReady={splashReady}
            onComplete={() => setShowSplash(false)}
          />
        ) : (
          <div className="rounded border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Cargando información global...
          </div>
        )}
      </>
    );
  }

  const totalEntries = featuredEntries.length;

  return (
    <>
      {showSplash ? (
        <LoadingScreen
          isReady={splashReady}
          onComplete={() => setShowSplash(false)}
        />
      ) : null}
      <div className="space-y-8">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <BrandBadge />
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Panel interno
                </p>
              </div>
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">
                Panel administrativo
              </p>
              <h1 className="mt-1 text-3xl font-semibold text-slate-900">
                Gestión integral de comisiones
              </h1>
              <p className="mt-2 max-w-3xl text-base text-slate-500">
                Monitorea en un solo lugar los casos asignados, el estado de
                pago y los registros históricos relacionados al pago de
                comisiones:
              </p>
            </div>
            <button
              onClick={openCreateDialog}
              className="self-start rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              + Agregar registro
            </button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              label="Total entradas"
              value={summary.totalEntradas}
              helper="Registros de estudiantes"
              icon="👥"
              amountLabel={formatCurrency(summary.totalAmount)}
              active={statusFilter === "all" && !currentMonthOnly}
              onClick={() => {
                setStatusFilter("all");
                setCurrentMonthOnly(false);
                setCurrentPage(1);
              }}
            />
            <SummaryCard
              label="Mes actual"
              value={summary.totalMesActual}
              helper="Registros del mes en curso"
              icon="📅"
              amountLabel={formatCurrency(summary.monthAmount)}
              active={currentMonthOnly}
              onClick={() => {
                const next = !currentMonthOnly;
                setCurrentMonthOnly(next);
                if (next) {
                  setStatusFilter("all");
                }
                setCurrentPage(1);
              }}
            />
            <SummaryCard
              label="Pagados"
              value={summary.totalActivos}
              helper="En seguimiento"
              accent="bg-emerald-50 text-emerald-600"
              icon="📈"
              amountLabel={formatCurrency(summary.totalActivosAmount)}
              active={statusFilter === "active"}
              onClick={() => {
                setStatusFilter("active");
                setCurrentMonthOnly(false);
                setCurrentPage(1);
              }}
            />
            <SummaryCard
              label="Pendientes"
              value={summary.totalPendientes}
              helper="Esperando gestión"
              accent="bg-amber-50 text-amber-600"
              icon="⏳"
              amountLabel={formatCurrency(summary.totalPendientesAmount)}
              active={statusFilter === "pending"}
              onClick={() => {
                setStatusFilter("pending");
                setCurrentMonthOnly(false);
                setCurrentPage(1);
              }}
            />
            <SummaryCard
              label="Rechazados"
              value={summary.totalExpirados}
              helper="Casos rechazados"
              accent="bg-slate-50 text-slate-600"
              icon="🛑"
              amountLabel={formatCurrency(summary.totalExpiradosAmount)}
              active={statusFilter === "expired"}
              onClick={() => {
                setStatusFilter("expired");
                setCurrentMonthOnly(false);
                setCurrentPage(1);
              }}
            />
          </div>
        </section>

        {/* Tabla de todas las comisiones */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">
              Todas las comisiones ({comisionesFiltradas.length})
              {(filterRut ||
                filterAsesor ||
                filterPrograma ||
                filterFechaDesde ||
                filterFechaHasta ||
                currentMonthOnly) && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  (filtrado de {comisiones.length} total)
                </span>
              )}
            </h2>
            {/* Cambios Mauri: movimos limpiar filtros junto al resumen para mejor acceso. */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {hasAnyFilter ? "Filtro activo" : "Sin filtros aplicados"}
                </p>
                <p className="text-xs text-slate-500">
                  {filteredExportCount} registros listos para exportar
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
                {!hasPendingDateChange && hasAnyFilter ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterRut("");
                      setFilterAsesor("");
                      setFilterPrograma("");
                      setFilterFechaDesde("");
                      setFilterFechaHasta("");
                      setTempFechaDesde("");
                      setTempFechaHasta("");
                      setStatusFilter("all");
                      setCurrentMonthOnly(false);
                      setCurrentPage(1);
                    }}
                    className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                  >
                    Limpiar filtros
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleAdminDownload}
                  disabled={isExportingCsv || !filteredExportCount}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isExportingCsv
                    ? "Generando CSV..."
                    : `Descargar con filtros`}
                  <span className="text-xs font-normal text-white/80">
                    ({filteredExportCount})
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Filtros */}
          {/* Cambios Mauri: se amplió la rejilla para alojar el nuevo filtro por estado. */}
          <div className="mb-4 grid gap-3 md:grid-cols-7">
            {/* Cambios Mauri: filtro explícito por estado reutilizando statusFilter. */}
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Filtrar por RUT
              </label>
              <input
                type="search"
                value={filterRut}
                onChange={(e) => {
                  setFilterRut(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Ej: 12345678-9"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Filtrar por Asesor
              </label>
              <select
                value={filterAsesor}
                onChange={(e) => {
                  setFilterAsesor(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Todos los asesores</option>
                {listaAsesores.map((asesor) => (
                  <option key={asesor} value={asesor}>
                    {asesor}
                  </option>
                ))}
              </select>
              {/* <input 
              className={`border p-2 w-full rounded-lg text-sm ${!filterAsesor && query ? 'border-red-500' : 'border-gray-300'}`}
              value={query}
              type='text'
              onChange={(e) => {
                setQuery(e.target.value)
                setFilterAsesor(null)
              }}
              placeholder='Buscar por asesor...'
              /> */}
            </div>
            {/* Cambios Mauri: damos más ancho al selector de programas para evitar textos cortados. */}
            <div className="relative md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Filtrar por Programa
              </label>
              <select
                value={filterPrograma}
                onChange={(e) => {
                  setFilterPrograma(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Todos los programas</option>
                {listaProgramas.map((programa) => (
                  <option key={programa} value={programa}>
                    {programa}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Filtrar por Estado
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentMonthOnly(false);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {FILTER_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Rango de fechas
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={tempFechaDesde}
                  onChange={(e) => {
                    setTempFechaDesde(e.target.value);
                  }}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <span className="self-center text-xs text-slate-400">a</span>
                <input
                  type="date"
                  value={tempFechaHasta}
                  onChange={(e) => {
                    setTempFechaHasta(e.target.value);
                  }}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>
            <div className="flex items-end justify-end gap-2">
              {hasPendingDateChange && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterFechaDesde(tempFechaDesde || "");
                    setFilterFechaHasta(tempFechaHasta || "");
                    setCurrentPage(1);
                  }}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                >
                  Aplicar
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    RUT
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => handleSort("title")}
                      className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:text-indigo-600 focus:outline-none bg-transparent"
                    >
                      Estudiante
                      <span className="text-xs">
                        {getSortIndicator("title")}
                      </span>
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => handleSort("category")}
                      className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:text-indigo-600 focus:outline-none bg-transparent"
                    >
                      Programa
                      <span className="text-xs">
                        {getSortIndicator("category")}
                      </span>
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => handleSort("amount")}
                      className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:text-indigo-600 focus:outline-none bg-transparent"
                    >
                      Monto
                      <span className="text-xs">
                        {getSortIndicator("amount")}
                      </span>
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => handleSort("status")}
                      className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:text-indigo-600 focus:outline-none bg-transparent"
                    >
                      Estado
                      <span className="text-xs">
                        {getSortIndicator("status")}
                      </span>
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => handleSort("asesor")}
                      className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:text-indigo-600 focus:outline-none bg-transparent"
                    >
                      Asesor
                      <span className="text-xs">
                        {getSortIndicator("asesor")}
                      </span>
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => handleSort("created_at")}
                      className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:text-indigo-600 focus:outline-none bg-transparent"
                    >
                      Fecha
                      <span className="text-xs">
                        {getSortIndicator("created_at")}
                      </span>
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedComisiones
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm font-mono text-slate-600">
                        {r.rut_estudiante || "—"}
                      </td>
                      <td className="px-4 py-2 text-sm">{r.title}</td>
                      <td className="px-4 py-2 text-sm">{r.category}</td>
                      <td className="px-4 py-2 text-sm">
                        {Number(r.amount).toLocaleString("es-CL", {
                          style: "currency",
                          currency: "CLP",
                        })}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusStyles(r.status).className}`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-600">
                        {r.asesor || "—"}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-500">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString("es-CL")
                          : ""}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <button
                          type="button"
                          onClick={() => {
                            const estudiantes =
                              snapshot?.tables?.estudiantes || [];
                            const estudiante = estudiantes.find(
                              (e) => e.rut === r.rut_estudiante,
                            );
                            const nombresDesdeEstudiante =
                              estudiante?.nombres || "";
                            const apellidosDesdeEstudiante =
                              estudiante?.apellidos || "";

                            setEditingEntry({
                              comision_id: r.id,
                              rut: r.rut_estudiante,
                              nombres:
                                nombresDesdeEstudiante ||
                                r.title?.split(" ").slice(0, -2).join(" ") ||
                                "",
                              apellidos:
                                apellidosDesdeEstudiante ||
                                r.title?.split(" ").slice(-2).join(" ") ||
                                "",
                              correo: estudiante?.correo || "",
                              telefono: estudiante?.telefono || "",
                              cod_programa: r.cod_programa,
                              programa_nombre: r.category,
                              asesor_nombre: r.asesor,
                              estado_pago: r.status,
                              fecha_matricula: r.created_at,
                              valor_comision: r.amount,
                              version_programa: r.version_programa,
                            });
                            setDialogMode("edit");
                            setIsDialogOpen(true);
                          }}
                          className="rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                {!comisionesFiltradas.length && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-4 py-6 text-center text-sm text-slate-500"
                    >
                      {filterRut ||
                      filterAsesor ||
                      filterPrograma ||
                      filterFechaDesde ||
                      filterFechaHasta ||
                      currentMonthOnly
                        ? "No se encontraron registros con los filtros aplicados"
                        : "Sin registros"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Paginación */}
          {comisionesFiltradas.length > pageSize && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Mostrando {(currentPage - 1) * pageSize + 1} -{" "}
                {Math.min(currentPage * pageSize, comisionesFiltradas.length)}{" "}
                de {comisionesFiltradas.length} registros
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="rounded border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ««
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  « Anterior
                </button>
                <span className="px-3 py-1 text-sm font-semibold text-slate-700">
                  Página {currentPage} de{" "}
                  {Math.ceil(comisionesFiltradas.length / pageSize)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(
                        Math.ceil(comisionesFiltradas.length / pageSize),
                        p + 1,
                      ),
                    )
                  }
                  disabled={
                    currentPage >=
                    Math.ceil(comisionesFiltradas.length / pageSize)
                  }
                  className="rounded border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente »
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(
                      Math.ceil(comisionesFiltradas.length / pageSize),
                    )
                  }
                  disabled={
                    currentPage >=
                    Math.ceil(comisionesFiltradas.length / pageSize)
                  }
                  className="rounded border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  »»
                </button>
              </div>
            </div>
          )}
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
        advisors={advisorsWithComision}
      />
    </>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  accent = "bg-slate-100 text-slate-800",
  icon = "📊",
  active = false,
  onClick,
  amountLabel,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-2 rounded-2xl border p-3 sm:p-4 text-left shadow-sm transition
        ${active ? "border-indigo-300 ring-2 ring-indigo-200 bg-indigo-50/40" : "border-slate-100 bg-white hover:bg-slate-50"}
      `}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-lg sm:h-10 sm:w-10 sm:text-xl ${accent}`}
        >
          {icon}
        </div>
        {amountLabel ? (
          <p className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            {amountLabel}
          </p>
        ) : null}
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl sm:text-3xl font-semibold text-slate-900">
        {value}
      </p>
      {helper ? <p className="text-xs text-slate-400">{helper}</p> : null}
    </button>
  );
}

function AdvisorCard({
  advisor,
  expanded = false,
  onToggle = () => {},
  rutFilter = "",
}) {
  const normalizedRutFilter = normalizeRut(rutFilter);
  const casesToRender = normalizedRutFilter
    ? advisor.casos.filter((caso) =>
        normalizeRut(caso.rut_estudiante || "").includes(normalizedRutFilter),
      )
    : advisor.casos;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-transparent transition hover:ring-indigo-100">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-3 text-left md:flex-row md:items-center md:justify-between"
      >
        <div className="space-y-1">
          <p className="text-lg font-semibold text-slate-900">
            {advisor.nombre_completo}
          </p>
          <p className="text-sm text-slate-500">
            {advisor.sede || "Sin sede asignada"}
          </p>
          <div className="text-xs text-slate-500 space-y-0.5">
            <p>Correo institucional: {advisor.correo || "No registrado"}</p>
            {advisor.correo_personal ? (
              <p>Correo personal: {advisor.correo_personal}</p>
            ) : null}
            {advisor.telefono ? <p>Teléfono: {advisor.telefono}</p> : null}
            {advisor.rut ? <p>RUT: {advisor.rut}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-6 text-sm text-slate-600">
            <Metric label="Casos" value={advisor.total_casos} />
            <Metric
              label="Total comprometido"
              value={advisor.total_matricula.toLocaleString("es-CL", {
                style: "currency",
                currency: "CLP",
                maximumFractionDigits: 0,
              })}
            />
            <Metric
              label="Valor comisión"
              value={advisor.total_valor_comision.toLocaleString("es-CL", {
                style: "currency",
                currency: "CLP",
                maximumFractionDigits: 0,
              })}
            />
          </div>
          <span
            className={`rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition ${expanded ? "bg-slate-100" : "bg-white"}`}
          >
            {expanded ? "Ocultar casos" : "Ver casos"}
          </span>
        </div>
      </button>
      <div className={`mt-4 space-y-2 ${expanded ? "block" : "hidden"}`}>
        {casesToRender.length === 0 ? (
          <p className="text-sm text-slate-500">
            {normalizedRutFilter
              ? "Este asesor no tiene casos que coincidan con el RUT ingresado."
              : "Sin casos asignados."}
          </p>
        ) : (
          casesToRender.map((caso) => (
            <div
              key={caso.comision_id}
              className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">
                  #{caso.comision_id} · {caso.programa}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(caso.estado_pago).className}`}
                >
                  {getStatusStyles(caso.estado_pago).label}
                </span>
              </div>
              <div className="mt-1 grid gap-1 text-xs text-slate-500 md:grid-cols-2">
                <p>
                  Estudiante:{" "}
                  <span className="text-slate-800">
                    {caso.estudiante || caso.rut_estudiante || "—"}
                  </span>
                </p>
                <p>
                  Fecha matrícula:{" "}
                  {caso.fecha_matricula
                    ? new Date(caso.fecha_matricula).toLocaleDateString()
                    : "—"}
                </p>
                <p>Sede: {caso.sede || "—"}</p>
                <p>Versión: {caso.version_programa ?? "—"}</p>
                <p>
                  Categorías:{" "}
                  {caso.categorias?.length
                    ? caso.categorias.join(", ")
                    : "Sin categoría"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function BrandBadge() {
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
  rut: "",
  nombres: "",
  apellidos: "",
  correo: "",
  telefono: "",
  codPrograma: "",
  nombrePrograma: "",
  centroCostos: "",
  asesorId: "",
  estadoPago: "",
  fechaMatricula: "",
  sede: "",
  valorComision: "",
  matricula: "",
  versionPrograma: "",
});

function StudentDialog({
  open,
  onClose,
  onCreate,
  onUpdate,
  mode,
  entry,
  programs = [],
  advisors = [],
}) {
  const [form, setForm] = useState(() => initialStudentForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setForm(initialStudentForm());
      setSubmitting(false);
      setError(null);
      return;
    }

    if (mode === "edit" && entry) {
      let initialAsesorId = "";
      if (entry.asesor_id) {
        initialAsesorId = String(entry.asesor_id);
      } else if (entry.asesor_nombre) {
        const matchedAdvisor = advisors.find(
          (advisor) => advisor.nombre_completo === entry.asesor_nombre,
        );
        if (matchedAdvisor) {
          initialAsesorId = String(matchedAdvisor.id);
        }
      }

      setForm({
        rut: entry.rut || "",
        nombres: entry.nombres || "",
        apellidos: entry.apellidos || "",
        correo: entry.correo || "",
        telefono: entry.telefono || "",
        codPrograma: entry.cod_programa || "",
        nombrePrograma: entry.programa_nombre || entry.nombrePrograma || "",
        centroCostos: entry.centro_costos || "",
        asesorId: initialAsesorId,
        estadoPago: entry.estado_pago || "",
        fechaMatricula: entry.fecha_matricula
          ? new Date(entry.fecha_matricula).toISOString().split("T")[0]
          : "",
        sede: entry.sede || "",
        valorComision:
          entry.valor_comision != null ? String(entry.valor_comision) : "",
        matricula: entry.matricula != null ? String(entry.matricula) : "",
        versionPrograma: entry.version_programa || "",
      });
    } else {
      setForm(initialStudentForm());
    }
    setSubmitting(false);
    setError(null);
  }, [open, mode, entry, advisors]);

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === "rut") {
      nextValue = value.replace(/[.\-]/g, "").toUpperCase();
    } else if (name === "valorComision" || name === "matricula") {
      // Solo permitir dígitos para montos enteros
      nextValue = value.replace(/[^0-9]/g, "");
    }

    setForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleProgramSelect = (event) => {
    const selectedCode = event.target.value;
    if (!selectedCode) {
      setForm((prev) => ({ ...prev, codPrograma: "", nombrePrograma: "" }));
      return;
    }
    const selectedProgram = programs.find(
      (program) => program.cod_programa === selectedCode,
    );
    setForm((prev) => ({
      ...prev,
      codPrograma: selectedCode,
      nombrePrograma: selectedProgram?.nombre || prev.nombrePrograma,
    }));
  };

  const isEditMode = mode === "edit" && entry?.comision_id;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const cleanRut = form.rut.replace(/[.\-]/g, "").toUpperCase();
      const versionProgramaValue =
        form.versionPrograma != null ? String(form.versionPrograma) : "";
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
        valorComision:
          form.valorComision !== ""
            ? parseInt(form.valorComision, 10)
            : undefined,
        matricula:
          form.matricula !== "" ? parseInt(form.matricula, 10) : undefined,
        versionPrograma: versionProgramaValue.trim() || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 overflow-y-auto">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">
              {isEditMode ? "Editar registro" : "Nuevo estudiante"}
            </p>
            <h3 className="text-xl font-semibold text-slate-900">
              {isEditMode ? "Actualizar registro" : "Registrar estudiante"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Los campos marcados con * son obligatorios.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 transition hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          {error ? (
            <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
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
                    {advisor.nombre_completo}
                    {advisor.sede ? ` · ${advisor.sede}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Estado de pago
              <select
                name="estadoPago"
                value={form.estadoPago}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Seleccionar estado de pago</option>
                <option value="Aprobado">Aprobado</option>
                <option value="Toku">Toku</option>
                <option value="Rechazado">Rechazado</option>
                <option value="Webpay">Webpay</option>
                <option value="Pagado">Pagado</option>
                <option value="Pendiente de pago">Pendiente de pago</option>
              </select>
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
            <label className="text-sm text-slate-600">
              Versión programa
              <select
                name="versionPrograma"
                value={form.versionPrograma}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
                <option value="9">9</option>
                <option value="10">10</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Valor comisión
              <input
                name="valorComision"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
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
              Correo *
              <input
                name="correo"
                type="email"
                value={form.correo}
                onChange={handleChange}
                required
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
                value={
                  form.codPrograma &&
                  programs.some(
                    (program) => program.cod_programa === form.codPrograma,
                  )
                    ? form.codPrograma
                    : ""
                }
                onChange={handleProgramSelect}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Seleccionar de la lista</option>
                {programs.map((program) => (
                  <option
                    key={program.cod_programa}
                    value={program.cod_programa}
                  >
                    {program.cod_programa} · {program.nombre}
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
                readOnly
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 bg-slate-50 cursor-not-allowed focus:outline-none"
                placeholder="MBA Gestión"
                maxLength={120}
                required
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 mt-4">
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
              {submitting
                ? "Guardando..."
                : isEditMode
                  ? "Actualizar"
                  : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function normaliseStatus(value) {
  const normalized = (value || "").toLowerCase();
  if (
    ["pagado", "aprobado", "activo"].some((keyword) =>
      normalized.includes(keyword),
    )
  ) {
    return { ...STATUS_VARIANTS.active, kind: "active" };
  }
  if (
    ["pendiente", "revision", "revisión", "espera"].some((keyword) =>
      normalized.includes(keyword),
    )
  ) {
    return { ...STATUS_VARIANTS.pending, kind: "pending" };
  }
  if (
    ["expirado", "inactivo", "rechazado", "cancelado"].some((keyword) =>
      normalized.includes(keyword),
    )
  ) {
    return { ...STATUS_VARIANTS.expired, kind: "expired" };
  }
  return { ...STATUS_VARIANTS.default, kind: "all" };
}

function getStatusStyles(value) {
  return normaliseStatus(value);
}

// Cambios Mauri: normalizamos los valores utilizados para ordenar la tabla.
function getSortableValue(entry = {}, key) {
  if (!entry) return "";

  switch (key) {
    case "title":
    case "category":
    case "asesor":
      return (entry[key] || "").toString().trim();
    case "amount":
      return Number(entry.amount) || 0;
    case "status": {
      const statusInfo = normaliseStatus(entry.status);
      return statusInfo.label || entry.status || "";
    }
    case "created_at": {
      if (!entry.created_at) return 0;
      const date = new Date(entry.created_at);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }
    default:
      return (entry[key] ?? "").toString().trim();
  }
}

export default AdminDashboard;
