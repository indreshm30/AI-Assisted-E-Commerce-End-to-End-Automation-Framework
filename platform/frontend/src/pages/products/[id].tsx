import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Product } from '@/types';
import { apiClient } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { StarIcon, HeartIcon, ShareIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import Image from 'next/image';
import Link from 'next/link';

export default function ProductDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  const { addToCart, isLoading: cartLoading, itemCount } = useCart();

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.getProductById(id);
        setProduct(response.data);
      } catch (error) {
        console.error('Failed to fetch product:', error);
        setError('Failed to load product details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      await addToCart(product, quantity);
      // Show success feedback (could be a toast notification)
      alert(`Added ${quantity} item(s) to cart!`);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert('Failed to add item to cart');
    }
  };

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    // TODO: Implement wishlist functionality
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: `Check out ${product?.name} on AutomateStore`,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Product link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <Layout cartItemCount={itemCount}>
        <div className="bg-white min-h-screen">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Image skeleton */}
                <div className="space-y-4">
                  <div className="aspect-w-1 aspect-h-1 w-full bg-gray-200 rounded-lg h-96"></div>
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="aspect-w-1 aspect-h-1 w-full bg-gray-200 rounded h-20"></div>
                    ))}
                  </div>
                </div>
                
                {/* Content skeleton */}
                <div className="space-y-6">
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-12 bg-gray-200 rounded w-1/3"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout cartItemCount={itemCount}>
        <div className="bg-white min-h-screen">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {error || 'Product not found'}
              </h1>
              <Button>
                <Link href="/products">
                  Back to Products
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const images = product.images || [];
  const currentImage = images[selectedImageIndex];
  const inStock = product.inventoryQuantity > 0;

  return (
    <Layout cartItemCount={itemCount}>
      <div className="bg-white min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm text-gray-600">
              <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
              <li>/</li>
              <li><Link href="/products" className="hover:text-blue-600">Products</Link></li>
              <li>/</li>
              {product.category && (
                <>
                  <li><span className="hover:text-blue-600">{product.category.name}</span></li>
                  <li>/</li>
                </>
              )}
              <li className="text-gray-900 font-medium truncate">{product.name}</li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200">
                {currentImage ? (
                  <Image
                    src={currentImage.url}
                    alt={currentImage.altText || product.name}
                    width={600}
                    height={600}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-100">
                    <svg
                      className="h-24 w-24 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Thumbnail Images */}
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`aspect-w-1 aspect-h-1 w-full overflow-hidden rounded border-2 ${
                        index === selectedImageIndex ? 'border-blue-500' : 'border-gray-200'
                      }`}
                    >
                      <Image
                        src={image.url}
                        alt={image.altText || product.name}
                        width={100}
                        height={100}
                        className="h-full w-full object-cover object-center"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Information */}
            <div className="space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {product.featured && (
                      <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 mb-2">
                        Featured
                      </span>
                    )}
                    <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                    {product.brand && (
                      <p className="mt-2 text-lg text-gray-600">by {product.brand.name}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="ghost" size="sm" onClick={handleWishlist}>
                      {isWishlisted ? (
                        <HeartIconSolid className="w-6 h-6 text-red-500" />
                      ) : (
                        <HeartIcon className="w-6 h-6" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleShare}>
                      <ShareIcon className="w-6 h-6" />
                    </Button>
                  </div>
                </div>

                {/* Reviews */}
                {product.avgRating && product.reviewCount && (
                  <div className="flex items-center mt-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(product.avgRating!)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="ml-2 text-sm text-gray-600">
                      {product.avgRating.toFixed(1)} ({product.reviewCount} reviews)
                    </span>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="border-t border-b py-6">
                <div className="flex items-baseline space-x-3">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </span>
                  {product.comparePrice && product.comparePrice > product.price && (
                    <>
                      <span className="text-xl text-gray-500 line-through">
                        {formatPrice(product.comparePrice)}
                      </span>
                      <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                        Save {formatPrice(product.comparePrice - product.price)}
                      </span>
                    </>
                  )}
                </div>
                
                <div className="mt-3">
                  {inStock ? (
                    <span className="text-green-600 font-medium">
                      ✓ In Stock ({product.inventoryQuantity} available)
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">
                      ✗ Out of Stock
                    </span>
                  )}
                </div>
              </div>

              {/* Add to Cart */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 hover:bg-gray-50 disabled:opacity-50"
                      disabled={quantity <= 1}
                    >
                      -
                    </button>
                    <span className="px-4 py-2 border-x border-gray-300 min-w-[60px] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-2 hover:bg-gray-50 disabled:opacity-50"
                      disabled={quantity >= product.inventoryQuantity}
                    >
                      +
                    </button>
                  </div>
                  
                  <Button
                    size="lg"
                    onClick={handleAddToCart}
                    disabled={!inStock || cartLoading}
                    isLoading={cartLoading}
                    className="flex-1"
                  >
                    <ShoppingCartIcon className="w-5 h-5 mr-2" />
                    {inStock ? 'Add to Cart' : 'Out of Stock'}
                  </Button>
                </div>

                <Button variant="outline" size="lg" className="w-full">
                  Buy Now
                </Button>
              </div>

              {/* Product Details */}
              <div className="space-y-6 pt-6 border-t">
                {product.description && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                    <p className="text-gray-700 leading-relaxed">{product.description}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Product Details</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="font-medium text-gray-900">SKU:</dt>
                      <dd className="text-gray-700">{product.sku}</dd>
                    </div>
                    {product.barcode && (
                      <div>
                        <dt className="font-medium text-gray-900">Barcode:</dt>
                        <dd className="text-gray-700">{product.barcode}</dd>
                      </div>
                    )}
                    {product.weight && (
                      <div>
                        <dt className="font-medium text-gray-900">Weight:</dt>
                        <dd className="text-gray-700">{product.weight} kg</dd>
                      </div>
                    )}
                    <div>
                      <dt className="font-medium text-gray-900">Shipping:</dt>
                      <dd className="text-gray-700">
                        {product.requiresShipping ? 'Required' : 'Not required'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-900">Type:</dt>
                      <dd className="text-gray-700">
                        {product.isDigital ? 'Digital Product' : 'Physical Product'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}