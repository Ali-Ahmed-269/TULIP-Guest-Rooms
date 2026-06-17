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
    const {
      guesthouse_name,
      guesthouse_address,
      guesthouse_phone,
      guesthouse_email,
      jazzcash_number,
      easypaisa_number
    } = body;

    const supabase = createServiceRoleClient();

    // 3. Upsert settings in database
    const settingsToUpsert = [
      { setting_key: 'guesthouse_name', setting_value: (guesthouse_name || '').trim() },
      { setting_key: 'guesthouse_address', setting_value: (guesthouse_address || '').trim() },
      { setting_key: 'guesthouse_phone', setting_value: (guesthouse_phone || '').trim() },
      { setting_key: 'guesthouse_email', setting_value: (guesthouse_email || '').trim() },
      { setting_key: 'jazzcash_number', setting_value: (jazzcash_number || '').trim() },
      { setting_key: 'easypaisa_number', setting_value: (easypaisa_number || '').trim() }
    ];

    const { error } = await supabase
      .from('site_settings')
      .upsert(settingsToUpsert, { onConflict: 'setting_key' });

    if (error) {
      console.error('[API Settings Save] Database error:', error);
      return NextResponse.json({ success: false, message: 'Database update failed.' }, { status: 500 });
    }

    revalidatePath('/admin', 'layout');
    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully.',
    });
  } catch (err: any) {
    console.error('[API Settings Save] Error:', err);
    return NextResponse.json({ success: false, message: 'Server error occurred.' }, { status: 500 });
  }
}
