import { NextResponse } from 'next/server';
import { getManageContext } from '@/lib/manage/session';
import { setRanged } from '@/lib/ct/manage/selection';

export async function POST(req: Request) {
  const ctx = await getManageContext();
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  // the capability check lives here too — the UI hiding the control is not a permission
  if (!ctx.tier.features.assortmentControl) {
    return NextResponse.json({ error: 'assortment_not_permitted', tier: ctx.tier.label }, { status: 403 });
  }

  const { productId, ranged } = await req.json().catch(() => ({}));
  if (typeof productId !== 'string' || typeof ranged !== 'boolean') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const result = await setRanged(ctx.store, productId, ranged, ctx.tier.rangeCeiling);
  if (!result.ok) {
    const status = result.error === 'ceiling_reached' ? 409 : 422;
    return NextResponse.json({ error: result.error, rangedCount: result.rangedCount, ceiling: ctx.tier.rangeCeiling }, { status });
  }
  return NextResponse.json({ ok: true, ranged, rangedCount: result.rangedCount, ceiling: ctx.tier.rangeCeiling });
}
