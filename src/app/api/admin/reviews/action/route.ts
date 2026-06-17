import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    // 1. Guard route: verify admin auth session
    const clientSupabase = await createClient();
    const { data: { user } } = await clientSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized access.' }, { status: 401 });
    }

    // 2. Parse payload
    const body = await request.json();
    const { review_id, action } = body;

    if (!review_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, message: 'Invalid payload.' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const statusValue = action === 'approve' ? 'Approved' : 'Rejected';

    const { error } = await supabase
      .from('reviews')
      .update({ status: statusValue })
      .eq('id', review_id);

    if (error) {
      console.error('[API Reviews Action] Update error:', error);
      return NextResponse.json({ success: false, message: 'Database update failed.' }, { status: 500 });
    }

    revalidatePath('/admin', 'layout');
    return NextResponse.json({
      success: true,
      message: `Review ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
    });
  } catch (err: any) {
    console.error('[API Reviews Action] Error:', err);
    return NextResponse.json({ success: false, message: 'Server error occurred.' }, { status: 500 });
  }
}
