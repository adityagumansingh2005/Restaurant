'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import AuthModal from '@/components/AuthModal';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  orderId: string;
  items: OrderItem[];
  totalPrice: number;
  status: string;
  createdAt: string;
  customerName?: string;
  customerEmail?: string;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#2196F3',
  preparing: '#ff9800',
  ready: '#8bc34a',
  completed: '#4CAF50',
  cancelled: '#f44336',
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function MyOrdersPage() {
  const { isLoggedIn, authenticatedFetch, showNotification } = useAuth();
  const router = useRouter();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const authenticatedFetchRef = useRef(authenticatedFetch);
  const showNotificationRef = useRef(showNotification);
  useEffect(() => { authenticatedFetchRef.current = authenticatedFetch; }, [authenticatedFetch]);
  useEffect(() => { showNotificationRef.current = showNotification; }, [showNotification]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/');
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await authenticatedFetchRef.current('/orders');
        const data = await res.json();
        if (data.success) {
          const sorted = [...(data.data as Order[])].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setOrders(sorted);
        } else {
          showNotificationRef.current(data.error || 'Failed to fetch orders', 'error');
        }
      } catch {
        showNotificationRef.current('Error loading orders', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isLoggedIn, router]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      const res = await authenticatedFetch(`/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: 'cancelled' } : o));
        showNotification('Order cancelled successfully', 'success');
      } else {
        showNotification(data.error || 'Failed to cancel order', 'error');
      }
    } catch {
      showNotification('Error cancelling order', 'error');
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'active') return !['completed', 'cancelled'].includes(o.status);
    if (filter === 'completed') return ['completed', 'cancelled'].includes(o.status);
    return true;
  });

  if (!isLoggedIn) return null;

  return (
    <>
      <Navbar onOpenAuth={() => setAuthModalOpen(true)} />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <main className="section" style={{ minHeight: 'calc(100vh - 200px)', paddingTop: '120px' }}>
        <h2 className="section-title">My Orders</h2>
        <p className="section-subtitle">Track and review all your past orders</p>

        <div className="container">
          {/* Filter tabs */}
          <div className="orders-filter-bar">
            {(['all', 'active', 'completed'] as const).map(f => (
              <button
                key={f}
                className={`orders-filter-btn${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All Orders' : f === 'active' ? 'Active' : 'Past Orders'}
                {f === 'all' && <span className="orders-filter-count">{orders.length}</span>}
                {f === 'active' && (
                  <span className="orders-filter-count">
                    {orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length}
                  </span>
                )}
                {f === 'completed' && (
                  <span className="orders-filter-count">
                    {orders.filter(o => ['completed', 'cancelled'].includes(o.status)).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="orders-loading">
              <div className="orders-spinner" />
              <p>Loading your orders…</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="no-reservations">
              <p>{filter === 'all' ? "You haven't placed any orders yet." : `No ${filter} orders.`}</p>
              {filter === 'all' && (
                <button className="btn" style={{ marginTop: '20px' }} onClick={() => router.push('/#menu')}>
                  Browse Menu
                </button>
              )}
            </div>
          ) : (
            <div className="orders-list">
              {filteredOrders.map(order => {
                const isExpanded = expandedId === order.orderId;
                const statusColor = STATUS_COLORS[order.status] || '#888';
                const canCancel = order.status === 'confirmed';

                return (
                  <div key={order.orderId} className="order-card">
                    {/* Card header */}
                    <div
                      className="order-card-header"
                      onClick={() => setExpandedId(isExpanded ? null : order.orderId)}
                      role="button"
                      aria-expanded={isExpanded}
                    >
                      <div className="order-card-left">
                        <div className="order-card-icon">🛒</div>
                        <div>
                          <p className="order-card-id">
                            Order <span>#{order.orderId.slice(-8).toUpperCase()}</span>
                          </p>
                          <p className="order-card-date">
                            {new Date(order.createdAt).toLocaleDateString(undefined, {
                              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                            })}{' '}
                            at{' '}
                            {new Date(order.createdAt).toLocaleTimeString(undefined, {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="order-card-right">
                        <span
                          className="order-status-pill"
                          style={{ background: `${statusColor}1a`, color: statusColor, border: `1px solid ${statusColor}55` }}
                        >
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                        <span className="order-card-total">₹{order.totalPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="order-card-chevron">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Expandable details */}
                    {isExpanded && (
                      <div className="order-card-body">
                        <div className="order-items-table">
                          <div className="order-items-table-head">
                            <span>Item</span>
                            <span>Qty</span>
                            <span>Price</span>
                          </div>
                          {order.items.map((item, i) => (
                            <div key={i} className="order-items-table-row">
                              <span>{item.name}</span>
                              <span>×{item.quantity || 1}</span>
                              <span>₹{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                          <div className="order-items-table-total">
                            <span>Total</span>
                            <span></span>
                            <span>₹{order.totalPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                        {/* Status timeline */}
                        <div className="order-timeline">
                          {['confirmed', 'preparing', 'ready', 'completed'].map((step, i, arr) => {
                            const stepIndex = arr.indexOf(order.status);
                            const done = i <= stepIndex && order.status !== 'cancelled';
                            return (
                              <div key={step} className={`order-timeline-step${done ? ' done' : ''}`}>
                                <div className="order-timeline-dot" />
                                {i < arr.length - 1 && <div className="order-timeline-line" />}
                                <span>{STATUS_LABELS[step]}</span>
                              </div>
                            );
                          })}
                        </div>

                        {canCancel && (
                          <div style={{ textAlign: 'right', marginTop: '12px' }}>
                            <button
                              className="order-cancel-btn"
                              onClick={() => handleCancelOrder(order.orderId)}
                            >
                              Cancel Order
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
