import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const COLORS = {
  paid: '#10b981',
  pending: '#f59e0b',
  rejected: '#f43f5e'
};

function CustomTooltip ({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const stats = payload.map((item) => (
    <div key={item.dataKey} className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
        {item.name}
      </span>
      <strong className="text-slate-900">{item.value}</strong>
    </div>
  ));

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-md">
      <p className="text-xs font-semibold text-slate-800">{label}</p>
      <div className="mt-1 space-y-1 text-slate-600">
        {stats}
      </div>
    </div>
  );
}

function PaymentTrendChart ({ data }) {
  if (!data?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Histórico mensual</p>
          <h2 className="text-xl font-semibold text-slate-900">Resumen de pagos</h2>
          <p className="text-xs text-slate-500">Registro acumulado de pagados, pendientes y rechazados.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          <LegendPill color={COLORS.paid} label="Pagadas" />
          <LegendPill color={COLORS.pending} label="Pendientes" />
          <LegendPill color={COLORS.rejected} label="Rechazadas" />
        </div>
      </div>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, bottom: 0, left: 0, right: 10 }}>
            <CartesianGrid stroke="#eceff1" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5f5' }} />
            <Line type="monotone" dataKey="paid" name="Pagadas" stroke={COLORS.paid} strokeWidth={3} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="pending" name="Pendientes" stroke={COLORS.pending} strokeWidth={3} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="rejected" name="Rechazadas" stroke={COLORS.rejected} strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendPill ({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export default PaymentTrendChart;
