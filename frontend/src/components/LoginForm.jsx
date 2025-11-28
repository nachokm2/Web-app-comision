import { useState } from 'react';

function LoginForm ({ onSubmit, loading, error }) {
  const [form, setForm] = useState({ username: '%', password: '' });

  function handleChange (event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function handleSubmit (event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-600">Usuario</label>
        <input
          type="text"
          name="username"
          required
          value={form.username}
          onChange={handleChange}
          className="mt-1 w-full rounded border border-slate-300 p-2 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600">Contraseña</label>
        <input
          type="password"
          name="password"
          required
          value={form.password}
          onChange={handleChange}
          className="mt-1 w-full rounded border border-slate-300 p-2 focus:border-blue-500 focus:outline-none"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 py-2 text-white font-semibold disabled:bg-blue-300"
      >
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  );
}

export default LoginForm;
