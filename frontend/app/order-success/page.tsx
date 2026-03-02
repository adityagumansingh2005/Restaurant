'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, authLoading, authenticatedFetch } = useAuth();
  const { clearCart } = useCart();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [orderIdDisplay, setOrderIdDisplay] = useState('');

  const authenticatedFetchRef = useRef(authenticatedFetch);
  const clearCartRef = useRef(clearCart);
  
  useEffect(() => { authenticatedFetchRef.current = authenticatedFetch; }, [authenticatedFetch]);
  useEffect(() => { clearCartRef.current = clearCart; }, [clearCart]);

  useEffect(() => {
    // Wait for auth to finish loading before checking login state
    if (authLoading) return;

    if (!isLoggedIn) {
      router.push('/');
      return;
    }

    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order_id');

    if (!sessionId || !orderId) {
      setStatus('error');
      return;
    }

    setOrderIdDisplay(orderId);

    // Confirm the payment with our backend
    const confirmPayment = async () => {
      try {
        const res = await authenticatedFetchRef.current('/checkout/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, sessionId })
        });
        
        const data = await res.json();
        if (data.success) {
          setStatus('success');
          // Clear cart now that order is confirmed
          clearCartRef.current();
          // Also clear localStorage directly as a safety fallback
          try { localStorage.removeItem('cart'); } catch {}
        } else {
          setStatus('error');
        }
      } catch (err) {
        console.error('Failed to confirm payment:', err);
        setStatus('error');
      }
    };

    confirmPayment();
  }, [isLoggedIn, authLoading, router, searchParams]);

  if (authLoading) {
    return (
      <div className="order-success-page">
        <div className="order-success-card">
          <div className="orders-spinner mx-auto" style={{ width: 48, height: 48, borderWidth: 4 }} />
          <h2 style={{ marginTop: 24 }}>Loading...</h2>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <div className="order-success-page">
      <div className="order-success-card">
        {status === 'verifying' && (
          <>
            <div className="orders-spinner mx-auto" style={{ width: 48, height: 48, borderWidth: 4 }} />
            <h2 style={{ marginTop: 24 }}>Verifying Payment...</h2>
            <p>Please wait while we confirm your order.</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="success-icon">✅</div>
            <h2>Order Placed Successfully!</h2>
            <p>Your payment was successful and your order has been confirmed.</p>
            <div className="order-number-box">
              <span>Order #</span>
              <strong>{orderIdDisplay.slice(-8).toUpperCase()}</strong>
            </div>
            <div className="success-actions">
              <button className="btn" onClick={() => router.push('/my-orders')}>
                View My Orders
              </button>
              <button className="btn-secondary" onClick={() => router.push('/')}>
                Back to Home
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="error-icon">❌</div>
            <h2>Something went wrong</h2>
            <p>We couldn't verify your payment. Please contact support if you were charged.</p>
            <button className="btn" onClick={() => router.push('/#menu')} style={{ marginTop: 20 }}>
              Return to Menu
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        .order-success-page {
          min-height: calc(100vh - 200px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 120px 20px 60px;
          background-color: #f9f9f9;
        }
        .order-success-card {
          background: white;
          padding: 50px 40px;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          max-width: 500px;
          width: 100%;
          text-align: center;
        }
        .success-icon {
          font-size: 64px;
          margin-bottom: 20px;
          animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .error-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        @keyframes pop {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .order-success-card h2 {
          color: #222;
          margin-bottom: 12px;
          font-size: 24px;
        }
        .order-success-card p {
          color: #666;
          margin-bottom: 24px;
          line-height: 1.5;
        }
        .order-number-box {
          background: #fdf2f3;
          border: 1px dashed #fad1d4;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 32px;
          display: flex;
          justify-content: center;
          gap: 8px;
          color: #e63946;
          font-size: 18px;
        }
        .success-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .btn-secondary {
          background: white;
          color: #333;
          padding: 10px 18px;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          background: #f5f5f5;
          border-color: #ccc;
        }
        .mx-auto {
          margin-left: auto;
          margin-right: auto;
        }
      `}</style>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <>
      <Navbar onOpenAuth={() => {}} />
      <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
        <OrderSuccessContent />
      </Suspense>
      <Footer />
    </>
  );
}
