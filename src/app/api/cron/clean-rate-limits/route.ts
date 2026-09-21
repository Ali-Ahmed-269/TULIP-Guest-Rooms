import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

/**
 * Scheduled Cron Job: Clean Expired Rate Limit Logs
 *
 * Deletes rate limit log rows older than 1 hour.
 * Can be triggered via Vercel Cron, GitHub Actions, or Supabase pg_cron.
 * Protected by CRON_SECRET header to prevent unauthorized trigger invocations.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Verify secret token if CRON_SECRET is configured in environment
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('rate_limit_log')
      .delete({ count: 'exact' })
      .lt('attempted_at', oneHourAgo);

    if (error) {
      console.error('[Cron Rate Limit Cleanup] Error deleting expired logs:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    console.log(`[Cron Rate Limit Cleanup] Successfully deleted ${count ?? 0} expired log row(s).`);

    return NextResponse.json({
      success: true,
      deleted_rows: count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Cron Rate Limit Cleanup] Unexpected error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
