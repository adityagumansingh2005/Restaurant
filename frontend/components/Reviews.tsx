'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://kmxjx8sunf.execute-api.us-east-1.amazonaws.com';

interface Review {
  reviewId: string;
  name: string;
  rating: number;
  text: string;
  createdAt: string;
}

/* ---- Star rating component ---- */
function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 22,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  const [hover, setHover] = useState(0);

  return (
    <span className="star-rating" role="img" aria-label={`${value} stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= (hover || value) ? 'star-filled' : 'star-empty'}`}
          style={{ fontSize: size, cursor: readOnly ? 'default' : 'pointer' }}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
        >
          ★
        </span>
      ))}
    </span>
  );
}

/* ---- Time‑ago helper ---- */
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function Reviews() {
  /* ---------- State ---------- */
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // form fields
  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* ---------- Fetch reviews ---------- */
  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/reviews`);
      const data = await res.json();
      if (data.success) {
        const sorted = (data.data as Review[]).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setReviews(sorted);
      }
    } catch {
      // silently fail – show hardcoded fallback reviews
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  /* ---------- Submit review ---------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);

    if (!name.trim()) {
      setFormMsg({ type: 'error', text: 'Please enter your name.' });
      return;
    }
    if (rating < 1) {
      setFormMsg({ type: 'error', text: 'Please select a star rating.' });
      return;
    }
    if (!text.trim()) {
      setFormMsg({ type: 'error', text: 'Please write your review.' });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), rating, text: text.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFormMsg({ type: 'success', text: 'Thank you! Your review has been submitted.' });
        setName('');
        setRating(0);
        setText('');
        // Prepend new review to the list instantly
        setReviews((prev) => [data.data, ...prev]);
        // Close form after short delay
        setTimeout(() => {
          setShowForm(false);
          setFormMsg(null);
        }, 2500);
      } else {
        setFormMsg({ type: 'error', text: data.error || 'Failed to submit review.' });
      }
    } catch {
      setFormMsg({ type: 'error', text: 'Network error – please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Hardcoded fallback when DB is empty ---------- */
  const fallbackReviews: Review[] = [
    {
      reviewId: 'fallback-1',
      name: 'Aditya Gumansingh',
      rating: 5,
      text: 'Amazing taste and great service. Highly recommend!',
      createdAt: '2025-12-01T10:00:00Z',
    },
    {
      reviewId: 'fallback-2',
      name: 'Abhishek Jena',
      rating: 5,
      text: 'The food is delicious and the ambiance is perfect.',
      createdAt: '2025-11-20T14:30:00Z',
    },
    {
      reviewId: 'fallback-3',
      name: 'Om Soumya',
      rating: 4,
      text: "One of the best restaurants I've visited. Loved it!",
      createdAt: '2025-11-10T08:15:00Z',
    },
  ];

  const displayedReviews = reviews.length > 0 ? reviews : fallbackReviews;

  /* ---------- Average rating ---------- */
  const avgRating =
    displayedReviews.length > 0
      ? displayedReviews.reduce((sum, r) => sum + r.rating, 0) / displayedReviews.length
      : 0;

  /* ---------- Render ---------- */
  return (
    <section id="reviews" className="reviews section">
      <h2 className="section-title">Customer Reviews</h2>

      {/* Summary bar */}
      <div className="reviews-summary">
        <div className="reviews-avg">
          <span className="reviews-avg-number">{avgRating.toFixed(1)}</span>
          <StarRating value={Math.round(avgRating)} readOnly size={20} />
          <span className="reviews-count">({displayedReviews.length} reviews)</span>
        </div>
        <button
          className="btn reviews-write-btn"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? '✕  Close' : '✍  Write a Review'}
        </button>
      </div>

      {/* Review form */}
      {showForm && (
        <form className="review-form" onSubmit={handleSubmit}>
          <div className="review-form-row">
            <label>Your Name</label>
            <input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="review-form-row">
            <label>Rating</label>
            <StarRating value={rating} onChange={setRating} size={28} />
          </div>

          <div className="review-form-row">
            <label>Your Review</label>
            <textarea
              placeholder="Tell us about your experience…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              rows={4}
            />
          </div>

          {formMsg && (
            <p className={`review-form-msg review-form-msg-${formMsg.type}`}>
              {formMsg.text}
            </p>
          )}

          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </form>
      )}

      {/* Reviews grid */}
      {loading ? (
        <div className="reviews-loading">Loading reviews…</div>
      ) : (
        <div className="review-container">
          {displayedReviews.map((review) => (
            <div key={review.reviewId} className="review-card">
              <div className="review-card-header">
                <div className="review-avatar">
                  {review.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="review-author">{review.name}</h3>
                  <span className="review-date">{timeAgo(review.createdAt)}</span>
                </div>
              </div>
              <StarRating value={review.rating} readOnly size={16} />
              <p className="review-text">{review.text}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
