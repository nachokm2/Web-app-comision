import { useEffect, useMemo, useState } from 'react';
import GenericTable from './GenericTable.jsx';
import { fetchAdminSchemaSnapshot } from '../services/api.js';

function AdminDashboard () {
  const [snapshot, setSnapshot] = useState(null);
  const [activeTable, setActiveTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData () {
      try {
        setLoading(true);
        const data = await fetchAdminSchemaSnapshot();
        setSnapshot(data);
        const firstTable = Object.keys(data.tables)[0];
        setActiveTable(firstTable);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const summary = useMemo(() => {
    if (!snapshot) return null;
    const totalAsesores = snapshot.casesByAdvisor.length;
    const totalComisiones = snapshot.casesByAdvisor.reduce((acc, item) => acc + item.total_casos, 0);
    const totalValor = snapshot.casesByAdvisor.reduce((acc, item) => acc + item.total_valor_comision, 0);
    return {
      totalAsesores,
      totalComisiones,
      totalValor
    };
  }, [snapshot]);

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

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Total asesores" value={summary.totalAsesores} />
        <SummaryCard title="Total casos" value={summary.totalComisiones} />
        <SummaryCard
          title="Valor total comisiones"
          value={summary.totalValor.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}
        />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-slate-800">Casos por asesor</h2>
          <p className="text-sm text-slate-500">Ordenados por cantidad de casos</p>
        </div>
        <div className="space-y-4">
          {snapshot.casesByAdvisor.map((advisor) => (
            <AdvisorCard key={advisor.asesor_id} advisor={advisor} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-slate-800">Tablas del esquema comision_ua</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {tableNames.map((table) => (
            <button
              key={table}
              onClick={() => setActiveTable(table)}
              className={`rounded-full border px-4 py-1 text-sm ${
                activeTable === table ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
              }`}
            >
              {table}
            </button>
          ))}
        </div>
        {activeTable ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Mostrando {snapshot.tables[activeTable].length} registros de {activeTable}.</p>
            <GenericTable rows={snapshot.tables[activeTable]} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SummaryCard ({ title, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function AdvisorCard ({ advisor }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-800">{advisor.nombre_completo}</p>
          <p className="text-sm text-slate-500">{advisor.correo}</p>
        </div>
        <div className="flex gap-4 text-sm">
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
            <div key={caso.comision_id} className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">#{caso.comision_id} · {caso.programa}</p>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{caso.estado_pago || 'Sin estado'}</span>
              </div>
              <p>Estudiante: {caso.estudiante || caso.rut_estudiante}</p>
              <p>Fecha matrícula: {caso.fecha_matricula ? new Date(caso.fecha_matricula).toLocaleDateString() : '—'}</p>
              <p>Sede: {caso.sede || '—'} · Versión {caso.version_programa ?? '—'}</p>
              <p>Categorías: {caso.categorias?.length ? caso.categorias.join(', ') : 'Sin categoría'}</p>
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

export default AdminDashboard;
