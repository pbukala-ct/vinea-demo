/**
 * Category tree for Cave Bellevin — 35 nodes, French labels, derived from the ACTUAL catalogue.
 *
 * The first cut of this file was an idealised French-caviste tree (Bordeaux, Bourgogne, Armagnac,
 * Pastis, Crémant...). The source catalogue can't fill it: 522 of 795 products are Australian and
 * only 27 are French, so those nodes would have rendered empty or near-empty. This tree instead
 * mirrors the catalogue's real shape — varietal-led wine, spirits, sparkling, beer — with French
 * labels and Cognac kept prominent because it genuinely has stock.
 *
 * `from` lists the SOURCE category keys each leaf absorbs. A source category absent from every
 * `from` list is deliberately excluded (see EXCLUDED below) and its products are dropped.
 */
export interface CatNode {
  key: string;
  en: string;
  fr: string;
  /** Source category keys this leaf absorbs. Leaves only. */
  from?: string[];
  children?: CatNode[];
}

export const TAXONOMY: CatNode[] = [
  {
    key: 'vins-rouges', en: 'Red Wine', fr: 'Vins Rouges',
    children: [
      { key: 'syrah',              en: 'Syrah / Shiraz',   fr: 'Syrah',                from: ['CAT-R002'] },
      { key: 'cabernet-sauvignon', en: 'Cabernet Sauvignon',fr: 'Cabernet Sauvignon',   from: ['CAT-R003'] },
      { key: 'merlot',             en: 'Merlot',           fr: 'Merlot',                from: ['CAT-R005'] },
      { key: 'pinot-noir',         en: 'Pinot Noir',       fr: 'Pinot Noir',            from: ['CAT-R004'] },
      { key: 'grenache',           en: 'Grenache',         fr: 'Grenache',              from: ['CAT-R006'] },
      { key: 'assemblages-rouges', en: 'Red Blends',       fr: 'Assemblages Rouges',    from: ['CAT-R008'] },
      { key: 'rouges-doux',        en: 'Sweet Reds',       fr: 'Rouges Doux',           from: ['CAT-R014'] },
      { key: 'autres-rouges',      en: 'Other Reds',       fr: 'Autres Rouges',         from: ['CAT-R007', 'CAT-R011', 'CAT-R012', 'CAT-R013'] },
    ],
  },
  {
    key: 'vins-blancs', en: 'White Wine', fr: 'Vins Blancs',
    children: [
      { key: 'sauvignon-blanc',    en: 'Sauvignon Blanc',  fr: 'Sauvignon Blanc',       from: ['CAT-R016'] },
      { key: 'chardonnay',         en: 'Chardonnay',       fr: 'Chardonnay',            from: ['CAT-R010'] },
      { key: 'riesling',           en: 'Riesling',         fr: 'Riesling',              from: ['CAT-R017'] },
      { key: 'pinot-gris',         en: 'Pinot Gris',       fr: 'Pinot Gris',            from: ['CAT-R018'] },
      { key: 'moscato',            en: 'Moscato',          fr: 'Muscat',                from: ['CAT-R019'] },
      { key: 'blancs-liquoreux',   en: 'Dessert White',    fr: 'Blancs Liquoreux',      from: ['CAT-R023'] },
      { key: 'autres-blancs',      en: 'Other Whites',     fr: 'Autres Blancs',         from: ['CAT-R020', 'CAT-R022'] },
    ],
  },
  { key: 'vins-roses', en: 'Rosé Wine', fr: 'Vins Rosés', from: ['CAT-R029'] },
  {
    key: 'champagne-effervescents', en: 'Champagne & Sparkling', fr: 'Champagne & Effervescents',
    children: [
      { key: 'champagne',          en: 'Champagne',        fr: 'Champagne',             from: ['CAT-R025'] },
      { key: 'prosecco',           en: 'Prosecco',         fr: 'Prosecco',              from: ['CAT-R026'] },
    ],
  },
  {
    key: 'spiritueux', en: 'Spirits', fr: 'Spiritueux',
    children: [
      { key: 'cognac-brandy',      en: 'Cognac & Brandy',  fr: 'Cognac & Brandy',       from: ['CAT-R048'] },
      { key: 'whisky',             en: 'Whisky',           fr: 'Whisky',                from: ['CAT-R042'] },
      { key: 'bourbon',            en: 'Bourbon',          fr: 'Bourbon',               from: ['CAT-R043'] },
      { key: 'gin',                en: 'Gin',              fr: 'Gin',                   from: ['CAT-R044'] },
      { key: 'vodka',              en: 'Vodka',            fr: 'Vodka',                 from: ['CAT-R045'] },
      { key: 'rhum',               en: 'Rum',              fr: 'Rhum',                  from: ['CAT-R046'] },
      { key: 'tequila-mezcal',     en: 'Tequila & Mezcal', fr: 'Tequila & Mezcal',      from: ['CAT-R047'] },
      { key: 'liqueurs',           en: 'Liqueurs',         fr: 'Liqueurs',              from: ['CAT-R049'] },
      { key: 'autres-spiritueux',  en: 'Other Spirits',    fr: 'Autres Spiritueux',     from: ['CAT-R050', 'CAT-R051', 'CAT-R052'] },
    ],
  },
  {
    key: 'bieres', en: 'Beer', fr: 'Bières',
    children: [
      { key: 'bieres-artisanales',    en: 'Craft Beer',        fr: 'Bières Artisanales',    from: ['CAT-R032'] },
      { key: 'bieres-internationales',en: 'International Beer',fr: 'Bières Internationales',from: ['CAT-R033'] },
    ],
  },
  { key: 'sans-alcool', en: 'Alcohol-Free', fr: 'Sans Alcool', from: ['CAT-R028'] },
];

/**
 * Source categories deliberately NOT carried over — products only in these are dropped.
 * All of them read as Australian bottle-shop rather than French caviste.
 */
export const EXCLUDED: Record<string, string> = {
  'CAT-R031': 'Australian Beer', 'CAT-R034': 'Mid-Strength Beer', 'CAT-R035': 'Low Carb Beer',
  'CAT-R036': 'Ginger Beer', 'CAT-R038': 'Apple Cider', 'CAT-R039': 'Pear Cider',
  'CAT-R040': 'Flavoured Cider', 'CAT-R015': 'Red Cask Wine', 'CAT-R021': 'White Cask Wine',
  'CAT-R053': 'Premix', 'CAT-R054': 'Premix Drinks', 'CAT-R055': 'Premix Bourbon',
  'CAT-R056': 'Premix Rum', 'CAT-R057': 'Premix Gin', 'CAT-R058': 'Premix Whisky',
  'CAT-R059': 'Seltzer',
};

/** Flattened, parents before children — the order categories must be created in. */
export function flatten(nodes: CatNode[] = TAXONOMY, parent?: string): { node: CatNode; parent?: string; depth: number }[] {
  const out: { node: CatNode; parent?: string; depth: number }[] = [];
  for (const node of nodes) {
    out.push({ node, parent, depth: parent ? 1 : 0 });
    if (node.children) out.push(...flatten(node.children, node.key));
  }
  return out;
}

export const ALL_NODES = flatten();
export const LEAVES = ALL_NODES.filter(({ node }) => !node.children?.length).map(({ node }) => node);
export const LEAF_KEYS = LEAVES.map((n) => n.key);
export const ALL_KEYS = ALL_NODES.map(({ node }) => node.key);

/** source category key → new leaf key */
export const SOURCE_MAP: Map<string, string> = new Map(
  LEAVES.flatMap((n) => (n.from ?? []).map((src) => [src, n.key] as [string, string])),
);
