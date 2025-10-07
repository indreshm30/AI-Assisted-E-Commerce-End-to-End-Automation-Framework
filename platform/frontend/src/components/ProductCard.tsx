import { Product } from '@/types';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string) => void;
  isLoading?: boolean;
}

export function ProductCard({ product, onAddToCart, isLoading }: ProductCardProps) {
  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product.id);
    }
  };

  return (
    <div className="group relative bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Product Image */}
      <Link href={`/products/${product.id}`}>
        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200 group-hover:opacity-75">
          {product.images && product.images.length > 0 ? (
            <Image
              src={product.images[0].url}
              alt={product.images[0].altText || product.name}
              width={300}
              height={300}
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <svg
                className="h-16 w-16 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-4">
        {/* Category Badge */}
        {product.category && (
          <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 mb-2">
            {product.category.name}
          </span>
        )}

        {/* Product Name */}
        <Link href={`/products/${product.id}`}>
          <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Brand */}
        {product.brand && (
          <p className="text-sm text-gray-600 mt-1">{product.brand.name}</p>
        )}

        {/* Description */}
        {product.description && (
          <p className="text-sm text-gray-700 mt-2 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Price and Stock */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(product.price)}
            </span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(product.comparePrice)}
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-600">
            {product.inventoryQuantity > 0 ? (
              <span className="text-green-600">
                {product.inventoryQuantity} in stock
              </span>
            ) : (
              <span className="text-red-600">Out of stock</span>
            )}
          </div>
        </div>

        {/* Add to Cart Button */}
        <Button
          onClick={handleAddToCart}
          disabled={product.inventoryQuantity === 0 || isLoading}
          isLoading={isLoading}
          className="w-full mt-4"
        >
          {product.inventoryQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
        </Button>

        {/* Featured Badge */}
        {product.featured && (
          <div className="absolute top-2 left-2">
            <span className="inline-block rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
              Featured
            </span>
          </div>
        )}
      </div>
    </div>
  );
}