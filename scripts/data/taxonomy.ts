/**
 * Category tree for Cave Bellevin — 34 nodes, French-liquor shaped.
 *
 * Deliberately smaller than the Metcash pack's 59: enough depth for a real category nav and
 * meaningful facets, small enough to seed in seconds. Names carry both locales from day one —
 * the `fr` pass then costs nothing.
 */
export interface CatNode {
  key: string;
  en: string;
  fr: string;
  children?: CatNode[];
}

export const TAXONOMY: CatNode[] = [
  {
    key: 'vins-rouges', en: 'Red Wine', fr: 'Vins Rouges',
    children: [
      { key: 'bordeaux', en: 'Bordeaux', fr: 'Bordeaux' },
      { key: 'bourgogne-rouge', en: 'Burgundy Red', fr: 'Bourgogne Rouge' },
      { key: 'rhone-rouge', en: 'Rhône Valley Red', fr: 'Vallée du Rhône Rouge' },
      { key: 'loire-rouge', en: 'Loire Red', fr: 'Loire Rouge' },
      { key: 'languedoc', en: 'Languedoc-Roussillon', fr: 'Languedoc-Roussillon' },
      { key: 'beaujolais', en: 'Beaujolais', fr: 'Beaujolais' },
    ],
  },
  {
    key: 'vins-blancs', en: 'White Wine', fr: 'Vins Blancs',
    children: [
      { key: 'bourgogne-blanc', en: 'Burgundy White', fr: 'Bourgogne Blanc' },
      { key: 'loire-blanc', en: 'Loire White', fr: 'Loire Blanc' },
      { key: 'alsace', en: 'Alsace', fr: 'Alsace' },
      { key: 'rhone-blanc', en: 'Rhône Valley White', fr: 'Vallée du Rhône Blanc' },
    ],
  },
  {
    key: 'vins-roses', en: 'Rosé Wine', fr: 'Vins Rosés',
    children: [
      { key: 'provence-rose', en: 'Provence Rosé', fr: 'Rosé de Provence' },
      { key: 'tavel', en: 'Tavel & Rhône Rosé', fr: 'Tavel & Rosé du Rhône' },
    ],
  },
  {
    key: 'champagne-effervescents', en: 'Champagne & Sparkling', fr: 'Champagne & Effervescents',
    children: [
      { key: 'champagne', en: 'Champagne', fr: 'Champagne' },
      { key: 'cremant', en: 'Crémant', fr: 'Crémant' },
      { key: 'petillant-naturel', en: 'Pétillant Naturel', fr: 'Pétillant Naturel' },
    ],
  },
  {
    key: 'spiritueux', en: 'Spirits', fr: 'Spiritueux',
    children: [
      { key: 'cognac', en: 'Cognac', fr: 'Cognac' },
      { key: 'armagnac', en: 'Armagnac', fr: 'Armagnac' },
      { key: 'whisky', en: 'Whisky', fr: 'Whisky' },
      { key: 'gin', en: 'Gin', fr: 'Gin' },
      { key: 'vodka', en: 'Vodka', fr: 'Vodka' },
      { key: 'rhum', en: 'Rum', fr: 'Rhum' },
      { key: 'pastis', en: 'Pastis & Anise', fr: 'Pastis & Anisés' },
      { key: 'liqueurs', en: 'Liqueurs', fr: 'Liqueurs' },
    ],
  },
  {
    key: 'bieres', en: 'Beer', fr: 'Bières',
    children: [
      { key: 'bieres-artisanales', en: 'Craft Beer', fr: 'Bières Artisanales' },
      { key: 'bieres-belges', en: 'Belgian Beer', fr: 'Bières Belges' },
      { key: 'bieres-blondes', en: 'Lager', fr: 'Bières Blondes' },
    ],
  },
  { key: 'cidres', en: 'Cider', fr: 'Cidres' },
  { key: 'sans-alcool', en: 'Alcohol-Free', fr: 'Sans Alcool' },
];

/** Flattened, parents before children — the order categories must be created in. */
export function flatten(nodes: CatNode[] = TAXONOMY, parent?: string): { node: CatNode; parent?: string; depth: number }[] {
  const out: { node: CatNode; parent?: string; depth: number }[] = [];
  for (const node of nodes) {
    out.push({ node, parent, depth: parent ? 1 : 0 });
    if (node.children) out.push(...flatten(node.children, node.key));
  }
  return out;
}

/** Leaf keys — the only categories products get assigned to. */
export const LEAF_KEYS: string[] = flatten()
  .filter(({ node }) => !node.children?.length)
  .map(({ node }) => node.key);
