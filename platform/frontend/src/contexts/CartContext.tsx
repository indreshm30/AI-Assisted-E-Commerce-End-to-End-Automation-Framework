import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { CartItem, Product } from '@/types';

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
  total: number;
  itemCount: number;
}

interface CartContextType extends CartState {
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

type CartAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ITEMS'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'UPDATE_ITEM'; payload: { itemId: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' };

const CartContext = createContext<CartContextType | undefined>(undefined);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_ITEMS':
      const items = action.payload;
      const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
      return { ...state, items, total, itemCount, isLoading: false, error: null };
    
    case 'ADD_ITEM':
      const newItems = [...state.items, action.payload];
      const newTotal = newItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const newItemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      return { 
        ...state, 
        items: newItems, 
        total: newTotal, 
        itemCount: newItemCount, 
        isLoading: false, 
        error: null 
      };
    
    case 'UPDATE_ITEM':
      const updatedItems = state.items.map(item => 
        item.id === action.payload.itemId 
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      const updatedTotal = updatedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const updatedItemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      return { 
        ...state, 
        items: updatedItems, 
        total: updatedTotal, 
        itemCount: updatedItemCount, 
        isLoading: false, 
        error: null 
      };
    
    case 'REMOVE_ITEM':
      const filteredItems = state.items.filter(item => item.id !== action.payload);
      const filteredTotal = filteredItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const filteredItemCount = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
      return { 
        ...state, 
        items: filteredItems, 
        total: filteredTotal, 
        itemCount: filteredItemCount, 
        isLoading: false, 
        error: null 
      };
    
    case 'CLEAR_CART':
      return { ...state, items: [], total: 0, itemCount: 0, isLoading: false, error: null };
    
    default:
      return state;
  }
};

const initialState: CartState = {
  items: [],
  isLoading: false,
  error: null,
  total: 0,
  itemCount: 0,
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem('automate_store_cart');
        if (savedCart) {
          const cartItems: CartItem[] = JSON.parse(savedCart);
          dispatch({ type: 'SET_ITEMS', payload: cartItems });
        }
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load cart data' });
      }
    };

    loadCart();
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem('automate_store_cart', JSON.stringify(state.items));
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  }, [state.items]);

  const addToCart = async (product: Product, quantity = 1): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Check if item already exists in cart
      const existingItem = state.items.find(item => item.productId === product.id);
      
      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + quantity;
        dispatch({ 
          type: 'UPDATE_ITEM', 
          payload: { itemId: existingItem.id, quantity: newQuantity } 
        });
      } else {
        // Add new item to cart
        const newCartItem: CartItem = {
          id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          productId: product.id,
          quantity,
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          product,
        };
        dispatch({ type: 'ADD_ITEM', payload: newCartItem });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add item to cart' });
      throw error;
    }
  };

  const updateQuantity = async (itemId: string, quantity: number): Promise<void> => {
    if (quantity <= 0) {
      return removeFromCart(itemId);
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      dispatch({ type: 'UPDATE_ITEM', payload: { itemId, quantity } });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update item quantity' });
      throw error;
    }
  };

  const removeFromCart = async (itemId: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      dispatch({ type: 'REMOVE_ITEM', payload: itemId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove item from cart' });
      throw error;
    }
  };

  const clearCart = async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      dispatch({ type: 'CLEAR_CART' });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to clear cart' });
      throw error;
    }
  };

  const refreshCart = async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // In a real app, this would fetch from the server
      const savedCart = localStorage.getItem('automate_store_cart');
      if (savedCart) {
        const cartItems: CartItem[] = JSON.parse(savedCart);
        dispatch({ type: 'SET_ITEMS', payload: cartItems });
      } else {
        dispatch({ type: 'CLEAR_CART' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to refresh cart' });
      throw error;
    }
  };

  const value: CartContextType = {
    ...state,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}