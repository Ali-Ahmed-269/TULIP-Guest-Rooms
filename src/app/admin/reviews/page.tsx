import { createServiceRoleClient } from '@/utils/supabase/server';
import AdminLayout from '@/components/AdminLayout';
import AdminReviewsList from '@/components/AdminReviewsList';

async function getReviews() {
  const supabase = createServiceRoleClient();
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, guest_name, rating, review_text, status, created_at, bookings(booking_reference)')
    .order('created_at', { ascending: false });

  return reviews || [];
}

export default async function AdminReviewsPage() {
  const reviews = await getReviews();

  return (
    <AdminLayout>
      <section style={{ paddingBottom: '40px' }}>
        <div style={{ marginBottom: '22px' }}>
          <h1>Reviews Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Approve or reject guest reviews to control which ones are displayed on the public site.
          </p>
        </div>
        <AdminReviewsList initialReviews={reviews as any} />
      </section>
    </AdminLayout>
  );
}
