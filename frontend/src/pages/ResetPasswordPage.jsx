import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset } from '../services/api.js';

function ResetPasswordPage () {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const tokenMissing = token.length === 0;

  function handleChange (event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit (event) {
    event.preventDefault();
    if (tokenMissing) {
      setError('El enlace no es válido. Solicita un nuevo correo.');
      return;
    }
    if (form.newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      await confirmPasswordReset({ token, newPassword: form.newPassword });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err.message || 'No pudimos actualizar tu contraseña.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Crea una nueva contraseña</h1>
        <p className="mb-6 text-sm text-slate-500">Ingresa una contraseña segura para continuar.</p>
        {status === 'success' ? (
          <div className="space-y-4">
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
              Tu contraseña fue actualizada correctamente. Ya puedes iniciar sesión.
            </p>
            <Link className="text-sm text-blue-600 hover:underline" to="/login">
              Ir al inicio de sesión
            </Link>
          </div>
        ) : tokenMissing ? (
          <div className="space-y-4">
            <p className="text-sm text-red-600">El enlace es inválido o está incompleto.</p>
            <Link className="text-sm text-blue-600 hover:underline" to="/forgot-password">
              Solicitar un nuevo enlace
            </Link>
          </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600">Nueva contraseña</label>
                <input
                  type="password"
                  name="newPassword"
                  minLength={8}
                  value={form.newPassword}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-slate-300 p-2 focus:border-blue-500 focus:outline-none"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">Confirmar contraseña</label>
                <input
                  type="password"
                  name="confirmPassword"
                  minLength={8}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-slate-300 p-2 focus:border-blue-500 focus:outline-none"
                  autoComplete="new-password"
                />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <button
                type="submit"
                disabled={status === 'loading' || tokenMissing}
                className="w-full rounded bg-blue-600 py-2 text-white font-semibold disabled:bg-blue-300"
              >
                {status === 'loading' ? 'Guardando...' : 'Guardar contraseña'}
              </button>
              <div className="text-center">
                <Link className="text-sm text-blue-600 hover:underline" to="/login">
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
            )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
