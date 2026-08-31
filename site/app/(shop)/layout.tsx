import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

/** The shopper-facing shell: store bar, brand header, category nav, footer. */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
