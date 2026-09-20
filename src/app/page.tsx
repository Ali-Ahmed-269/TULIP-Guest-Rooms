import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/Footer';
import BookingForm from '@/components/BookingForm';
import HomeRoomsSection from '@/components/HomeRoomsSection';
import HeroBookingBar from '@/components/HeroBookingBar';
import { createServiceRoleClient } from '@/utils/supabase/server';

async function getPageData() {
  const supabase = createServiceRoleClient();

  const [{ data: rooms }, { data: settingsData }] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, room_number, room_type, price_per_night, max_guests, status')
      .eq('status', 'Available')
      .order('room_number', { ascending: true }),
    supabase.from('site_settings').select('setting_key, setting_value'),
  ]);

  const settings: Record<string, string> = {};
  settingsData?.forEach((row: any) => {
    settings[row.setting_key] = row.setting_value;
  });

  return {
    rooms: rooms || [],
    settings,
  };
}

export default async function HomePage() {
  const { rooms, settings } = await getPageData();

  return (
    <main>
      {/* ── Hero Section ── */}
      <section className="hero-section" id="home">
        {/* Next.js optimized background image */}
        <Image
          src="/guest-house1.png"
          alt="Tulip Guest Rooms exterior at night"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center z-0"
        />

        {/* Gradient overlay: Left-to-right for high text contrast */}
        <div className="hero-overlay" />

        <div className="container hero-content">
          <div className="hero-text">
            <div className="hero-eyebrow">
              <span>YOUR COMFORT, OUR PRIORITY</span>
              <span className="hero-eyebrow-line" />
            </div>

            <h1 className="hero-headline">
              A Cozy Stay at <span className="text-gold">Tulip</span> Guest Rooms
            </h1>

            <p className="hero-sub">
              Clean, comfortable and affordable rooms with all the basic amenities you need for a pleasant stay.
            </p>

            <HeroBookingBar />
          </div>
        </div>
      </section>

      {/* ── Feature Strip Band (Full width, --navy-900 bg, 4 columns with dividers) ── */}
      <section className="feature-strip">
        <div className="container">
          <div className="feature-strip-grid">
            {[
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>
                ),
                title: 'Comfortable Rooms',
                desc: 'Clean and well-furnished rooms for a relaxing stay.',
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                ),
                title: 'Free Wi-Fi',
                desc: 'Stay connected, always.',
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                ),
                title: 'Secure Parking',
                desc: 'Safe and convenient parking for your vehicle.',
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                ),
                title: 'Great Location',
                desc: 'Easy access to local attractions and main areas.',
              },
            ].map((f) => (
              <div key={f.title} className="feature-strip-item">
                <div className="feature-icon-badge">{f.icon}</div>
                <div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rooms Section ── */}
      <section className="section-padding rooms-section-bg" id="rooms">
        <div className="container grid gap-10">
          <div className="rooms-section-header">
            <div className="rooms-eyebrow">
              <span className="rooms-eyebrow-line" />
              ROOMS &amp; RATES
            </div>
            <h2 className="rooms-heading">Our Rooms</h2>
            <p className="rooms-subtext">
              Choose from a variety of well-furnished rooms, designed for your comfort
              and relaxation. All rooms come with essential amenities and a cozy atmosphere.
            </p>
          </div>
          <HomeRoomsSection initialRooms={rooms} />
        </div>
      </section>

      {/* ── Booking Section ── */}
      <section className="section-padding bg-surface" id="booking">
        <div className="container grid gap-6">
          <div className="grid gap-3 max-w-[680px]">
            <span className="badge badge-red">Reservation</span>
            <h2>Reserve your preferred room</h2>
            <p className="text-muted">
              Select an available room, enter your check-in details, and secure the best
              rate with a confirmed booking reference.
            </p>
          </div>
          <BookingForm rooms={rooms ?? []} />
        </div>
      </section>

      {/* ── About Section (Dark theme matching reference) ── */}
      <section className="section-padding bg-[#0a1422]" id="about">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 items-center">
            
            {/* Left Column: Eyebrow, Typography & Learn More CTA */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[--gold-400,#d4a853] font-bold text-[0.8rem] uppercase tracking-widest">
                <span className="w-5 h-[2px] bg-[--gold-400,#d4a853]" />
                <span>ABOUT TULIP GUEST ROOMS</span>
              </div>
              
              <h2 className="font-heading text-[2.4rem] sm:text-[2.8rem] font-bold leading-[1.15] text-white">
                Simple Stays,<br />
                <span className="italic font-serif text-[--gold-400,#d4a853]">Great Experiences</span>
              </h2>
              
              <p className="text-[--text-muted-token,#cbd5e1] text-[0.95rem] leading-relaxed">
                Tulip Guest Rooms offers clean, comfortable and well-maintained rooms at an affordable price. Whether you&apos;re here for business, family visits, or travel, we ensure a pleasant stay with all essential amenities.
              </p>

              <div className="pt-2">
                <Link
                  href="/rooms"
                  className="inline-flex items-center gap-3 rounded-full text-[0.88rem] font-medium tracking-wide transition-all duration-300 hover:bg-[rgba(217,181,113,0.12)] hover:shadow-[0_0_15px_rgba(217,181,113,0.25)]"
                  style={{
                    padding: '12px 28px',
                    border: '1.5px solid var(--gold-400, #d4a853)',
                    backgroundColor: 'transparent',
                    color: 'var(--gold-400, #d4a853)',
                  }}
                >
                  <span>Learn More</span>
                  <span className="text-[1.1rem] leading-none">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Middle Column: Room Image */}
            <div className="overflow-hidden rounded-2xl border border-[rgba(217,181,113,0.25)] shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
              <img
                src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800"
                alt="Tulip Guest Rooms interior bedroom"
                className="w-full h-[280px] sm:h-[320px] object-cover"
              />
            </div>

            {/* Right Column: Why Choose Us Card */}
            <div
              className="relative rounded-2xl flex flex-col gap-4 overflow-hidden"
              style={{
                padding: '30px 32px',
                background: 'rgba(16, 29, 45, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(217, 181, 113, 0.22)',
                boxShadow: '0 15px 35px rgba(0, 0, 0, 0.45)',
              }}
            >
              {/* Card Heading (Plain text) */}
              <div>
                <h3 className="font-heading text-white text-[1.35rem] font-bold">
                  Why Choose Us?
                </h3>
              </div>

              {/* List with gold checkmarks matching room card amenity style */}
              <ul className="flex flex-col text-[0.92rem] text-slate-200 mt-1">
                {[
                  'Clean & Comfortable Rooms',
                  'Friendly Staff',
                  'Affordable Rates',
                  'Peaceful Environment',
                ].map((item, idx, arr) => (
                  <li
                    key={item}
                    className={`flex items-center gap-4 py-3.5 ${
                      idx !== arr.length - 1 ? 'border-b border-[rgba(255,255,255,0.08)]' : ''
                    }`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="text-[--gold-400,#d4a853] shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="font-medium text-slate-200">{item}</span>
                  </li>
                ))}
              </ul>

              {/* Decorative Subtle Corner Accent */}
              <div className="absolute -bottom-3 -right-2 pointer-events-none opacity-25 text-[--gold-400,#d4a853]">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s-2-5-1-9 5-6 11-7c-1 6-3 10-7 11s-3 5-3 5z" />
                  <path d="M11 13c-2-2-4-2-7-1 1 3 3 5 6 5" />
                </svg>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer settings={settings} />
    </main>
  );
}
