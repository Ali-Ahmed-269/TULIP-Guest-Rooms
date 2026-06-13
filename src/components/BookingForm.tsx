'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface RoomOption {
  id: number;
  room_number: string;
  room_type: string;
  price_per_night: number;
  max_guests: number;
  status: string;
}

interface BookingFormProps {
  rooms: RoomOption[];
}

export default function BookingForm({ rooms }: BookingFormProps) {
  const router = useRouter();

  // ── Guest info
  const [fullname, setFullname]   = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [cnic, setCnic]           = useState('');
  const [address, setAddress]     = useState('');

  // ── Stay details
  const [checkIn, setCheckIn]     = useState('');
  const [checkOut, setCheckOut]   = useState('');
  const [guests, setGuests]       = useState(1);
  const [roomType, setRoomType]   = useState('');
  const [roomId, setRoomId]       = useState('');

  // ── Payment
  const [paymentMethod, setPaymentMethod] = useState('pay_at_hotel');
  const [paymentProof, setPaymentProof]   = useState<File | null>(null);
  const [specialRequests, setSpecialRequests] = useState('');

  // ── UI state
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage]   = useState<string | null>(null);
  const [submitting, setSubmitting]       = useState(false);

  // Listen for room-type selection from room cards
  useEffect(() => {
    const handleSetRoomType = (e: Event) => {
      const selectedType = (e as CustomEvent).detail;
      setRoomType(selectedType);
      setRoomId('');
    };
    window.addEventListener('set-room-type', handleSetRoomType);
    return () => window.removeEventListener('set-room-type', handleSetRoomType);
  }, []);

  // Derive price from selected room type via real DB data
  const priceForType = (() => {
    const match = rooms.find((r) => r.room_type === roomType);
    return match?.price_per_night ?? 0;
  })();

  const roomNumbersForType = rooms
    .filter((r) => r.room_type === roomType)
    .map((r) => r.room_number);

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const n = Math.ceil(diff / 86_400_000);
    return n > 0 ? n : 0;
  };

  const nights      = calculateNights();
  const totalAmount = nights * priceForType;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    if (!fullname || !email || !phone || !cnic || !address || !checkIn || !checkOut || !roomId) {
      setErrorMessage('Please complete all required fields.');
      setSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('fullname', fullname);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('cnic', cnic);
    formData.append('address', address);
    formData.append('check_in', checkIn);
    formData.append('check_out', checkOut);
    formData.append('room_type', roomType);
    formData.append('room_id', roomId);
    formData.append('guests', String(guests));
    formData.append('payment_method', paymentMethod);
    formData.append('special_requests', specialRequests);

    if (paymentMethod !== 'pay_at_hotel') {
      if (!paymentProof) {
        setErrorMessage('Please upload a payment screenshot for online payment.');
        setSubmitting(false);
        return;
      }
      formData.append('payment_proof', paymentProof);
    }

    try {
      const response = await fetch('/api/bookings/book', { method: 'POST', body: formData });
      const result   = await response.json();

      if (!result.success) {
        setErrorMessage(result.message || 'Booking request failed.');
        setSubmitting(false);
        return;
      }

      setStatusMessage('Booking submitted successfully. Redirecting you now…');
      router.push(
        result.redirect_url ??
        `/confirmation?booking_id=${encodeURIComponent(result.booking_reference ?? result.booking_id)}`
      );
    } catch {
      setErrorMessage('Unexpected error while submitting booking. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="booking-form grid gap-8" noValidate>

      {/* ── Section 1: Guest Information ── */}
      <fieldset className="booking-fieldset">
        <legend className="booking-fieldset-legend">Guest Information</legend>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">

          <div className="form-field">
            <label htmlFor="bf-fullname">Full Name <span aria-hidden="true">*</span></label>
            <input
              id="bf-fullname"
              type="text"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              placeholder="John Doe"
              required
              autoComplete="name"
            />
          </div>

          <div className="form-field">
            <label htmlFor="bf-email">Email Address <span aria-hidden="true">*</span></label>
            <input
              id="bf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-field">
            <label htmlFor="bf-phone">Phone Number <span aria-hidden="true">*</span></label>
            <input
              id="bf-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03XX-XXXXXXX"
              required
              autoComplete="tel"
            />
          </div>

          <div className="form-field">
            <label htmlFor="bf-cnic">CNIC <span aria-hidden="true">*</span></label>
            <input
              id="bf-cnic"
              type="text"
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
              placeholder="XXXXX-XXXXXXX-X"
              required
            />
          </div>

          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="bf-address">Address <span aria-hidden="true">*</span></label>
            <textarea
              id="bf-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city, province"
              rows={2}
              required
            />
          </div>
        </div>
      </fieldset>

      {/* ── Section 2: Stay Details ── */}
      <fieldset className="booking-fieldset">
        <legend className="booking-fieldset-legend">Stay Details</legend>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">

          <div className="form-field">
            <label htmlFor="bf-checkin">Check-in Date <span aria-hidden="true">*</span></label>
            <input
              id="bf-checkin"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="bf-checkout">Check-out Date <span aria-hidden="true">*</span></label>
            <input
              id="bf-checkout"
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={checkIn || new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="bf-guests">Number of Guests <span aria-hidden="true">*</span></label>
            <input
              id="bf-guests"
              type="number"
              value={guests}
              min={1}
              max={10}
              onChange={(e) => setGuests(Number(e.target.value))}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="bf-room-type">Room Type <span aria-hidden="true">*</span></label>
            <select
              id="bf-room-type"
              value={roomType}
              onChange={(e) => { setRoomType(e.target.value); setRoomId(''); }}
              required
            >
              <option value="">Select room type</option>
              {[...new Set(rooms.map((r) => r.room_type))].map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="bf-room-number">Room Number <span aria-hidden="true">*</span></label>
            <select
              id="bf-room-number"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
              disabled={!roomType}
            >
              {!roomType ? (
                <option value="" disabled>Select a room type first</option>
              ) : (
                <>
                  <option value="">Select room number</option>
                  {roomNumbersForType.map((num) => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>

        {/* Live price summary */}
        {nights > 0 && priceForType > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-background border-2 border-dashed border-[--gold,#d4a853] text-text-dark font-bold text-center text-[1rem]">
            {nights} {nights === 1 ? 'night' : 'nights'} × PKR {priceForType}/night
            {' '}= <span className="text-primary">PKR {totalAmount}</span> total
          </div>
        )}

        <div className="form-field mt-4">
          <label htmlFor="bf-requests">Special Requests</label>
          <textarea
            id="bf-requests"
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            rows={2}
            placeholder="Extra pillows, late check-in, etc."
          />
        </div>
      </fieldset>

      {/* ── Section 3: Payment ── */}
      <fieldset className="booking-fieldset">
        <legend className="booking-fieldset-legend">Payment</legend>
        <div className="grid gap-4">

          <div className="form-field">
            <label htmlFor="bf-payment">Payment Method <span aria-hidden="true">*</span></label>
            <select
              id="bf-payment"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="pay_at_hotel">Pay at Hotel</option>
              <option value="jazzcash">JazzCash Transfer</option>
              <option value="easypaisa">Easypaisa Transfer</option>
            </select>
          </div>

          {paymentMethod !== 'pay_at_hotel' && (
            <div className="form-field">
              <label htmlFor="bf-proof">
                Payment Screenshot <span aria-hidden="true">*</span>
              </label>
              <span className="field-hint">Upload a screenshot of your transfer (PNG or JPG)</span>
              <input
                id="bf-proof"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setPaymentProof(e.target.files?.[0] ?? null)}
                required
              />
            </div>
          )}
        </div>
      </fieldset>

      {/* ── Feedback messages ── */}
      {errorMessage && (
        <div role="alert" className="error-msg p-3 rounded-lg bg-[#fff1f2] border border-[#fecdd3]">
          {errorMessage}
        </div>
      )}
      {statusMessage && (
        <div role="status" className="p-3 rounded-lg bg-[#ecfdf5] text-[#065f46] font-semibold">
          {statusMessage}
        </div>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
        {submitting ? 'Submitting reservation…' : 'Confirm Reservation'}
      </button>
    </form>
  );
}
