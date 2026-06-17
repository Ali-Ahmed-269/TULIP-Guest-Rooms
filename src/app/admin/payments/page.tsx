import { createServiceRoleClient } from '@/utils/supabase/server';
import AdminLayout from '@/components/AdminLayout';
import AdminPaymentsList from '@/components/AdminPaymentsList';

async function getPendingPayments() {
  const supabase = createServiceRoleClient();
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, booking_reference, guest_name, guest_phone, guest_email, check_in_date, check_out_date, payment_status, payment_method, total_amount, payment_proof, rooms(id, room_number, room_type)')
    .eq('payment_status', 'Pending Verification')
    .neq('payment_method', 'pay_at_hotel')
    .order('created_at', { ascending: true });

  return bookings || [];
}

export default async function AdminPaymentsPage() {
  const payments = await getPendingPayments();

  return (
    <AdminLayout>
      <section className="pb-10">
        <div className="mb-6">
          <h1>Payments Pending Verification</h1>
          <p className="text-muted">
            Review JazzCash or Easypaisa transfer screenshots uploaded by guests and verify or reject reservations.
          </p>
        </div>
        <AdminPaymentsList initialPayments={payments as any} />
      </section>
    </AdminLayout>
  );
}
