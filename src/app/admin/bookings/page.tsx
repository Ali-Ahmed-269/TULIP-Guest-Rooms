import { createServiceRoleClient } from '@/utils/supabase/server';
import AdminLayout from '@/components/AdminLayout';
import AdminBookingsList from '@/components/AdminBookingsList';
import PageHeader from '@/components/PageHeader';

async function getBookings() {
  const supabase = createServiceRoleClient();
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, booking_reference, guest_name, guest_email, guest_phone, guest_cnic, guest_address, check_in_date, check_out_date, guests_count, total_amount, payment_method, payment_status, payment_proof, booking_status, special_requests, created_at, rooms(id, room_number, room_type)')
    .order('created_at', { ascending: false });

  return bookings || [];
}

export default async function AdminBookingsPage() {
  const bookings = await getBookings();

  return (
    <AdminLayout>
      <section style={{ paddingBottom: '40px' }}>
        <PageHeader
          eyebrow="Admin"
          title="Bookings"
          description="Recent booking records, search, status filters, and admin verification details."
        />
        <AdminBookingsList initialBookings={bookings} />
      </section>
    </AdminLayout>
  );
}
