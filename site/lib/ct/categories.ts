import 'server-only';
import { cache } from 'react';
import { apiRoot } from './client';
import { localized } from '@/lib/format';
import { DISPLAY_LOCALE } from '@/lib/constants';
import { getStoreContextOrNull } from '@/lib/session';

export interface CatNode {
  id: string;
  key: string;
  label: string;
  parentId?: string;
  children: CatNode[];
  /** products in this node's subtree, in the selected store (0 when no store selected) */
  count: number;
}

const rawCategories = cache(async () => {
  const res = await apiRoot.categories().get({ queryArgs: { limit: 200 } }).execute();
  return res.body.results;
});

export const categoryByKey = cache(async (key: string) => {
  const all = await rawCategories();
  return all.find((c) => c.key === key) ?? null;
});

export const categoryById = cache(async (id: string) => {
  const all = await rawCategories();
  return all.find((c) => c.id === id) ?? null;
});

/**
 * The category tree with per-node product counts SCOPED TO THE SELECTED STORE.
 *
 * Counts come from one `distinct` facet over leaf categories, then roll up through `ancestors`.
 * Nodes with a zero count are pruned: a store that doesn't stock Cognac must not show a Cognac
 * link that leads to an empty page.
 */
export const categoryTree = cache(async (): Promise<CatNode[]> => {
  const [all, ctx] = await Promise.all([rawCategories(), getStoreContextOrNull()]);

  const counts = new Map<string, number>();
  if (ctx?.store.productSelectionId) {
    try {
      const { body } = await apiRoot.products().search().post({
        body: {
          query: { exact: { field: 'productSelections', value: ctx.store.productSelectionId } },
          facets: [{ distinct: { name: 'cat', field: 'categories', limit: 100 } }],
          limit: 0,
        },
      }).execute();
      const facet = (body.facets ?? []).find((f) => f.name === 'cat') as { buckets?: { key: unknown; count: number }[] } | undefined;
      const byId = new Map(all.map((c) => [c.id, c]));
      for (const b of facet?.buckets ?? []) {
        const id = String(b.key);
        counts.set(id, (counts.get(id) ?? 0) + b.count);
        // roll the leaf count up every ancestor so roots show a subtree total
        for (const a of byId.get(id)?.ancestors ?? []) counts.set(a.id, (counts.get(a.id) ?? 0) + b.count);
      }
    } catch { /* no counts → tree renders unpruned below */ }
  }

  const nodes = new Map<string, CatNode>();
  for (const c of all) {
    nodes.set(c.id, {
      id: c.id,
      key: c.key ?? c.id,
      label: localized(c.name as Record<string, string>, DISPLAY_LOCALE),
      parentId: c.parent?.id,
      children: [],
      count: counts.get(c.id) ?? 0,
    });
  }
  const roots: CatNode[] = [];
  for (const c of all) {
    const node = nodes.get(c.id)!;
    const parent = c.parent?.id ? nodes.get(c.parent.id) : undefined;
    if (parent) parent.children.push(node); else roots.push(node);
  }

  const prune = (list: CatNode[]): CatNode[] =>
    list
      .filter((n) => (counts.size === 0 ? true : n.count > 0))
      .map((n) => ({ ...n, children: prune(n.children) }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return prune(roots);
});
