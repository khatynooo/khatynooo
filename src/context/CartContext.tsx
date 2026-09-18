import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { getStorefrontUnitPrice } from '../lib/utils';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedPrice: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('khatinoo_cart');
      if (!saved) return [];
      const parsed: CartItem[] = JSON.parse(saved);
      // تصحیح و همگام‌سازی قیمت واحد خرده‌فروشی اقلام ذخیره‌شده بر مبنای subUnit و conversionFactor
      return parsed.map((item) => {
        const rawPrice = item.product.priceShop2 || item.product.salePrice;
        const correctPrice = getStorefrontUnitPrice(rawPrice, item.product.conversionFactor);
        return {
          ...item,
          selectedPrice: correctPrice || item.selectedPrice,
        };
      });
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('khatinoo_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(product.stock, item.quantity + quantity) }
            : item
        );
      }
      // Use priceShop2 (Online price) or salePrice, converted to storefront unit (subUnit)
      const rawPrice = product.priceShop2 || product.salePrice;
      const price = getStorefrontUnitPrice(rawPrice, product.conversionFactor);
      return [...prev, { product, quantity, selectedPrice: price }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const validQty = Math.min(item.product.stock, quantity);
          return { ...item, quantity: validQty };
        }
        return item;
      })
    );
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.selectedPrice * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
