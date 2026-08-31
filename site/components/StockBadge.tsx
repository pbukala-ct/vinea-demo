/**
 * Availability, stated before the shopper commits to anything.
 *
 * Out-of-stock is announced here AND disables add-to-cart, rather than letting the click fail —
 * a control that cannot succeed should never look available.
 */
export function StockBadge({ onStock, quantity }: { onStock: boolean; quantity: number }) {
  if (!onStock || quantity <= 0) {
    return <span className="text-xs font-medium text-muted">Épuisé en magasin</span>;
  }
  if (quantity <= 3) {
    return <span className="text-xs font-medium text-bordeaux">Plus que {quantity} en cave</span>;
  }
  return <span className="text-xs font-medium text-sage">En stock</span>;
}
