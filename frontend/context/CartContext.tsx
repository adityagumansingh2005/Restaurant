'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface CartItem {
  id: string;          // unique key for the menu entry
  name: string;
  price: number;       // numeric price (₹)
  image: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  incrementItem: (id: string) => void;
  decrementItem: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  /* Persist to localStorage */
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cart');
      if (stored) setItems(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  /* Derived values */
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  /* Actions */
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen(p => !p), []);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setIsCartOpen(true);               // open drawer on add
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const incrementItem = useCallback((id: string) => {
    setItems(prev =>
      prev.map(i => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i)),
    );
  }, []);

  const decrementItem = useCallback((id: string) => {
    setItems(prev =>
      prev
        .map(i => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter(i => i.quantity > 0),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalPrice,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        removeItem,
        incrementItem,
        decrementItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
