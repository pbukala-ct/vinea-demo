/** Project locale/currency/country. One place, so nothing hardcodes 'EUR' inline. */

/**
 * Two locales, deliberately.
 *
 * DISPLAY_LOCALE is what the shopper reads. Categories and tier labels are seeded in French, so
 * the UI renders French and `localized()` falls back to English for anything that has no French
 * value — which is every product, since the catalogue is English-only for now.
 *
 * DATA_LOCALE is what we QUERY commercetools with: product name and slug exist only in `en`, so a
 * full-text search or a slug lookup issued with `fr` matches nothing. Conflating the two put an
 * English category bar next to French copy, and would have silently broken search and PDP links.
 */
export const DISPLAY_LOCALE = 'fr';
export const DATA_LOCALE = 'en';
export const CURRENCY = 'EUR';
export const COUNTRY = 'FR';
export const BRAND = 'Cave Bellevin';
export const BRAND_TAGLINE = 'Votre caviste de quartier';
export const FRANCHISOR = 'Groupe Vinéa';
export const PAGE_SIZE = 24;
