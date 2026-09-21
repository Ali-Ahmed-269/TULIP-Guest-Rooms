'use client';

import { useState } from 'react';
import { ROOM_DISPLAY_NAMES } from '@/utils/roomTypes';

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
  'Standard':     ['Free WiFi', 'Hot Water', 'TV'],
  'Premium':      ['Free WiFi', 'Air Conditioning', 'Hot Water', 'TV'],
  'Comfort Plus': ['Free WiFi', 'Air Conditioning', 'Hot Water', 'TV', 'King Bed'],
};

const ROOM_IMAGES: Record<string, string> = {
  'Standard':     'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600',
  'Premium':      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600',
  'Comfort Plus': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600',
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
    <div>
      {/* Room Cards Grid — 3 columns desktop, responsive */}
      <div className="rooms-grid">
        {cards.map((card) => (
          <article key={card.type} className="room-card">
            {/* Room Image — edge-to-edge, rounded only at top */}
            <div className="room-card-image-wrap">
              <img
                src={card.image}
                alt={`${card.type} at Tulip Guest Rooms`}
                className="room-card-image"
                loading="lazy"
              />
            </div>

            <div className="room-card-body">
              {/* Name + Price */}
              <div className="room-card-title-row">
                <h3 className="room-card-name">
                  {ROOM_DISPLAY_NAMES[card.type] ?? card.type}
                </h3>
                <span className="room-card-price">
                  PKR {card.price.toLocaleString()}
                  <span className="room-card-price-unit">/night</span>
                </span>
              </div>

              {/* Guest capacity */}
              <div className="room-card-guests">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true" className="room-card-guest-icon">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Up to {card.maxGuests} guest{card.maxGuests !== 1 ? 's' : ''}
              </div>

              {/* Amenity checklist — gold check + muted label, no bullets */}
              <ul className="room-card-amenities">
                {card.features.map((feature) => (
                  <li key={feature} className="room-card-amenity">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                      strokeLinejoin="round" aria-hidden="true" className="room-card-check">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Room Status pills */}
              <div className="room-card-status-block">
                <p className="room-card-status-label">Room Status</p>
                <div className="flex gap-2 flex-wrap mb-4">
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
                {card.type === 'Standard' && card.rooms.includes('108') && (
                  <p className="text-[0.82rem] text-[--text-muted-token,#b7c0cb] italic mb-3">
                    (Room 108 includes AC — additional charges apply)
                  </p>
                )}
              </div>

              {/* View Details — outline pill, secondary action */}
              <div className="room-card-actions">
                <button
                  type="button"
                  className="room-card-view-btn"
                  onClick={() => handleBookRoom(card.type)}
                >
                  Book Room
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
