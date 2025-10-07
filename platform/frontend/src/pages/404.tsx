import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';

export default function NotFound() {
  const { itemCount } = useCart();

  return (
    <Layout cartItemCount={itemCount}>
      <div className="bg-white min-h-screen">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="mb-8">
              <h1 className="text-9xl font-bold text-gray-200">404</h1>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Page Not Found
            </h2>
            
            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
              Sorry, we couldn't find the page you're looking for. 
              The page might have been moved, deleted, or never existed.
            </p>

            <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
              <Button size="lg">
                <Link href="/">
                  Go to Homepage
                </Link>
              </Button>
              
              <Button variant="outline" size="lg">
                <Link href="/products">
                  Browse Products
                </Link>
              </Button>
            </div>

            <div className="mt-12">
              <p className="text-sm text-gray-500">
                Need help? <Link href="/contact" className="text-blue-600 hover:text-blue-500">Contact support</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}