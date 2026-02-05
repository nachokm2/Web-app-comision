import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import CommissionCalculatorModal from '../components/CommissionCalculatorModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

function formatCurrency (value = 0) {
  return currencyFormatter.format(Math.max(0, Number(value) || 0));
}

function createHistoryId () {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `calc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function AccountingDashboardPage () {
  const { user } = useAuth();
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);

  const username = (user?.username || '').toLowerCase();
  const isAccountingUser = username === 'admin.contable@test.cl';
  if (!isAccountingUser) {
    return <Navigate to="/" replace />;
  }

  const handleCalculationConfirmed = (summary) => {
    if (!summary) return;
    const entry = {
      id: createHistoryId(),
      ...summary
    };
    setHistory((prev) => [entry, ...prev]);
    setSelectedHistoryId(entry.id);
  };

  useEffect(() => {
    if (history.length === 0) {
      setSelectedHistoryId(null);
      return;
    }
    if (!selectedHistoryId) {
      setSelectedHistoryId(history[0].id);
    }
  }, [history, selectedHistoryId]);

  const selectedHistory = history.find((entry) => entry.id === selectedHistoryId) || null;

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-indigo-500">Administrativo contable</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Cálculos y conciliaciones</h1>
          <p className="mt-2 text-sm text-slate-500">
            Bienvenido/a {user?.nombre_completo || user?.nombres || user?.username}. Desde aquí podrás cargar los consolidados de comisiones
            y dar seguimiento a los pagos.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsCalculatorOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              ⚙️ Calculo de Comisiones
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              📄 Reporte mensual
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">Historial</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">Cargas recientes</h2>
              <p className="mt-1 text-sm text-slate-500">Revisa el resultado del cálculo automático una vez confirmado.</p>
            </div>
          </div>

          {history.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              Aún no registras cargas en esta sesión. Confirma una plantilla para ver el detalle aquí.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2">Archivo</th>
                    <th className="px-4 py-2">Casos</th>
                    <th className="px-4 py-2">Monto estimado</th>
                    <th className="px-4 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedHistoryId(entry.id)}
                      className={`border-t border-slate-100 transition hover:bg-slate-50 ${
                        entry.id === selectedHistoryId ? 'bg-slate-50' : ''
                      } cursor-pointer`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{entry.processedAt}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">{entry.fileName}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">{entry.successCount}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(entry.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Calculo simulado
                        </span>
                        <p className="mt-1 text-[11px] text-slate-400">Pendiente de integración real</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedHistory ? (
            <div className="mt-6 rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Detalle de cálculo</p>
                  <h3 className="text-xl font-semibold text-slate-900">{selectedHistory.fileName}</h3>
                  <p className="text-xs text-slate-500">Confirmado el {selectedHistory.processedAt}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Monto total estimado</p>
                  <p className="text-lg font-semibold text-slate-900">{formatCurrency(selectedHistory.totalAmount)}</p>
                </div>
              </div>

              <div className="mt-4 max-h-[45vh] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2">Código</th>
                      <th className="px-4 py-2">Versión</th>
                      <th className="px-4 py-2">Monto estimado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedHistory.cases?.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-4 py-2 font-mono text-xs text-slate-500">{item.order}</td>
                        <td className="px-4 py-2 text-sm text-slate-800">{item.codPrograma}</td>
                        <td className="px-4 py-2 text-sm text-slate-800">{item.versionPrograma}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-slate-900">{formatCurrency(item.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      </main>

      <CommissionCalculatorModal
        open={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onConfirmed={handleCalculationConfirmed}
      />
    </div>
  );
}

export default AccountingDashboardPage;
