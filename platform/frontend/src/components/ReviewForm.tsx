import React, { useState } from 'react';
import { StarRating } from './StarRating';
import { Button } from './ui/Button';

interface ReviewFormProps {
  productId: string;
  onSubmit: (reviewData: {
    rating: number;
    title: string;
    content: string;
  }) => Promise<void>;
  onCancel?: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ 
  productId, 
  onSubmit, 
  onCancel 
}) => {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (rating === 0) {
      newErrors.rating = 'Please select a rating';
    }

    if (!title.trim()) {
      newErrors.title = 'Please provide a title for your review';
    } else if (title.length > 200) {
      newErrors.title = 'Title must be 200 characters or less';
    }

    if (!content.trim()) {
      newErrors.content = 'Please write your review';
    } else if (content.length > 2000) {
      newErrors.content = 'Review must be 2000 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        rating,
        title: title.trim(),
        content: content.trim(),
      });
      
      // Reset form
      setRating(0);
      setTitle('');
      setContent('');
      setErrors({});
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    if (errors.rating) {
      setErrors(prev => ({ ...prev, rating: '' }));
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (errors.title) {
      setErrors(prev => ({ ...prev, title: '' }));
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (errors.content) {
      setErrors(prev => ({ ...prev, content: '' }));
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Write a Review</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Overall Rating *
          </label>
          <div className="flex items-center space-x-3">
            <StarRating 
              rating={rating} 
              size="lg" 
              interactive 
              onRatingChange={handleRatingChange}
            />
            {rating > 0 && (
              <span className="text-sm text-gray-600">
                {rating} out of 5 stars
              </span>
            )}
          </div>
          {errors.rating && (
            <p className="mt-1 text-sm text-red-600">{errors.rating}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label htmlFor="review-title" className="block text-sm font-medium text-gray-700 mb-2">
            Review Title *
          </label>
          <input
            id="review-title"
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Summarize your experience..."
            maxLength={200}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title}</p>
            )}
            <p className="text-sm text-gray-500">{title.length}/200</p>
          </div>
        </div>

        {/* Content */}
        <div>
          <label htmlFor="review-content" className="block text-sm font-medium text-gray-700 mb-2">
            Review Details *
          </label>
          <textarea
            id="review-content"
            value={content}
            onChange={handleContentChange}
            placeholder="Tell us about your experience with this product..."
            rows={5}
            maxLength={2000}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.content ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.content && (
              <p className="text-sm text-red-600">{errors.content}</p>
            )}
            <p className="text-sm text-gray-500">{content.length}/2000</p>
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Review Guidelines</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Be honest and helpful to other customers</li>
            <li>• Focus on the product's features and your experience</li>
            <li>• Avoid inappropriate language or personal information</li>
            <li>• Reviews are moderated and may take time to appear</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex space-x-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            * Required fields
          </div>
        </div>
      </form>
    </div>
  );
};