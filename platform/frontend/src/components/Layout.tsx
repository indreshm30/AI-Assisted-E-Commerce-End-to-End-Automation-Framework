import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface LayoutProps {
  children: ReactNode;
  cartItemCount?: number;
}

export function Layout({ children, cartItemCount }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header cartItemCount={cartItemCount} />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}