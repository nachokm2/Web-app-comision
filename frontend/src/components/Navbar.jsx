import { useAuth } from '../context/AuthContext.jsx';

function Navbar () {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
      <div>
        <p className="text-lg font-semibold text-slate-800">Panel Personalizado</p>
        <p className="text-sm text-slate-500">Registros asignados al usuario autenticado</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-700">{user?.username}</p>
          <p className="text-xs text-slate-500">Rol: {user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

export default Navbar;
