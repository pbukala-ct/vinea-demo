import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import { BRAND, BRAND_TAGLINE } from '@/lib/constants';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-cormorant', display: 'swap',
});
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: `${BRAND} — ${BRAND_TAGLINE}`, template: `%s · ${BRAND}` },
  description:
    'Cave Bellevin — un réseau de cavistes indépendants. Vins, champagnes et spiritueux sélectionnés, retrait en magasin et livraison.',
};

/**
 * Root layout is deliberately chrome-free. The shopper header/footer live in the (shop) route
 * group; /manage has its own shell. Otherwise the retailer back office renders underneath the
 * shopper's store bar and category nav, which is nonsense — they are different audiences with
 * different store contexts (you can shop Paris while managing Nantes).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
