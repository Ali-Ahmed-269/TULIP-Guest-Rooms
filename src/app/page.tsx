import Footer from '@/components/Footer';
import BookingForm from '@/components/BookingForm';
import HomeRoomsSection from '@/components/HomeRoomsSection';
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
        {/* Dark warm overlay */}
        <div className="hero-overlay" />

        <div className="container hero-content">
          <div className="hero-text">
            <span className="badge badge-red hero-badge">Tulip Guest Rooms</span>
            <h1 className="hero-headline">
              Comfortable Stays,<br />
              Warm Hospitality.
            </h1>
            <p className="hero-sub">
              Choose from available rooms, reserve instantly, and receive a booking
              confirmation with invoice support. Flexible payment, genuine care.
            </p>
            <div className="hero-ctas">
              <a href="#booking" className="btn btn-primary">
                Book a Room
              </a>
              <a href="#rooms" className="btn btn-outline hero-outline-btn">
                View Rooms
              </a>
            </div>
          </div>

          {/* Feature highlights */}
          <div className="hero-features">
            {[
              { icon: '💳', title: 'Flexible Payments', desc: 'Pay at hotel or transfer via JazzCash / Easypaisa.' },
              { icon: '⚡', title: 'Fast Booking',       desc: 'Reserve instantly with online confirmation & invoice.' },
              { icon: '📞', title: 'Local Support',      desc: 'Available by phone and email during your entire stay.' },
            ].map((f) => (
              <div key={f.title} className="hero-feature-card">
                <span className="hero-feature-icon">{f.icon}</span>
                <div>
                  <h3 className="hero-feature-title">{f.title}</h3>
                  <p className="hero-feature-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rooms Section ── */}
      <section className="section-padding" id="rooms">
        <div className="container grid gap-6">
          <div className="grid gap-3 max-w-[680px]">
            <span className="badge badge-blue">Rooms &amp; Rates</span>
            <h2>Available rooms for your stay</h2>
            <p className="text-muted">
              Browse current room availability and rates before you reserve. Each room is
              cleaned thoroughly and ready for guest arrival.
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

      {/* ── About Section ── */}
      <section className="section-padding" id="about">
        <div className="container grid gap-6">
          <div className="grid gap-2">
            <h2>About Tulip Guest Rooms</h2>
            <p className="text-muted">
              A friendly property offering clean, comfortable rooms and attentive service
              for travelers, families, and business guests.
            </p>
          </div>
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
            <div className="card">
              <h3>Central Location</h3>
              <p>Close to transport, shopping, and dining with easy access to the city center.</p>
            </div>
            <div className="card">
              <h3>Structured Pricing</h3>
              <p>Transparent room rates and guesthouse information for a smooth stay.</p>
            </div>
            <div className="card">
              <h3>Dedicated Support</h3>
              <p>We assist with bookings, payments, and any needs during your stay.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer settings={settings} />
    </main>
  );
}
