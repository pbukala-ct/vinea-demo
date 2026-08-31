import { NextResponse } from 'next/server';
import { getManageContext } from '@/lib/manage/session';
import { createStorePromotion, setPromotionActive, deletePromotion, type PromoKind } from '@/lib/ct/manage/promotions';

async function guard() {
  const ctx = await getManageContext();
  if (!ctx) return { error: NextResponse.json({ error: 'unauthenticated' }, { status: 401 }) };
  if (!ctx.tier.features.storePromotions) {
    return { error: NextResponse.json({ error: 'promotions_not_permitted', tier: ctx.tier.label }, { status: 403 }) };
  }
  return { ctx };
}

export async function POST(req: Request) {
  const g = await guard();
  if (g.error) return g.error;
  const body = await req.json().catch(() => ({}));
  const kind: PromoKind = body.kind === 'amount-off-cart' ? 'amount-off-cart' : 'percent-off-cart';
  const result = await createStorePromotion(g.ctx!.session.storeKey, {
    name: String(body.name ?? ''),
    kind,
    value: Number(body.value) || 0,
    minSpendEur: Number(body.minSpendEur) || 0,
    days: Number(body.days) || 30,
  });
  if ('error' in result) return NextResponse.json(result, { status: 422 });
  return NextResponse.json({ ok: true, promotion: result });
}

export async function PATCH(req: Request) {
  const g = await guard();
  if (g.error) return g.error;
  const { id, isActive } = await req.json().catch(() => ({}));
  if (typeof id !== 'string' || typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const ok = await setPromotionActive(g.ctx!.session.storeKey, id, isActive);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_found_in_store' }, { status: 404 });
}

export async function DELETE(req: Request) {
  const g = await guard();
  if (g.error) return g.error;
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== 'string') return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const ok = await deletePromotion(g.ctx!.session.storeKey, id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_found_in_store' }, { status: 404 });
}
