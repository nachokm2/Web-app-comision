import Navbar from '../components/Navbar.jsx';

function CommissionCalculatorPage () {
  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        <header className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Herramientas administrativas</p>
          <h1 className="text-3xl font-bold text-slate-900">Cálculo de comisiones</h1>
          <p className="text-base text-slate-600">
            Carga un archivo Excel con la información de programa y versión para obtener un resumen rápido de montos. Próximamente podrás ejecutar el cálculo directamente desde este panel.
          </p>
        </header>
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
            <svg viewBox="0 0 24 24" className="h-12 w-12" aria-hidden="true">
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M14 2v6h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M8 14h8M8 18h5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-900">Carga de plantillas Excel</p>
          <p className="text-sm text-slate-500">Arrastra tu archivo o utiliza el botón para seleccionarlo.</p>
          <button
            type="button"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed"
            disabled
          >
            Subir archivo (próximamente)
          </button>
          <p className="mt-2 text-xs text-slate-400">Extensiones soportadas: .xlsx, .xls</p>
        </section>
      </main>
    </div>
  );
}

export default CommissionCalculatorPage;
