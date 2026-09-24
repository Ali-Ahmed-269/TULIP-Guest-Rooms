import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/Footer';
import BookingForm from '@/components/BookingForm';
import HomeRoomsSection from '@/components/HomeRoomsSection';
import HeroBookingBar from '@/components/HeroBookingBar';
import Reveal from '@/components/Reveal';
import TulipIcon from '@/components/TulipIcon';
import {
  BedDouble, Wifi, Car, MapPin, Sparkles, HeartHandshake, Wallet, Leaf, ArrowRight,
} from 'lucide-react';
import { createServiceRoleClient } from '@/utils/supabase/server';
import './home.css';

async function getPageData() {
  const supabase = createServiceRoleClient();

  const [{ data: rooms }, { data: settingsData }] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, room_number, room_type, price_per_night, max_guests, status')
      .order('room_number', { ascending: true }),
    supabase.from('site_settings').select('setting_key, setting_value'),
  ]);

  const settings: Record<string, string> = {};
  settingsData?.forEach((row: { setting_key: string; setting_value: string }) => {
    settings[row.setting_key] = row.setting_value;
  });

  return {
    rooms: rooms || [],
    settings,
  };
}

const AMENITIES = [
  { icon: BedDouble, title: 'Comfortable rooms', desc: 'Clean, well-furnished rooms for a relaxing stay.' },
  { icon: Wifi,      title: 'Free Wi-Fi',        desc: 'Fast, reliable internet in every room.' },
  { icon: Car,       title: 'Secure parking',    desc: 'Safe, gated parking right at the door.' },
  { icon: MapPin,    title: 'Great location',    desc: 'Easy access to local attractions and main roads.' },
];

const REASONS = [
  { icon: Sparkles,       title: 'Spotless rooms',     desc: 'Cleaned and refreshed before every arrival.' },
  { icon: HeartHandshake, title: 'Friendly staff',     desc: 'A warm welcome and help whenever you need it.' },
  { icon: Wallet,         title: 'Affordable rates',   desc: 'Honest prices with no surprise charges.' },
  { icon: Leaf,           title: 'Peaceful setting',   desc: 'Quiet evenings with open hillside views.' },
];

export default async function HomePage() {
  const { rooms, settings } = await getPageData();

  return (
    <main>
      {/* ── Hero ── */}
      <section className="hero" id="home">
        <div className="hero-media">
          <Image
            src="/Tulip-Guest-Rooms.png"
            alt="Tulip Guest Rooms lit up at sunset"
            fill
            priority
            sizes="100vw"
            className="hero-img"
          />
        </div>
        <div className="hero-scrim" aria-hidden="true" />

        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="hero-kicker hero-enter" style={{ '--enter-delay': '150ms' } as React.CSSProperties}>
              <TulipIcon size={18} />
              Guest rooms in Abbottabad
            </p>

            <h1 className="hero-title hero-enter" style={{ '--enter-delay': '280ms' } as React.CSSProperties}>
              Rest easy at <em>Tulip</em> Guest&nbsp;Rooms
            </h1>

            <p className="hero-lede hero-enter" style={{ '--enter-delay': '420ms' } as React.CSSProperties}>
              Clean, comfortable and affordable rooms with every essential you need for a pleasant stay.
            </p>
          </div>

          <div className="hero-enter" style={{ '--enter-delay': '600ms' } as React.CSSProperties}>
            <HeroBookingBar />
          </div>
        </div>
      </section>

      {/* ── Amenities ── */}
      <section className="amenities" aria-label="Amenities">
        <div className="container">
          <ul className="amenities-grid">
            {AMENITIES.map(({ icon: Icon, title, desc }, i) => (
              <Reveal as="li" key={title} delay={i * 80} className="amenity">
                <span className="amenity-icon">
                  <Icon size={22} strokeWidth={1.5} />
                </span>
                <div>
                  <h3 className="amenity-title">{title}</h3>
                  <p className="amenity-desc">{desc}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Rooms ── */}
      <section className="rooms" id="rooms">
        <div className="container grid gap-12">
          <Reveal className="rooms-head">
            <div className="grid gap-4">
              <h2 className="section-title">Rooms made for <em>slow mornings</em></h2>
              <p className="section-lede">
                Three kinds of rooms, all with the essentials and a cozy atmosphere. Pick the one that fits your stay.
              </p>
            </div>
            <ul className="status-legend" aria-label="Room status legend">
              <li className="status-legend-item status-legend-item--available">Available</li>
              <li className="status-legend-item status-legend-item--reserved">Pending</li>
              <li className="status-legend-item status-legend-item--booked">Booked</li>
            </ul>
          </Reveal>
          <HomeRoomsSection initialRooms={rooms} />
        </div>
      </section>

      {/* ── About ── */}
      <section className="about" id="about">
        <div className="container about-grid">
          <Reveal className="about-visual">
            <div className="about-photo about-photo--main">
              <Image
                src="/Tulip-Guest-Rooms.png"
                alt="The front of Tulip Guest Rooms with its gated entrance"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
                style={{ objectPosition: '72% 60%' }}
              />
            </div>
            <div className="about-photo about-photo--inset">
              <Image
                src="/Comfort-Plus.png"
                alt="Comfort Plus bedroom at Tulip Guest Rooms"
                fill
                sizes="(min-width: 1024px) 20vw, 40vw"
                className="object-cover"
              />
            </div>
          </Reveal>

          <div className="about-copy">
            <Reveal className="grid gap-5">
              <p className="section-kicker">About Tulip Guest Rooms</p>
              <h2 className="section-title">Simple stays, <em>great experiences</em></h2>
              <p className="section-lede">
                Tulip Guest Rooms offers clean, comfortable and well-maintained rooms at an affordable price.
                Whether you&apos;re here for business, family visits or travel, we make sure your stay is a pleasant one.
              </p>
            </Reveal>

            <ul className="reasons">
              {REASONS.map(({ icon: Icon, title, desc }, i) => (
                <Reveal as="li" key={title} delay={i * 80} className="reason">
                  <span className="reason-icon"><Icon size={20} strokeWidth={1.5} /></span>
                  <h3 className="reason-title">{title}</h3>
                  <p className="reason-desc">{desc}</p>
                </Reveal>
              ))}
            </ul>

            <Reveal>
              <Link href="#rooms" className="text-link">
                <span>View the rooms</span>
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Booking ── */}
      <section className="booking" id="booking">
        <div className="container grid gap-10">
          <Reveal className="booking-head">
            <h2 className="section-title">Reserve your <em>room</em></h2>
            <p className="section-lede">
              Choose your room and dates, share your details, and you&apos;ll get a booking reference to confirm your stay.
            </p>
          </Reveal>
          <BookingForm rooms={rooms ?? []} />
        </div>
      </section>

      <Footer settings={settings} />
    </main>
  );
}
