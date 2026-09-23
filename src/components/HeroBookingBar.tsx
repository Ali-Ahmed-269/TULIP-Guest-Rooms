'use client';

import { useRef, useState } from 'react';
import { ArrowRight, Minus, Plus, CalendarCheck, CalendarX, Users } from 'lucide-react';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Select date';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function nightsBetween(a: string, b: string) {
  const diff = (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  return Number.isFinite(diff) && diff > 0 ? Math.round(diff) : 0;
}

const MAX_GUESTS = 10;

export default function HeroBookingBar() {
  // Lazy initialisers keep the clock read out of the render path
  const [today]                 = useState(() => new Date().toISOString().split('T')[0]);
  const [checkIn, setCheckIn]   = useState(today);
  const [checkOut, setCheckOut] = useState(
    () => new Date(new Date(today).getTime() + 86400000).toISOString().split('T')[0]
  );
  const [guests, setGuests]     = useState(1);
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState<string | null>(null);

  const checkInRef  = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);

  const nights = nightsBetween(checkIn, checkOut);

  function openPicker(ref: React.RefObject<HTMLInputElement | null>) {
    try {
      ref.current?.showPicker();
    } catch {
      ref.current?.focus();
      ref.current?.click();
    }
  }

  const handleCheckInChange = (value: string) => {
    setCheckIn(value);
    // Keep check-out valid: push it one day past the new check-in if needed
    if (value && checkOut && new Date(checkOut) <= new Date(value)) {
      const next = new Date(new Date(value).getTime() + 86400000).toISOString().split('T')[0];
      setCheckOut(next);
    }
  };

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
    <div className="hb-wrap">
      <form onSubmit={handleSubmit} className="hb" aria-label="Check room availability">

        {/* Check in */}
        <div className="hb-field hb-field--date" onClick={() => openPicker(checkInRef)}>
          <span className="hb-icon" aria-hidden="true"><CalendarCheck size={17} strokeWidth={1.6} /></span>
          <div className="hb-text">
            <label htmlFor="hero-checkin" className="hb-label">Check in</label>
            <span className="hb-value">{formatDate(checkIn)}</span>
          </div>
          <input
            ref={checkInRef}
            id="hero-checkin"
            type="date"
            value={checkIn}
            min={today}
            onChange={(e) => handleCheckInChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="hb-native"
          />
        </div>

        <span className="hb-divider" aria-hidden="true" />

        {/* Check out */}
        <div className="hb-field hb-field--date" onClick={() => openPicker(checkOutRef)}>
          <span className="hb-icon" aria-hidden="true"><CalendarX size={17} strokeWidth={1.6} /></span>
          <div className="hb-text">
            <label htmlFor="hero-checkout" className="hb-label">Check out</label>
            <span className="hb-value">
              {formatDate(checkOut)}
              {nights > 0 && (
                <span className="hb-nights" aria-live="polite">
                  {nights} {nights === 1 ? 'night' : 'nights'}
                </span>
              )}
            </span>
          </div>
          <input
            ref={checkOutRef}
            id="hero-checkout"
            type="date"
            value={checkOut}
            min={checkIn || today}
            onChange={(e) => setCheckOut(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="hb-native"
          />
        </div>

        <span className="hb-divider" aria-hidden="true" />

        {/* Guests */}
        <div className="hb-field hb-field--guests">
          <span className="hb-icon" aria-hidden="true"><Users size={17} strokeWidth={1.6} /></span>
          <div className="hb-text">
            <span className="hb-label" id="hero-guests-label">Guests</span>
            <div className="hb-stepper" role="group" aria-labelledby="hero-guests-label">
              <button
                type="button"
                className="hb-step"
                onClick={() => setGuests((g) => Math.max(1, g - 1))}
                disabled={guests <= 1}
                aria-label="Remove a guest"
              >
                <Minus size={13} strokeWidth={2.25} />
              </button>
              <output className="hb-value hb-count" aria-live="polite">
                {guests} {guests === 1 ? 'guest' : 'guests'}
              </output>
              <button
                type="button"
                className="hb-step"
                onClick={() => setGuests((g) => Math.min(MAX_GUESTS, g + 1))}
                disabled={guests >= MAX_GUESTS}
                aria-label="Add a guest"
              >
                <Plus size={13} strokeWidth={2.25} />
              </button>
            </div>
          </div>
        </div>

        <button type="submit" className="hb-submit" disabled={loading}>
          {loading ? 'Checking...' : 'Check availability'}
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </form>

      {message && <p className="hb-msg" role="alert">{message}</p>}
    </div>
  );
}
