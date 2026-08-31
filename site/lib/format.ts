import { CURRENCY } from './constants';

/** Money from commercetools minor units. French convention: 12,45 € */
export function money(centAmount: number | undefined, currency = CURRENCY): string {
  if (centAmount == null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(centAmount / 100);
}

export function localized(v: Record<string, string> | undefined, locale = 'fr'): string {
  if (!v) return '';
  // fr → en fallback: categories and tiers carry both, products carry English only
  return v[locale] ?? v.en ?? v.fr ?? Object.values(v)[0] ?? '';
}

/** "Mar–Sam 10h–20h · Dim 10h–13h30 · Lun fermé" → first clause, for compact display */
export const firstClause = (s: string | undefined) => (s ?? '').split('·')[0]?.trim() ?? '';
