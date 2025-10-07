import React from 'react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  maxRating = 5, 
  size = 'md', 
  interactive = false, 
  onRatingChange 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleStarClick = (starRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  return (
    <div className="flex items-center space-x-1">
      {[...Array(maxRating)].map((_, index) => {
        const starRating = index + 1;
        const isFilled = starRating <= rating;
        const isHalfFilled = starRating - 0.5 === rating;
        
        return (
          <button
            key={index}
            type="button"
            className={`${sizeClasses[size]} ${
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'
            } focus:outline-none`}
            onClick={() => handleStarClick(starRating)}
            disabled={!interactive}
          >
            <svg
              viewBox="0 0 24 24"
              fill={isFilled || isHalfFilled ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1"
              className={`${
                isFilled || isHalfFilled 
                  ? 'text-yellow-400' 
                  : 'text-gray-300'
              } ${interactive ? 'hover:text-yellow-400' : ''}`}
            >
              {isHalfFilled ? (
                <>
                  <defs>
                    <linearGradient id={`half-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="50%" stopColor="currentColor" className="text-yellow-400" />
                      <stop offset="50%" stopColor="currentColor" className="text-gray-300" />
                    </linearGradient>
                  </defs>
                  <path
                    fill={`url(#half-${index})`}
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  />
                </>
              ) : (
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              )}
            </svg>
          </button>
        );
      })}
    </div>
  );
};

interface StarRatingDisplayProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const StarRatingDisplay: React.FC<StarRatingDisplayProps> = ({
  rating,
  reviewCount,
  size = 'md',
  showText = true,
}) => {
  return (
    <div className="flex items-center space-x-2">
      <StarRating rating={rating} size={size} />
      {showText && (
        <div className="flex items-center space-x-1 text-sm text-gray-600">
          <span className="font-medium">{rating.toFixed(1)}</span>
          {reviewCount !== undefined && (
            <span>({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
          )}
        </div>
      )}
    </div>
  );
};