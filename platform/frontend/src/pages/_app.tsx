import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { CartProvider } from '@/contexts/CartContext';
import { AuthProvider } from '@/contexts/AuthContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>AutomateStore - Smart E-Commerce Platform</title>
        <meta name="description" content="Discover quality products with AI-powered recommendations. Shop smarter with AutomateStore." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <AuthProvider>
        <CartProvider>
          <Component {...pageProps} />
        </CartProvider>
      </AuthProvider>
    </>
  );
}