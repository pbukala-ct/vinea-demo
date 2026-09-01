import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getShopperSession } from '@/lib/auth/session';
import { getStoreContextOrNull } from '@/lib/session';
import { LoginForm } from '@/components/LoginForm';

export const metadata: Metadata = { title: 'Connexion' };

export default async function Connexion() {
  const [session, ctx] = await Promise.all([getShopperSession(), getStoreContextOrNull()]);
  if (session) redirect('/mon-compte');
  // sign-in happens through the cave, so a cave has to be chosen first
  if (!ctx) redirect('/choisir-ma-cave');

  return (
    <div className="mx-auto max-w-[420px] px-5 py-16">
      <h1 className="text-3xl">Mon compte</h1>
      <p className="mt-2 text-sm text-muted leading-relaxed">
        Un seul compte pour tout le réseau Cave Bellevin. Vos commandes vous suivent, quelle que
        soit la cave où vous achetez.
      </p>
      <div className="mt-8">
        <LoginForm
          accounts={[
            { email: 'camille.rousseau@example.fr', label: 'Camille Rousseau · cliente Paris & Lyon' },
            { email: 'theo.marchand@example.fr', label: 'Théo Marchand · client Bordeaux' },
          ]}
        />
      </div>
    </div>
  );
}
