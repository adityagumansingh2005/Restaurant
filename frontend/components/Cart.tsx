'use client';

import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export default function Cart({ onOpenAuth }: { onOpenAuth: () => void }) {
  const {
    items,
    totalItems,
    totalPrice,
    isCartOpen,
    closeCart,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
  } = useCart();

  const { isLoggedIn, authenticatedFetch, showNotification } = useAuth();

  /* ---- Place order handler ---- */
  const handlePlaceOrder = async () => {
    if (!isLoggedIn) {
      closeCart();
      onOpenAuth();
      return;
    }

    try {
      const orderPayload = {
        items: items.map(i => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
        totalPrice,
      };

      const res = await authenticatedFetch('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (res.ok) {
        showNotification('Order placed successfully! 🎉', 'success');
        clearCart();
        closeCart();
      } else {
        const data = await res.json().catch(() => null);
        showNotification(data?.error || 'Failed to place order', 'error');
      }
    } catch {
      showNotification('Network error – please try again', 'error');
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`cart-overlay${isCartOpen ? ' open' : ''}`}
        onClick={closeCart}
      />

      {/* Slide-in drawer */}
      <aside className={`cart-drawer${isCartOpen ? ' open' : ''}`}>
        {/* Header */}
        <div className="cart-header">
          <h2>
            <span className="cart-header-icon">🛒</span> Your Cart
            {totalItems > 0 && (
              <span className="cart-header-count">{totalItems}</span>
            )}
          </h2>
          <button className="cart-close-btn" onClick={closeCart} aria-label="Close cart">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="cart-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <span className="cart-empty-icon">🍽️</span>
              <p>Your cart is empty</p>
              <span className="cart-empty-sub">Browse our menu and add some delicious items!</span>
            </div>
          ) : (
            <ul className="cart-items-list">
              {items.map(item => (
                <li key={item.id} className="cart-item">
                  <div className="cart-item-image">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={70}
                      height={70}
                      style={{ objectFit: 'cover', borderRadius: '10px' }}
                    />
                  </div>

                  <div className="cart-item-details">
                    <h4>{item.name}</h4>
                    <span className="cart-item-price">₹{item.price}</span>
                  </div>

                  <div className="cart-item-actions">
                    <div className="cart-qty-control">
                      <button onClick={() => decrementItem(item.id)} aria-label="Decrease">−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => incrementItem(item.id)} aria-label="Increase">+</button>
                    </div>
                    <button
                      className="cart-remove-btn"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.name}`}
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span>₹{totalPrice.toFixed(2)}</span>
              </div>
              <div className="cart-summary-row cart-total">
                <span>Total</span>
                <span>₹{totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <button className="cart-order-btn" onClick={handlePlaceOrder}>
              {isLoggedIn ? 'Place Order' : 'Login to Order'}
            </button>

            <button className="cart-clear-btn" onClick={clearCart}>
              Clear Cart
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
