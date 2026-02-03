import { useAuth } from '../context/AuthContext.jsx';
import uaLogo from '../assets/ua-logo.jpg';

function Navbar () {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <img
          src={uaLogo}
          alt="Universidad Autónoma"
          className="h-12 w-12 rounded-lg border border-slate-200 object-cover shadow-sm"
        />
        <div>
          <p className="text-lg font-semibold text-slate-800">Administración</p>
          <p className="text-sm text-slate-500">Universidad Autónoma · DUC IN ALTUM</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-700">{user?.username}</p>
          <p className="text-xs text-slate-500">Rol: {(user?.rol || user?.role || '').toString()}</p>
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
