'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
        router.refresh();
      }}
      disabled={busy}
      className={className}
    >
      {busy ? 'Déconnexion…' : 'Se déconnecter'}
    </button>
  );
}
