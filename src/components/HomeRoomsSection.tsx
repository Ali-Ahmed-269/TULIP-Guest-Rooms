'use client';

import { useState } from 'react';

interface Room {
  id: number;
  room_number: string;
  room_type: string;
  status: string;
  price_per_night: number;
  max_guests: number;
}

interface HomeRoomsSectionProps {
  initialRooms: Room[];
}

const ROOM_FEATURES: Record<string, string[]> = {
  'Standard Room': ['Free WiFi', 'Air Conditioning', 'Hot Water', 'TV'],
  'Deluxe Room':   ['Free WiFi', 'Air Conditioning', 'Hot Water', 'TV', 'Mini Fridge', 'City View'],
  'Suite':         ['Free WiFi', 'Air Conditioning', 'Hot Water', 'TV', 'Mini Fridge', 'King Bed', 'Living Area'],
};

const ROOM_IMAGES: Record<string, string> = {
  'Standard Room': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600',
  'Deluxe Room':   'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600',
  'Suite':         'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600',
};

/** Returns a CSS class name — no arbitrary hex in JSX */
function getStatusClass(status: string): string {
  switch (status) {
    case 'Available':             return 'room-status--available';
    case 'Booked':                return 'room-status--booked';
    case 'Reserved':
    case 'Pending Verification':
    case 'Pending':               return 'room-status--reserved';
    case 'Maintenance':           return 'room-status--maintenance';
    default:                      return 'room-status--maintenance';
  }
}

/** Human-readable label — always shown alongside the dot */
function getStatusLabel(status: string): string {
  if (status === 'Pending Verification') return 'Pending';
  return status;
}

export default function HomeRoomsSection({ initialRooms }: HomeRoomsSectionProps) {
  const [checkIn, setCheckIn]       = useState('');
  const [checkOut, setCheckOut]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [checkerMessage, setCheckerMessage] = useState<string | null>(null);

  // Seed availability from real DB statuses
  const seedAvailability: Record<string, string> = {};
  initialRooms.forEach((room) => {
    seedAvailability[room.room_number] = room.status;
  });
  const [availability, setAvailability] = useState<Record<string, string>>(seedAvailability);

  // Derive real prices & max guests per room type from DB
  const roomTypeData: Record<string, { price: number; maxGuests: number; rooms: string[] }> = {};
  initialRooms.forEach((room) => {
    if (!roomTypeData[room.room_type]) {
      roomTypeData[room.room_type] = { price: room.price_per_night, maxGuests: room.max_guests, rooms: [] };
    }
    roomTypeData[room.room_type].rooms.push(room.room_number);
  });

  // Build cards from real data, falling back to static features/images
  const cards = Object.entries(roomTypeData).map(([type, data]) => ({
    type,
    price:     data.price,
    maxGuests: data.maxGuests,
    rooms:     data.rooms,
    features:  ROOM_FEATURES[type] ?? ['Free WiFi', 'Air Conditioning'],
    image:     ROOM_IMAGES[type]   ?? 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600',
  }));

  const handleCheckAvailability = async () => {
    setCheckerMessage(null);
    if (!checkIn || !checkOut) {
      setCheckerMessage('Please select both check-in and check-out dates.');
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setCheckerMessage('Check-out date must be after check-in date.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/rooms/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check_in: checkIn, check_out: checkOut }),
      });
      if (!response.ok) throw new Error('Failed to retrieve availability.');
      const data = await response.json();
      setAvailability(data);
      setCheckerMessage('Room availability updated for your selected dates.');
    } catch {
      setCheckerMessage('Failed to check availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookRoom = (roomType: string) => {
    const event = new CustomEvent('set-room-type', { detail: roomType });
    window.dispatchEvent(event);
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="grid gap-6">
      {/* Date Availability Checker */}
      <div className="card">
        <h3 className="mb-4 text-[1.2rem]">Check live availability for your dates</h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 items-end">
          <div className="form-field">
            <label htmlFor="avail-checkin">Check-in Date</label>
            <input
              id="avail-checkin"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="form-field">
            <label htmlFor="avail-checkout">Check-out Date</label>
            <input
              id="avail-checkout"
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={checkIn || new Date().toISOString().split('T')[0]}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary h-12"
            onClick={handleCheckAvailability}
            disabled={loading}
          >
            {loading ? 'Checking…' : 'Check Availability'}
          </button>
        </div>
        {checkerMessage && (
          <p className="mt-4 text-[0.95rem] font-semibold text-primary">{checkerMessage}</p>
        )}
      </div>

      {/* Room Cards Grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
        {cards.map((card) => (
          <article
            key={card.type}
            className="card !p-0 overflow-hidden flex flex-col"
          >
            {/* Room Image */}
            <img
              src={card.image}
              alt={`${card.type} at Tulip Guest Rooms`}
              className="w-full h-[220px] object-cover"
              loading="lazy"
            />

            <div className="p-6 flex flex-col flex-1">
              {/* Title + Price */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-heading text-[1.35rem] leading-tight">{card.type}</h3>
                <span className="font-bold text-primary text-[1.05rem] whitespace-nowrap">
                  PKR {card.price}<span className="text-muted text-[0.8rem] font-normal">/night</span>
                </span>
              </div>
              <p className="text-muted text-[0.88rem] mb-4">Up to {card.maxGuests} guest{card.maxGuests !== 1 ? 's' : ''}</p>

              {/* Features */}
              <ul className="grid gap-1.5 mb-5 list-none">
                {card.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-[0.9rem]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                      strokeLinejoin="round" className="text-sage shrink-0" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Room Status — dot + text label for every room number */}
              <div className="mt-auto">
                <p className="text-[0.82rem] text-muted font-semibold uppercase tracking-wide mb-2">
                  Room Status
                </p>
                <div className="flex gap-2 flex-wrap mb-5">
                  {card.rooms.map((num) => {
                    const status = availability[num] ?? 'Available';
                    const statusClass = getStatusClass(status);
                    const label = getStatusLabel(status);
                    return (
                      <span
                        key={num}
                        className={`room-status-pill ${statusClass}`}
                        title={`Room ${num}: ${label}`}
                      >
                        <span className="room-status-dot" aria-hidden="true" />
                        <span className="font-semibold">{num}</span>
                        <span className="room-status-text">{label}</span>
                      </span>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={() => handleBookRoom(card.type)}
                >
                  Book This Room
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
