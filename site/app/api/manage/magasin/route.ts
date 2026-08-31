import { NextResponse } from 'next/server';
import { getManageContext } from '@/lib/manage/session';
import { saveStoreProfile } from '@/lib/ct/manage/store';

export async function PATCH(req: Request) {
  const ctx = await getManageContext();
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const num = (v: unknown) => (v === '' || v == null ? undefined : Number(v));
  const result = await saveStoreProfile(
    ctx.session.storeKey,
    {
      street_address: b.street_address, city: b.city, postal_code: b.postal_code,
      phone: b.phone, opening_hours: b.opening_hours,
      click_collect_enabled: b.click_collect_enabled, delivery_enabled: b.delivery_enabled,
      delivery_radius_km: num(b.delivery_radius_km), timeslot_capacity: num(b.timeslot_capacity),
    },
    // the tier decides what fulfilment this cave is allowed to switch on at all
    { clickCollect: ctx.tier.features.clickCollect, delivery: ctx.tier.features.homeDelivery },
  );
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
