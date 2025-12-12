import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../services/api.js';

function ForgotPasswordPage () {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function handleSubmit (event) {
    event.preventDefault();
    if (!username.trim()) {
      setError('Ingresa tu usuario institucional.');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      await requestPasswordReset(username.trim());
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err.message || 'No pudimos enviar el correo. Inténtalo de nuevo.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">¿Olvidaste tu contraseña?</h1>
        <p className="mb-6 text-sm text-slate-500">
          Ingresa tu usuario corporativo. Si existe una cuenta asociada a tu correo institucional,
          recibirás un enlace para crear una nueva contraseña.
        </p>
        {status === 'success'
          ? (
            <div className="space-y-4">
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
                Si encontramos una cuenta para <strong>{username}</strong>, te enviamos instrucciones al correo institucional.
              </p>
              <Link className="text-sm text-blue-600 hover:underline" to="/login">
                Volver al inicio de sesión
              </Link>
            </div>
            )
          : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600">Usuario</label>
                <input
                  type="text"
                  name="username"
                  value={username}
                  onChange={event => setUsername(event.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 focus:border-blue-500 focus:outline-none"
                  autoComplete="username"
                />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded bg-blue-600 py-2 text-white font-semibold disabled:bg-blue-300"
              >
                {status === 'loading' ? 'Enviando...' : 'Enviar instrucciones'}
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

export default ForgotPasswordPage;
