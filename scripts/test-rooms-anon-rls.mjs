import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing in .env.local');
  process.exit(1);
}

// Anonymous / Public client strictly using ANON KEY (no service role key)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runAnonRlsTests() {
  console.log('Anonymous RLS Test Suite for "rooms" table (using ANON KEY)\n');

  let failures = 0;

  function assert(condition, label, details = '') {
    if (condition) {
      console.log(`  [PASS] ${label}${details ? ` (${details})` : ''}`);
    } else {
      console.log(`  [FAIL] ${label}${details ? ` (${details})` : ''}`);
      failures++;
    }
  }

  // ── 1. SELECT / READ Test ──────────────────────────────────────────────
  console.log('── 1. Anonymous SELECT rooms (Must Succeed) ─────────────────────');
  {
    const { data, error } = await supabase.from('rooms').select('*');
    assert(error === null, 'Anonymous client SELECT error is null', error ? error.message : 'No error');
    assert(Array.isArray(data) && data.length > 0, 'Anonymous client returned rooms array', `Found ${data?.length ?? 0} room(s)`);
  }

  // ── 2. INSERT Test ─────────────────────────────────────────────────────
  console.log('\n── 2. Anonymous INSERT room (Must Be Rejected) ──────────────────');
  {
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        room_number: `T-${Date.now().toString().slice(-7)}`,
        room_type: 'Standard',
        price_per_night: 1000,
        max_guests: 2,
        status: 'Available',
      })
      .select();

    console.log('INSERT result -> error:', error, 'data:', data);
    const isRejected = Boolean(error || !data || data.length === 0);
    assert(
      isRejected,
      'Anonymous INSERT rejected by RLS policy',
      error ? `Code ${error.code}: ${error.message}` : '0 rows inserted (RLS blocked)'
    );
  }

  // ── 3. UPDATE Test ─────────────────────────────────────────────────────
  console.log('\n── 3. Anonymous UPDATE room (Must Be Rejected) ──────────────────');
  {
    const { data, error } = await supabase
      .from('rooms')
      .update({ price_per_night: 99999 })
      .eq('room_number', '101')
      .select();

    // RLS rejects UPDATE by matching 0 rows or returning error
    const isRejected = Boolean(error || !data || data.length === 0);
    assert(
      isRejected,
      'Anonymous UPDATE rejected by RLS policy',
      error ? `Code ${error.code}: ${error.message}` : '0 rows updated (RLS blocked)'
    );
  }

  // ── 4. DELETE Test ─────────────────────────────────────────────────────
  console.log('\n── 4. Anonymous DELETE room (Must Be Rejected) ──────────────────');
  {
    const { data, error } = await supabase
      .from('rooms')
      .delete()
      .eq('room_number', '101')
      .select();

    // RLS rejects DELETE by matching 0 rows or returning error
    const isRejected = Boolean(error || !data || data.length === 0);
    assert(
      isRejected,
      'Anonymous DELETE rejected by RLS policy',
      error ? `Code ${error.code}: ${error.message}` : '0 rows deleted (RLS blocked)'
    );
  }

  console.log('\n─────────────────────────────────────────────────────────────────');
  if (failures === 0) {
    console.log('ALL ANONYMOUS RLS TESTS PASSED SUCCESSFULLY.');
    process.exit(0);
  } else {
    console.error(`ANONYMOUS RLS TEST SUITE FAILED with ${failures} failure(s).`);
    process.exit(1);
  }
}

runAnonRlsTests().catch((err) => {
  console.error('Unexpected test error:', err);
  process.exit(1);
});
