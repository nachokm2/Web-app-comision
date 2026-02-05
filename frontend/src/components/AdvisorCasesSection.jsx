{
  /* 
    
    Con esto, se llama el componente reutilizable en la pantalla del AdminDashboard
    sólo tienes que copiar y pegar el siguiente código debajo de la tabla:

        <AdvisorCasesSection
          comisiones={comisiones}
          normalizeRut={normalizeRut}
          getStatusStyles={getStatusStyles}
        />
    
    
    
    
    */
}

import { useCallback, useMemo, useState } from "react";

// Cambios Mauri: sección "Casos por asesor" encapsulada para reutilización.
function AdvisorCasesSection({
  comisiones = [],
  normalizeRut = (value = "") => value,
  getStatusStyles = () => ({ className: "", label: "" }),
}) {
  const [rutSearch, setRutSearch] = useState("");
  const [expandedAdvisors, setExpandedAdvisors] = useState(() => new Set());

  const comisionesPorAsesor = useMemo(() => {
    const grouped = {};
    comisiones.forEach((comision) => {
      const advisorKey = comision.asesor || "Sin asesor";
      if (!grouped[advisorKey]) {
        grouped[advisorKey] = {
          nombre: advisorKey,
          casos: [],
          totalMonto: 0,
          pagados: 0,
          pendientes: 0,
          observados: 0,
        };
      }

      grouped[advisorKey].casos.push(comision);
      grouped[advisorKey].totalMonto += Number(comision.amount) || 0;

      const status = (comision.status || "").toLowerCase();
      if (
        ["pagado", "aprobado", "activo"].some((keyword) =>
          status.includes(keyword),
        )
      ) {
        grouped[advisorKey].pagados += 1;
      } else if (
        ["pendiente", "revision", "revisión", "espera"].some((keyword) =>
          status.includes(keyword),
        )
      ) {
        grouped[advisorKey].pendientes += 1;
      } else {
        grouped[advisorKey].observados += 1;
      }
    });

    return Object.values(grouped).sort(
      (a, b) => b.casos.length - a.casos.length,
    );
  }, [comisiones]);

  const normalizedRutFilter = useMemo(
    () => normalizeRut(rutSearch || ""),
    [rutSearch, normalizeRut],
  );

  const asesoresFiltrados = useMemo(() => {
    if (!normalizedRutFilter) return comisionesPorAsesor;
    return comisionesPorAsesor.filter((asesor) =>
      asesor.casos.some((caso) =>
        normalizeRut(caso.rut_estudiante || "").includes(normalizedRutFilter),
      ),
    );
  }, [comisionesPorAsesor, normalizedRutFilter, normalizeRut]);

  const handleToggleAdvisor = useCallback((advisorName) => {
    setExpandedAdvisors((prev) => {
      const next = new Set(prev);
      if (next.has(advisorName)) {
        next.delete(advisorName);
      } else {
        next.add(advisorName);
      }
      return next;
    });
  }, []);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Casos por asesor ({asesoresFiltrados.length})
          </h2>
          <p className="text-sm text-slate-500">
            Resumen detallado por responsable con métricas clave.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
          <span className="text-sm text-slate-500">
            Ordenados por total de casos
          </span>
          <div className="relative w-full md:w-64">
            <input
              type="search"
              value={rutSearch}
              onChange={(event) => setRutSearch(event.target.value)}
              placeholder="Buscar por RUT de estudiante"
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
              🔍
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {asesoresFiltrados.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            {rutSearch
              ? "No encontramos casos con ese RUT."
              : "No hay asesores con registros disponibles."}
          </p>
        ) : (
          asesoresFiltrados.map((asesor) => (
            <div
              key={asesor.nombre}
              className="rounded-xl border border-slate-200 bg-white overflow-hidden"
            >
              <button
                type="button"
                onClick={() => handleToggleAdvisor(asesor.nombre)}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 transition"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {expandedAdvisors.has(asesor.nombre) ? "▼" : "▶"}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {asesor.nombre}
                      </p>
                      <p className="text-sm text-slate-500">
                        {asesor.casos.length} casos
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                      Total:{" "}
                      {asesor.totalMonto.toLocaleString("es-CL", {
                        style: "currency",
                        currency: "CLP",
                      })}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
                      ✓ {asesor.pagados} pagados
                    </span>
                    {asesor.pendientes > 0 && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">
                        ⏳ {asesor.pendientes} pendientes
                      </span>
                    )}
                    {asesor.observados > 0 && (
                      <span className="rounded-full bg-rose-100 px-3 py-1 font-medium text-rose-700">
                        ⚠ {asesor.observados} rechazados
                      </span>
                    )}
                  </div>
                </div>
              </button>
              {expandedAdvisors.has(asesor.nombre) && (
                <div className="border-t border-slate-100 bg-slate-50 p-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase text-slate-500">
                          <th className="px-3 py-2">RUT</th>
                          <th className="px-3 py-2">Estudiante</th>
                          <th className="px-3 py-2">Programa</th>
                          <th className="px-3 py-2">Monto</th>
                          <th className="px-3 py-2">Estado</th>
                          <th className="px-3 py-2">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {asesor.casos
                          .filter((caso) => {
                            if (!rutSearch) return true;
                            return normalizeRut(
                              caso.rut_estudiante || "",
                            ).includes(normalizedRutFilter);
                          })
                          .map((caso) => (
                            <tr key={caso.id} className="hover:bg-white">
                              <td className="px-3 py-2 font-mono text-slate-600">
                                {caso.rut_estudiante}
                              </td>
                              <td className="px-3 py-2">{caso.title}</td>
                              <td className="px-3 py-2 text-slate-600">
                                {caso.category}
                              </td>
                              <td className="px-3 py-2">
                                {Number(caso.amount).toLocaleString("es-CL", {
                                  style: "currency",
                                  currency: "CLP",
                                })}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusStyles(caso.status).className}`}
                                >
                                  {caso.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-500">
                                {caso.created_at
                                  ? new Date(
                                      caso.created_at,
                                    ).toLocaleDateString("es-CL")
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default AdvisorCasesSection;
