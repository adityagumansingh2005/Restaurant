'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

interface OrderData {
  orderId: string;
  items: { name: string; price: number; quantity: number }[];
  totalPrice: number;
  status: string;
  createdAt: string;
}

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

  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<OrderData | null>(null);

  /* ---- Place order handler ---- */
  const handlePlaceOrder = async () => {
    if (!isLoggedIn) {
      closeCart();
      onOpenAuth();
      return;
    }

    setIsOrdering(true);

    try {
      const orderPayload = {
        items: items.map(i => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
        totalPrice,
      };

      const res = await authenticatedFetch('/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data?.url) {
        // Redirect to Stripe Checkout page
        window.location.href = data.url;
      } else {
        showNotification(data?.error || 'Failed to initialize checkout', 'error');
        setIsOrdering(false);
      }
    } catch {
      showNotification('Network error – please try again', 'error');
      setIsOrdering(false);
    }
  };

  /* Close and reset confirmation */
  const handleClose = () => {
    closeCart();
    // reset confirmation after animation ends
    setTimeout(() => setOrderSuccess(null), 350);
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`cart-overlay${isCartOpen ? ' open' : ''}`}
        onClick={handleClose}
      />

      {/* Slide-in drawer */}
      <aside className={`cart-drawer${isCartOpen ? ' open' : ''}`}>

        {/* ─── ORDER CONFIRMATION VIEW ─── */}
        {orderSuccess ? (
          <>
            <div className="cart-header">
              <h2>Order Confirmed</h2>
              <button className="cart-close-btn" onClick={handleClose} aria-label="Close">✕</button>
            </div>

            <div className="cart-body">
              <div className="order-success">
                <div className="order-success-icon">✅</div>
                <h3>Thank you for your order!</h3>
                <p className="order-success-sub">Your order has been placed and is being prepared.</p>

                <div className="order-success-details">
                  <div className="order-detail-row">
                    <span className="order-detail-label">Order ID</span>
                    <span className="order-detail-value">#{orderSuccess.orderId.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="order-detail-row">
                    <span className="order-detail-label">Status</span>
                    <span className="order-status-badge">{orderSuccess.status}</span>
                  </div>
                  <div className="order-detail-row">
                    <span className="order-detail-label">Placed at</span>
                    <span className="order-detail-value">
                      {new Date(orderSuccess.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="order-items-summary">
                  <h4>Items Ordered</h4>
                  <ul>
                    {orderSuccess.items.map((item, idx) => (
                      <li key={idx}>
                        <span>{item.name} × {item.quantity}</span>
                        <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="order-items-total">
                    <span>Total Paid</span>
                    <span>₹{orderSuccess.totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <button className="cart-order-btn" onClick={handleClose} style={{ marginTop: 20 }}>
                  Done
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ─── NORMAL CART VIEW ─── */}
            {/* Header */}
            <div className="cart-header">
              <h2>
                <span className="cart-header-icon">🛒</span> Your Cart
                {totalItems > 0 && (
                  <span className="cart-header-count">{totalItems}</span>
                )}
              </h2>
              <button className="cart-close-btn" onClick={handleClose} aria-label="Close cart">✕</button>
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
                    <span>Subtotal ({totalItems} item{totalItems > 1 ? 's' : ''})</span>
                    <span>₹{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="cart-summary-row cart-total">
                    <span>Total</span>
                    <span>₹{totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  className={`cart-order-btn${isOrdering ? ' loading' : ''}`}
                  onClick={handlePlaceOrder}
                  disabled={isOrdering}
                >
                  {isOrdering ? (
                    <span className="cart-order-spinner">Placing Order…</span>
                  ) : isLoggedIn ? (
                    '🍴 Place Order'
                  ) : (
                    '🔒 Login to Order'
                  )}
                </button>

                <button className="cart-clear-btn" onClick={clearCart} disabled={isOrdering}>
                  Clear Cart
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}
