'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import AuthModal from '@/components/AuthModal';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Reservation {
  reservationId: string;
  name: string;
  dateTime: string;
  partySize: number;
  status: string;
}

export default function MyReservationsPage() {
  const { isLoggedIn, currentUser, authenticatedFetch, showNotification } = useAuth();
  const router = useRouter();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  // States for editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', date: '', time: '', partySize: '' });

  const openAuth = () => setAuthModalOpen(true);
  const closeAuth = () => setAuthModalOpen(false);

  // Use refs to avoid re-triggering useEffect when these functions change
  const authenticatedFetchRef = useRef(authenticatedFetch);
  const showNotificationRef = useRef(showNotification);
  useEffect(() => { authenticatedFetchRef.current = authenticatedFetch; }, [authenticatedFetch]);
  useEffect(() => { showNotificationRef.current = showNotification; }, [showNotification]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/');
      return;
    }

    const fetchReservations = async () => {
      try {
        const res = await authenticatedFetchRef.current('/reservations');
        const data = await res.json();
        
        if (data.success) {
          // Sort by dateTime descending (newest first)
          const sorted = data.data.sort((a: Reservation, b: Reservation) => 
            new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
          );
          setReservations(sorted);
        } else {
          showNotificationRef.current(data.error || 'Failed to fetch reservations', 'error');
        }
      } catch {
        showNotificationRef.current('Error loading reservations', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [isLoggedIn, router]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;

    try {
      const res = await authenticatedFetch(`/reservations/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        setReservations(prev => prev.filter(r => r.reservationId !== id));
        showNotification('Reservation cancelled successfully', 'success');
      } else {
        showNotification(data.error || 'Failed to cancel reservation', 'error');
      }
    } catch {
      showNotification('Error cancelling reservation', 'error');
    }
  };

  const handleEditClick = (res: Reservation) => {
    // Parsing "2024-02-28T18:30:00" into date and time
    const resDate = new Date(res.dateTime);
    const dateStr = resDate.toISOString().split('T')[0];
    const timeStr = resDate.toTimeString().split(' ')[0].slice(0, 5); // HH:MM

    setEditData({
      name: res.name,
      partySize: res.partySize.toString(),
      date: dateStr,
      time: timeStr
    });
    setEditingId(res.reservationId);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    try {
      const res = await authenticatedFetch(`/reservations/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editData.name,
          dateTime: `${editData.date}T${editData.time}:00`,
          partySize: parseInt(editData.partySize, 10),
        })
      });

      const data = await res.json();

      if (data.success) {
        setReservations(prev => prev.map(r => r.reservationId === editingId ? { ...r, ...data.data } : r));
        setEditingId(null);
        showNotification('Reservation updated successfully', 'success');
      } else {
        showNotification(data.error || 'Failed to update reservation', 'error');
      }
    } catch {
      showNotification('Error updating reservation', 'error');
    }
  };

  if (!isLoggedIn) return null; // Let the useEffect redirect

  return (
    <>
      <Navbar onOpenAuth={openAuth} />
      <AuthModal isOpen={authModalOpen} onClose={closeAuth} />
      
      <main className="section" style={{ minHeight: 'calc(100vh - 200px)', paddingTop: '120px' }}>
        <h2 className="section-title">My Reservations</h2>
        
        <div className="container">
          {loading ? (
            <p className="no-reservations">Loading your reservations...</p>
          ) : reservations.length === 0 ? (
            <div className="no-reservations">
              <p>You have no reservations yet.</p>
              <button 
                className="btn" 
                style={{ marginTop: '20px' }}
                onClick={() => router.push('/#reservation')}
              >
                Book a Table
              </button>
            </div>
          ) : (
            <div className="dashboard-grid">
              {reservations.map(res => (
                <div key={res.reservationId} className="reservation-card">
                  {editingId === res.reservationId ? (
                    <form className="reservation-form" style={{ marginTop: 0 }} onSubmit={handleSaveEdit}>
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({...editData, name: e.target.value})}
                        required
                        style={{ padding: '8px', fontSize: '14px', width: '100%' }}
                      />
                      <input
                        type="number"
                        value={editData.partySize}
                        onChange={(e) => setEditData({...editData, partySize: e.target.value})}
                        required
                        style={{ padding: '8px', fontSize: '14px', width: '100%' }}
                      />
                      <input
                        type="date"
                        value={editData.date}
                        onChange={(e) => setEditData({...editData, date: e.target.value})}
                        required
                        style={{ padding: '8px', fontSize: '14px', width: '100%' }}
                      />
                      <input
                        type="time"
                        value={editData.time}
                        onChange={(e) => setEditData({...editData, time: e.target.value})}
                        required
                        style={{ padding: '8px', fontSize: '14px', width: '100%' }}
                      />
                      <div className="reservation-actions">
                        <button type="submit" className="edit-btn" style={{ background: '#ff5e00', color: '#fff' }}>Save</button>
                        <button type="button" className="delete-btn" style={{ background: '#aaa' }} onClick={cancelEdit}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <h3>{new Date(res.dateTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</h3>
                      <p><strong>Time:</strong> {new Date(res.dateTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                      <p><strong>Name:</strong> {res.name}</p>
                      <p><strong>Party Size:</strong> {res.partySize} people</p>
                      <p><strong>Status:</strong> <span style={{ textTransform: 'capitalize', color: res.status === 'pending' ? '#ff9800' : res.status === 'confirmed' ? '#4caf50' : '#f44336' }}>{res.status}</span></p>
                      
                      <div className="reservation-actions">
                        <button className="edit-btn" onClick={() => handleEditClick(res)}>Edit</button>
                        <button className="delete-btn" onClick={() => handleDelete(res.reservationId)}>Cancel</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
