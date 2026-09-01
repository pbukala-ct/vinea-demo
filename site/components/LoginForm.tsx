'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm({ accounts }: { accounts: { email: string; label: string }[] }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (res.ok) { router.push('/mon-compte'); router.refresh(); return; }
    const j = await res.json().catch(() => ({}));
    setError(
      j.error === 'invalid_credentials' ? 'E-mail ou mot de passe incorrect.'
      : j.error === 'no_store' ? 'Choisissez d’abord votre cave.'
      : 'Connexion impossible pour le moment.',
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="block text-xs text-muted mb-1">E-mail</span>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
          autoComplete="email"
          className="w-full border border-line bg-surface px-3 py-2.5 text-sm"
        />
      </label>
      <label className="block">
        <span className="block text-xs text-muted mb-1">Mot de passe</span>
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
          autoComplete="current-password"
          className="w-full border border-line bg-surface px-3 py-2.5 text-sm"
        />
      </label>
      {error ? <p className="text-sm text-bordeaux" role="alert">{error}</p> : null}
      <button
        type="submit" disabled={busy}
        className="w-full bg-bordeaux hover:bg-bordeaux-dark disabled:opacity-60 text-white py-3.5 text-sm font-medium"
      >
        {busy ? 'Connexion…' : 'Se connecter'}
      </button>

      {/* Demo convenience: fills the form so nobody types an email on stage. */}
      <div className="pt-4 rule">
        <p className="eyebrow mb-2">Comptes de démonstration</p>
        <ul className="space-y-1.5">
          {accounts.map((a) => (
            <li key={a.email}>
              <button
                type="button"
                onClick={() => { setEmail(a.email); setPassword('bellevin2026'); setError(null); }}
                className="text-sm text-left underline underline-offset-2 hover:text-bordeaux"
              >
                {a.label}
              </button>
              <span className="block text-xs text-muted">{a.email}</span>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
