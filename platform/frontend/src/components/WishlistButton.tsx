'use client';

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface WishlistButtonProps {
  productId: string;
  productName?: string;
  className?: string;
  showText?: boolean;
}

export default function WishlistButton({ 
  productId, 
  productName = 'this product',
  className = '',
  showText = false
}: WishlistButtonProps) {
  const { user } = useAuth();
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && productId) {
      checkWishlistStatus();
    }
  }, [user, productId]);

  const checkWishlistStatus = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/v1/wishlist/check/${productId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInWishlist(data.data.inWishlist);
      }
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  const toggleWishlist = async () => {
    if (!user) {
      // Redirect to login or show login modal
      window.location.href = '/login';
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/v1/wishlist/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          productId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setInWishlist(data.data.inWishlist);
        
        // Show success message
        if (data.data.action === 'added') {
          console.log(`Added ${productName} to wishlist`);
        } else {
          console.log(`Removed ${productName} from wishlist`);
        }
      } else {
        console.error('Failed to update wishlist');
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <button
        onClick={toggleWishlist}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors ${className}`}
        title="Login to add to wishlist"
      >
        <Heart className="h-5 w-5 text-gray-400" />
        {showText && <span className="text-sm text-gray-600">Add to Wishlist</span>}
      </button>
    );
  }

  return (
    <button
      onClick={toggleWishlist}
      disabled={loading}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
        inWishlist
          ? 'bg-red-50 border border-red-200 hover:bg-red-100'
          : 'border border-gray-300 hover:bg-gray-50'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      title={inWishlist ? `Remove ${productName} from wishlist` : `Add ${productName} to wishlist`}
    >
      <Heart 
        className={`h-5 w-5 transition-colors ${
          inWishlist ? 'text-red-500 fill-current' : 'text-gray-400'
        }`} 
      />
      {showText && (
        <span className={`text-sm ${inWishlist ? 'text-red-600' : 'text-gray-600'}`}>
          {loading ? 'Updating...' : inWishlist ? 'In Wishlist' : 'Add to Wishlist'}
        </span>
      )}
    </button>
  );
}