import type { Metadata } from 'next';
import { requireManageContext } from '@/lib/manage/session';
import { listStorePromotions } from '@/lib/ct/manage/promotions';
import { TierLocked } from '@/components/manage/ui';
import { PromotionsPanel } from '@/components/manage/PromotionsPanel';

export const metadata: Metadata = { title: 'Promotions' };

export default async function ManagePromotions() {
  const ctx = await requireManageContext();

  if (!ctx.tier.features.storePromotions) {
    return (
      <TierLocked
        capability="Promotions de votre cave"
        tierLabel={ctx.tier.labelFr || ctx.tier.label}
        explain="Créer vos propres remises, réservées à votre cave et à vos clients, est inclus au palier Premium. Les offres du réseau continuent de s’appliquer normalement."
      />
    );
  }

  const promotions = await listStorePromotions(ctx.session.storeKey);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Promotions</h1>
        <p className="text-sm text-muted mt-1">
          Vos remises, appliquées aux paniers de {ctx.store.programme.city} uniquement.
        </p>
      </div>
      <PromotionsPanel promotions={promotions} />
    </div>
  );
}
