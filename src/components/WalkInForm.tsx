'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RoomOption {
  id: number;
  room_number: string;
  room_type: string;
  price_per_night: number;
  status: string;
}

interface WalkInFormProps {
  rooms: RoomOption[];
}

export default function WalkInForm({ rooms }: WalkInFormProps) {
  const router = useRouter();
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [roomType, setRoomType] = useState('');
  const [roomId, setRoomId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const availableRooms = rooms.filter((room) => room.status === 'Available');

  const handleRoomChange = (value: string) => {
    const room = rooms.find((item) => item.room_number === value);
    if (room) {
      setRoomType(room.room_type);
      setRoomId(room.room_number);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!fullname || !email || !phone || !cnic || !address || !checkIn || !checkOut || !roomId) {
      setError('Complete all required fields before creating walk-in booking.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('fullname', fullname);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('cnic', cnic);
    formData.append('address', address);
    formData.append('check_in', checkIn);
    formData.append('check_out', checkOut);
    formData.append('room_type', roomType || 'Standard');
    formData.append('room_id', roomId);
    formData.append('guests', String(guests));
    formData.append('payment_method', 'pay_at_hotel');
    formData.append('special_requests', 'Walk-in booking created by admin.');

    try {
      const response = await fetch('/api/bookings/book', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Failed to create walk-in booking.');
      } else {
        setMessage('Walk-in booking created successfully.');
        router.push(data.redirect_url || `/confirmation?booking_id=${encodeURIComponent(data.booking_reference || data.booking_id)}`);
      }
    } catch (err) {
      setError('Server error when creating booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <label className="form-group">
          <span>Guest Name</span>
          <input className="form-control" value={fullname} onChange={(event) => setFullname(event.target.value)} required />
        </label>
        <label className="form-group">
          <span>Email</span>
          <input type="email" className="form-control" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="form-group">
          <span>Phone</span>
          <input className="form-control" value={phone} onChange={(event) => setPhone(event.target.value)} required />
        </label>
        <label className="form-group">
          <span>CNIC</span>
          <input className="form-control" value={cnic} onChange={(event) => setCnic(event.target.value)} required />
        </label>
      </div>
      <label className="form-group">
        <span>Address</span>
        <textarea className="form-control" value={address} onChange={(event) => setAddress(event.target.value)} rows={3} required />
      </label>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <label className="form-group">
          <span>Check-in</span>
          <input type="date" className="form-control" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} required />
        </label>
        <label className="form-group">
          <span>Check-out</span>
          <input type="date" className="form-control" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} required />
        </label>
        <label className="form-group">
          <span>Guests</span>
          <input type="number" className="form-control" min={1} max={10} value={guests} onChange={(event) => setGuests(Number(event.target.value))} required />
        </label>
        <label className="form-group">
          <span>Room</span>
          <select className="form-control" value={roomId} onChange={(event) => handleRoomChange(event.target.value)} required>
            <option value="">Select a room</option>
            {availableRooms.map((room) => (
              <option key={room.id} value={room.room_number}>
                {room.room_number} – {room.room_type} – PKR {room.price_per_night}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <div className="error-msg">{error}</div> : null}
      {message ? <div className="text-sage font-semibold">{message}</div> : null}
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Creating booking...' : 'Create Walk-in Booking'}
      </button>
    </form>
  );
}
