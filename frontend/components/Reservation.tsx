'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function Reservation({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { isLoggedIn, accessToken, authenticatedFetch, showNotification } = useAuth();
  const [name, setName] = useState('');
  const [people, setPeople] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name || !people || !date || !time) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    if (!isLoggedIn || !accessToken) {
      showNotification('Please login to make a reservation', 'error');
      onOpenAuth();
      return;
    }

    try {
      const response = await authenticatedFetch('/reservations', {
        method: 'POST',
        body: JSON.stringify({
          name,
          dateTime: `${date}T${time}:00`,
          partySize: parseInt(people),
          phone: '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create reservation');
      }

      setMessage(
        `Reservation confirmed for ${people} people on ${date} at ${time}. We look forward to seeing you!`
      );
      setName('');
      setPeople('');
      setDate('');
      setTime('');
      showNotification('Table reserved successfully!', 'success');
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'Reservation failed',
        'error'
      );
    }
  };

  return (
    <section id="reservation" className="reservation section">
      <h2 className="section-title">Reserve a Table</h2>

      <form className="reservation-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Number of People"
          value={people}
          onChange={(e) => setPeople(e.target.value)}
          required
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />
        <button className="btn" type="submit">Reserve</button>
      </form>

      {message && <p className="reservation-msg">{message}</p>}
    </section>
  );
}
