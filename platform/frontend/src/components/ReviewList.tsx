import React, { useState } from 'react';
import { StarRatingDisplay } from './StarRating';

interface Review {
  id: string;
  rating: number;
  title?: string;
  content?: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface ReviewCardProps {
  review: Review;
  onMarkHelpful?: (reviewId: string) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, onMarkHelpful }) => {
  const [isHelpfulMarked, setIsHelpfulMarked] = useState(false);

  const handleMarkHelpful = () => {
    if (onMarkHelpful && !isHelpfulMarked) {
      onMarkHelpful(review.id);
      setIsHelpfulMarked(true);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getUserDisplayName = (user: Review['user']) => {
    return `${user.firstName} ${user.lastName.charAt(0)}.`;
  };

  return (
    <div className="border-b border-gray-200 pb-6 mb-6 last:border-b-0 last:pb-0 last:mb-0">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {review.user.firstName.charAt(0)}{review.user.lastName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{getUserDisplayName(review.user)}</p>
            <div className="flex items-center space-x-2">
              <StarRatingDisplay rating={review.rating} size="sm" showText={false} />
              {review.verifiedPurchase && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verified Purchase
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-sm text-gray-500">{formatDate(review.createdAt)}</span>
      </div>

      {review.title && (
        <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
      )}

      {review.content && (
        <p className="text-gray-700 mb-4 leading-relaxed">{review.content}</p>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={handleMarkHelpful}
          disabled={isHelpfulMarked}
          className={`inline-flex items-center space-x-1 text-sm ${
            isHelpfulMarked
              ? 'text-green-600 cursor-default'
              : 'text-gray-500 hover:text-gray-700 cursor-pointer'
          } transition-colors`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7m5 3v10-10z" />
          </svg>
          <span>
            {isHelpfulMarked ? 'Marked as helpful' : 'Helpful'} ({review.helpfulCount + (isHelpfulMarked ? 1 : 0)})
          </span>
        </button>

        <div className="flex items-center space-x-4">
          <button className="text-sm text-gray-500 hover:text-gray-700">
            Report
          </button>
        </div>
      </div>
    </div>
  );
};

interface ReviewListProps {
  reviews: Review[];
  loading?: boolean;
  onMarkHelpful?: (reviewId: string) => void;
}

export const ReviewList: React.FC<ReviewListProps> = ({ 
  reviews, 
  loading = false, 
  onMarkHelpful 
}) => {
  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="flex items-start space-x-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-20 bg-gray-200 rounded mb-4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
        <p className="text-gray-500">Be the first to review this product!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <ReviewCard 
          key={review.id} 
          review={review} 
          onMarkHelpful={onMarkHelpful}
        />
      ))}
    </div>
  );
};