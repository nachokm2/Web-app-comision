import { useEffect, useMemo, useState } from "react";

function DataTable({ records, onEdit, onDelete, onFiltersChange }) {
  const [filterRut, setFilterRut] = useState("");
  const [filterPrograma, setFilterPrograma] = useState("");
  const [filterFechaDesde, setFilterFechaDesde] = useState("");
  const [filterFechaHasta, setFilterFechaHasta] = useState("");
  const [tempFechaDesde, setTempFechaDesde] = useState("");
  const [tempFechaHasta, setTempFechaHasta] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const hasPendingDateChange =
    tempFechaDesde !== filterFechaDesde || tempFechaHasta !== filterFechaHasta;
  const hasActiveFilters = Boolean(
    filterRut || filterPrograma || filterFechaDesde || filterFechaHasta,
  );

  const filtersLabel = useMemo(() => {
    if (!hasActiveFilters) return "";
    const parts = [];
    if (filterRut) parts.push(`RUT: ${filterRut}`);
    if (filterPrograma) parts.push(`Programa: ${filterPrograma}`);
    if (filterFechaDesde || filterFechaHasta) {
      const from = filterFechaDesde || "—";
      const to = filterFechaHasta || "—";
      parts.push(`Fechas: ${from} → ${to}`);
    }
    return parts.join(" | ");
  }, [
    hasActiveFilters,
    filterRut,
    filterPrograma,
    filterFechaDesde,
    filterFechaHasta,
  ]);

  // Lista única de programas para el select
  const programas = useMemo(() => {
    const list = [...new Set(records.map((r) => r.category).filter(Boolean))];
    return list.sort((a, b) => a.localeCompare(b, "es"));
  }, [records]);

  // Filtrar registros
  const filteredRecords = useMemo(() => {
    setCurrentPage(1); // Reset página al filtrar
    return records.filter((record) => {
      // Filtro por RUT
      if (filterRut.trim()) {
        const rutNorm = filterRut.replace(/[.\-]/g, "").toLowerCase();
        const recordRut = (record.rut_estudiante || "")
          .replace(/[.\-]/g, "")
          .toLowerCase();
        if (!recordRut.includes(rutNorm)) return false;
      }
      // Filtro por programa
      if (filterPrograma && record.category !== filterPrograma) return false;
      // Filtro por rango de fechas
      if (filterFechaDesde) {
        const from = new Date(filterFechaDesde);
        if (!record.created_at || new Date(record.created_at) < from)
          return false;
      }
      if (filterFechaHasta) {
        const to = new Date(filterFechaHasta);
        to.setHours(23, 59, 59, 999);
        if (!record.created_at || new Date(record.created_at) > to)
          return false;
      }
      return true;
    });
  }, [records, filterRut, filterPrograma, filterFechaDesde, filterFechaHasta]);

  // Paginación
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage]);

  useEffect(() => {
    onFiltersChange?.({
      hasFilters: hasActiveFilters,
      label: filtersLabel,
      count: filteredRecords.length,
      records: filteredRecords,
    });
  }, [hasActiveFilters, filtersLabel, filteredRecords, onFiltersChange]);

  if (!records.length) {
    return (
      <p className="text-sm text-slate-500">No hay registros asignados.</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-5">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Filtrar por RUT
          </label>
          <input
            type="search"
            value={filterRut}
            onChange={(e) => setFilterRut(e.target.value)}
            placeholder="Ej: 12345678-9"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Filtrar por Programa
          </label>
          <select
            value={filterPrograma}
            onChange={(e) => setFilterPrograma(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Todos los programas</option>
            {programas.map((prog) => (
              <option key={prog} value={prog}>
                {prog}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Rango de fechas
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={tempFechaDesde}
              onChange={(e) => setTempFechaDesde(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <span className="text-xs text-slate-400">a</span>
            <input
              type="date"
              value={tempFechaHasta}
              onChange={(e) => setTempFechaHasta(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
        <div className="flex items-end">
          {hasPendingDateChange ? (
            <button
              type="button"
              onClick={() => {
                setFilterFechaDesde(tempFechaDesde || "");
                setFilterFechaHasta(tempFechaHasta || "");
                setCurrentPage(1);
              }}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Aplicar
            </button>
          ) : (
            hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setFilterRut("");
                  setFilterPrograma("");
                  setFilterFechaDesde("");
                  setFilterFechaHasta("");
                  setTempFechaDesde("");
                  setTempFechaHasta("");
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Limpiar filtros
              </button>
            )
          )}
        </div>
      </div>

      {/* Contador de resultados */}
      <p className="text-sm text-slate-500">
        Mostrando {(currentPage - 1) * pageSize + 1} -{" "}
        {Math.min(currentPage * pageSize, filteredRecords.length)} de{" "}
        {filteredRecords.length} registros
        {hasActiveFilters && ` (filtrado de ${records.length} total)`}
      </p>

      {/* Tabla */}
      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                RUT
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                Estudiante
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                Programa
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                Monto
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                Fecha Matrícula
              </th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="px-4 py-6 text-center text-sm text-slate-500"
                >
                  No se encontraron registros con los filtros aplicados
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm font-mono text-slate-600">
                    {record.rut_estudiante || "—"}
                  </td>
                  <td className="px-4 py-2 text-sm">{record.title}</td>
                  <td className="px-4 py-2 text-sm">{record.category}</td>
                  <td className="px-4 py-2 text-sm">
                    {Number(record.amount).toLocaleString("es-CL", {
                      style: "currency",
                      currency: "CLP",
                    })}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${getStatusStyles(record.status)}`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-500">
                    {record.created_at
                      ? new Date(record.created_at).toLocaleDateString("es-CL")
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-sm text-right space-x-2">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => onEdit(record)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="rounded border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ««
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              « Anterior
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="rounded border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente »
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="rounded border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              »»
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_VARIANTS = {
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  expired: "bg-rose-100 text-rose-700",
  default: "bg-slate-100 text-slate-600",
};

function getStatusStyles(value) {
  const normalized = (value || "").toLowerCase();
  if (
    ["pagado", "aprobado", "activo"].some((keyword) =>
      normalized.includes(keyword),
    )
  ) {
    return STATUS_VARIANTS.active;
  }
  if (
    ["pendiente", "revision", "revisión", "espera"].some((keyword) =>
      normalized.includes(keyword),
    )
  ) {
    return STATUS_VARIANTS.pending;
  }
  if (
    ["expirado", "inactivo", "rechazado", "cancelado", "observado"].some(
      (keyword) => normalized.includes(keyword),
    )
  ) {
    return STATUS_VARIANTS.expired;
  }
  return STATUS_VARIANTS.default;
}

export default DataTable;
