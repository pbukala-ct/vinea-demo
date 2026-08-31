/** Query-string helpers so facet links preserve the rest of the filter state. */
export type Query = Record<string, string | undefined>;

export function buildHref(base: string, current: Query, changes: Query): string {
  const next: Query = { ...current, ...changes };
  // any filter change resets pagination — page 3 of a different result set is meaningless
  if (Object.keys(changes).some((k) => k !== 'page')) delete next.page;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

export function readQuery(sp: Record<string, string | string[] | undefined>): Query {
  const out: Query = {};
  for (const [k, v] of Object.entries(sp)) out[k] = Array.isArray(v) ? v[0] : v;
  return out;
}
