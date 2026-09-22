'use client';

import { useEffect, useState } from 'react';
import {
  Wifi, Snowflake, ShowerHead, Tv, BedDouble, Users, ArrowRight, Check,
} from 'lucide-react';
import { ROOM_DISPLAY_NAMES } from '@/utils/roomTypes';
import Reveal from './Reveal';

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

const ROOM_BLURBS: Record<string, string> = {
  'Standard':     'A clean, simple room with everything you need for a restful night.',
  'Premium':      'More space and air conditioning for a cooler, calmer stay.',
  'Comfort Plus': 'Our largest room, with a king bed and room for the whole family.',
};

const ROOM_IMAGES: Record<string, string> = {
  'Standard':     'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1000&q=80&auto=format&fit=crop',
  'Premium':      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1000&q=80&auto=format&fit=crop',
  'Comfort Plus': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1400&q=80&auto=format&fit=crop',
};

const FEATURE_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  'Free WiFi':        Wifi,
  'Air Conditioning': Snowflake,
  'Hot Water':        ShowerHead,
  'TV':               Tv,
  'King Bed':         BedDouble,
};

/** Returns a CSS class name, no arbitrary hex in JSX */
function getStatusClass(status: string): string {
  switch (status) {
    case 'Available':             return 'rc-room--available';
    case 'Booked':                return 'rc-room--booked';
    case 'Reserved':
    case 'Pending Verification':
    case 'Pending':               return 'rc-room--reserved';
    default:                      return 'rc-room--maintenance';
  }
}

/** Human-readable label, always shown alongside the colour */
function getStatusLabel(status: string): string {
  if (status === 'Pending Verification') return 'Pending';
  return status;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HomeRoomsSection({ initialRooms }: HomeRoomsSectionProps) {
  const [checkedRange, setCheckedRange] = useState<{ checkIn: string; checkOut: string } | null>(null);

  // Seed availability from real DB statuses
  const seedAvailability: Record<string, string> = {};
  initialRooms.forEach((room) => {
    seedAvailability[room.room_number] = room.status;
  });
  const [availability, setAvailability] = useState<Record<string, string>>(seedAvailability);

  // When the hero bar checks dates, refresh the room statuses for that range
  useEffect(() => {
    const handleHeroCheck = async (e: Event) => {
      const { checkIn, checkOut } = (e as CustomEvent).detail ?? {};
      if (!checkIn || !checkOut) return;
      try {
        const response = await fetch('/api/rooms/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ check_in: checkIn, check_out: checkOut }),
        });
        if (!response.ok) return;
        const data = await response.json();
        setAvailability(data);
        setCheckedRange({ checkIn, checkOut });
      } catch {
        // Keep the existing statuses if the refresh fails
      }
    };

    window.addEventListener('hero-availability-check', handleHeroCheck);
    return () => window.removeEventListener('hero-availability-check', handleHeroCheck);
  }, []);

  // Derive real prices & max guests per room type from DB, guaranteeing all 3 categories exist
  const roomTypeData: Record<string, { price: number; maxGuests: number; rooms: string[] }> = {
    'Standard':     { price: 2500, maxGuests: 2, rooms: [] },
    'Premium':      { price: 4000, maxGuests: 3, rooms: [] },
    'Comfort Plus': { price: 7500, maxGuests: 4, rooms: [] },
  };

  initialRooms.forEach((room) => {
    if (!roomTypeData[room.room_type]) {
      roomTypeData[room.room_type] = { price: room.price_per_night, maxGuests: room.max_guests, rooms: [room.room_number] };
    } else {
      roomTypeData[room.room_type].price = room.price_per_night;
      roomTypeData[room.room_type].maxGuests = room.max_guests;
      if (!roomTypeData[room.room_type].rooms.includes(room.room_number)) {
        roomTypeData[room.room_type].rooms.push(room.room_number);
      }
    }
  });

  // Ordered by price, low to high
  const cards = Object.entries(roomTypeData)
    .map(([type, data]) => ({
      type,
      price:     data.price,
      maxGuests: data.maxGuests,
      rooms:     data.rooms,
      features:  ROOM_FEATURES[type] ?? ['Free WiFi', 'Air Conditioning'],
      image:     ROOM_IMAGES[type]   ?? ROOM_IMAGES['Standard'],
      blurb:     ROOM_BLURBS[type]   ?? 'A comfortable room with all the essentials.',
    }))
    .sort((a, b) => a.price - b.price);

  const handleBookRoom = (roomType: string) => {
    const event = new CustomEvent('set-room-type', { detail: roomType });
    window.dispatchEvent(event);
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="grid gap-6">
      {checkedRange && (
        <p className="rc-range" role="status">
          Showing availability for {formatShortDate(checkedRange.checkIn)} to {formatShortDate(checkedRange.checkOut)}
        </p>
      )}

      <div className="rc-grid">
        {cards.map((card, index) => {
          const name = ROOM_DISPLAY_NAMES[card.type] ?? card.type;
          const availableCount = card.rooms.filter(
            (num) => (availability[num] ?? 'Available') === 'Available'
          ).length;

          return (
            <Reveal
              as="article"
              key={card.type}
              delay={index * 90}
              className="rc"
            >
              <div className="rc-media">
                <img
                  src={card.image}
                  alt={`${name} at Tulip Guest Rooms`}
                  className="rc-img"
                  loading="lazy"
                />
              </div>

              <div className="rc-body">
                <header className="rc-head">
                  <div className="grid gap-1.5">
                    <h3 className="rc-name">{name}</h3>
                    <p className="rc-meta">
                      <Users size={14} strokeWidth={1.75} aria-hidden="true" />
                      Up to {card.maxGuests} guest{card.maxGuests !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="rc-price">
                    <span className="rc-currency">PKR</span>
                    <span className="rc-amount">{card.price.toLocaleString()}</span>
                    <span className="rc-per">per night</span>
                  </p>
                </header>

                <p className="rc-blurb">{card.blurb}</p>

                <ul className="rc-amenities" aria-label={`${name} amenities`}>
                  {card.features.map((feature) => {
                    const Icon = FEATURE_ICONS[feature] ?? Check;
                    return (
                      <li key={feature} className="rc-amenity">
                        <Icon size={15} strokeWidth={1.6} />
                        {feature}
                      </li>
                    );
                  })}
                </ul>

                <div className="rc-rooms">
                  <p className="rc-rooms-label">
                    Rooms
                    {card.rooms.length > 0 && (
                      <span>{availableCount} of {card.rooms.length} available</span>
                    )}
                  </p>
                  {card.rooms.length > 0 ? (
                    <ul className="rc-room-list">
                      {card.rooms.map((num) => {
                        const status = availability[num] ?? 'Available';
                        const label = getStatusLabel(status);
                        return (
                          <li
                            key={num}
                            className={`rc-room ${getStatusClass(status)}`}
                            title={`Room ${num}: ${label}`}
                          >
                            <span className="rc-room-no">{num}</span>
                            <span className="rc-room-status">{label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="rc-rooms-empty">Live room status appears here once rooms are listed.</p>
                  )}
                  {card.type === 'Standard' && card.rooms.includes('108') && (
                    <p className="rc-note">Room 108 includes AC. Additional charges apply.</p>
                  )}
                </div>

                <button
                  type="button"
                  className="rc-cta"
                  onClick={() => handleBookRoom(card.type)}
                >
                  <span>Book this room</span>
                  <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
