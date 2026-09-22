import { createServiceRoleClient } from '@/utils/supabase/server';
import AdminLayout from '@/components/AdminLayout';
import AdminReviewsList from '@/components/AdminReviewsList';
import PageHeader from '@/components/PageHeader';

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
        <PageHeader
          eyebrow="Admin"
          title="Reviews Management"
          description="Approve or reject guest reviews to control which ones are displayed on the public site."
        />
        <div style={{ marginTop: '28px' }}>
          <AdminReviewsList initialReviews={reviews as any} />
        </div>
      </section>
    </AdminLayout>
  );
}
