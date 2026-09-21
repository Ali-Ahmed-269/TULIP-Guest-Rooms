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

const ROOM_DISPLAY_NAMES: Record<string, string> = {
  Standard: 'Standard Room',
  Premium: 'Premium Room',
  'Comfort Plus': 'Comfort Plus',
};

const inputClass =
  'w-full px-4 py-2.5 rounded-xl bg-[#0e1e33] border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#d9b571]/60 transition-colors';

const labelClass = 'block text-xs font-semibold text-[#b7c0cb] mb-1.5 uppercase tracking-wider';

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
      const response = await fetch('/api/bookings/book', { method: 'POST', body: formData });
      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Failed to create walk-in booking.');
      } else {
        setMessage('Walk-in booking created successfully.');
        router.push(data.redirect_url || `/confirmation?booking_id=${encodeURIComponent(data.booking_reference || data.booking_id)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`);
      }
    } catch {
      setError('Server error when creating booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm font-medium">✕ {error}</div>}
      {message && <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-medium">✓ {message}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label>
          <span className={labelClass}>Guest Name *</span>
          <input className={inputClass} value={fullname} onChange={(e) => setFullname(e.target.value)} required placeholder="Full name" />
        </label>
        <label>
          <span className={labelClass}>Email *</span>
          <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="guest@email.com" />
        </label>
        <label>
          <span className={labelClass}>Phone *</span>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+92 300 0000000" />
        </label>
        <label>
          <span className={labelClass}>CNIC *</span>
          <input className={inputClass} value={cnic} onChange={(e) => setCnic(e.target.value)} required placeholder="XXXXX-XXXXXXX-X" />
        </label>
      </div>

      <label>
        <span className={labelClass}>Address *</span>
        <textarea
          className={`${inputClass} resize-none`}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={3}
          required
          placeholder="Guest address"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <label>
          <span className={labelClass}>Check-in *</span>
          <input type="date" className={inputClass} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
        </label>
        <label>
          <span className={labelClass}>Check-out *</span>
          <input type="date" className={inputClass} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
        </label>
        <label>
          <span className={labelClass}>Guests *</span>
          <input
            type="number"
            className={inputClass}
            min={1}
            max={10}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            required
          />
        </label>
        <label>
          <span className={labelClass}>Room *</span>
          <select className={`${inputClass} appearance-none cursor-pointer`} value={roomId} onChange={(e) => handleRoomChange(e.target.value)} required>
            <option value="">Select a room</option>
            {availableRooms.map((room) => (
              <option key={room.id} value={room.room_number}>
                {room.room_number} – {ROOM_DISPLAY_NAMES[room.room_type] || room.room_type} – PKR {Number(room.price_per_night).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl font-semibold text-sm bg-[#d9b571] text-[#0a1626] hover:bg-[#ead9ac] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating booking…' : 'Create Walk-in Booking'}
        </button>
      </div>
    </form>
  );
}
