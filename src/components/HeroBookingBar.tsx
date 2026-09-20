'use client';

import { useRef, useState } from 'react';
import { Calendar, User, ArrowRight } from 'lucide-react';

function formatDateForDisplay(dateStr: string, fallback: string) {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HeroBookingBar() {
  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [checkIn, setCheckIn]   = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests]     = useState(1);
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState<string | null>(null);

  const checkInRef  = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);

  function openPicker(ref: React.RefObject<HTMLInputElement>) {
    try {
      ref.current?.showPicker();
    } catch {
      ref.current?.click();
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut) {
      setMessage('Please select both check-in and check-out dates.');
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setMessage('Check-out date must be after check-in date.');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/rooms/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check_in: checkIn, check_out: checkOut, guests }),
      });

      if (response.ok) {
        const event = new CustomEvent('hero-availability-check', {
          detail: { checkIn, checkOut, guests },
        });
        window.dispatchEvent(event);

        const target = document.getElementById('booking') || document.getElementById('rooms');
        target?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setMessage('Failed to check room availability.');
      }
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hero-booking-bar-wrapper">
      <form onSubmit={handleSubmit} className="hero-booking-bar">

        {/* Check In */}
        <div
          className="hero-bar-group"
          style={{ cursor: 'pointer' }}
          onClick={() => openPicker(checkInRef)}
        >
          <Calendar size={18} className="hero-bar-icon" />
          <div className="hero-bar-fields">
            <span className="hero-bar-label">Check In</span>
            <div className="hero-bar-display">
              {formatDateForDisplay(checkIn, 'Select date')}
            </div>
          </div>
          {/* Visually hidden but accessible real input */}
          <input
            ref={checkInRef}
            id="hero-checkin"
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            aria-label="Check-in date"
            tabIndex={-1}
          />
        </div>

        <div className="hero-bar-divider" />

        {/* Check Out */}
        <div
          className="hero-bar-group"
          style={{ cursor: 'pointer' }}
          onClick={() => openPicker(checkOutRef)}
        >
          <Calendar size={18} className="hero-bar-icon" />
          <div className="hero-bar-fields">
            <span className="hero-bar-label">Check Out</span>
            <div className="hero-bar-display">
              {formatDateForDisplay(checkOut, 'Select date')}
            </div>
          </div>
          <input
            ref={checkOutRef}
            id="hero-checkout"
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            min={checkIn || today}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            aria-label="Check-out date"
            tabIndex={-1}
          />
        </div>

        <div className="hero-bar-divider" />

        {/* Guests */}
        <div className="hero-bar-group">
          <User size={18} className="hero-bar-icon" />
          <div className="hero-bar-fields">
            <label htmlFor="hero-guests" className="hero-bar-label">Guests</label>
            <select
              id="hero-guests"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="hero-bar-input hero-bar-select"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Check Availability Button */}
        <button type="submit" className="hero-bar-btn" disabled={loading}>
          <span>{loading ? 'Checking...' : 'Check Availability'}</span>
          <ArrowRight size={16} />
        </button>

      </form>
      {message && <p className="hero-bar-msg">{message}</p>}
    </div>
  );
}
