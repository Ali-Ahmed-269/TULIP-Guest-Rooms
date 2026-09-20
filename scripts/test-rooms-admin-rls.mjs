import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing in .env.local');
  process.exit(1);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ERROR: TEST_ADMIN_EMAIL or TEST_ADMIN_PASSWORD missing in .env.local');
  process.exit(1);
}

// Client using ANON key + Auth Session
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runAdminRlsTests() {
  console.log(`Authenticated Admin RLS Test Suite for "rooms" table\n`);

  let failures = 0;

  function assert(condition, label, details = '') {
    if (condition) {
      console.log(`  [PASS] ${label}${details ? ` (${details})` : ''}`);
    } else {
      console.log(`  [FAIL] ${label}${details ? ` (${details})` : ''}`);
      failures++;
    }
  }

  // ── Step 0: Sign in as Admin ───────────────────────────────────────────
  console.log(`── 0. Authenticating as Admin (${ADMIN_EMAIL}) ──────────`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  assert(authError === null && Boolean(authData?.session), 'Admin user authentication successful', authError ? authError.message : `User ID: ${authData.user.id}`);

  if (authError || !authData.session) {
    console.error('Cannot proceed without admin authentication.');
    process.exit(1);
  }

  const throwawayRoomNumber = `T-${Date.now().toString().slice(-7)}`;
  let createdRoomId = null;

  // ── Step 1: Admin INSERT Test ──────────────────────────────────────────
  console.log('\n── 1. Authenticated Admin INSERT room (Must Succeed) ───────────');
  {
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        room_number: throwawayRoomNumber,
        room_type: 'Standard',
        price_per_night: 4500,
        max_guests: 2,
        status: 'Available',
      })
      .select()
      .single();

    assert(error === null && Boolean(data?.id), 'Admin INSERT room successful', error ? error.message : `Created ID: ${data?.id}, Number: ${data?.room_number}`);
    if (data?.id) {
      createdRoomId = data.id;
    }
  }

  // ── Step 2: Admin UPDATE Test ──────────────────────────────────────────
  console.log('\n── 2. Authenticated Admin UPDATE room (Must Succeed) ───────────');
  if (createdRoomId) {
    const newPrice = 5200;
    const { data, error } = await supabase
      .from('rooms')
      .update({ price_per_night: newPrice })
      .eq('id', createdRoomId)
      .select()
      .single();

    assert(error === null && data?.price_per_night === newPrice, 'Admin UPDATE room price successful', error ? error.message : `Updated Price: PKR ${data?.price_per_night}`);
  } else {
    assert(false, 'Admin UPDATE room skipped (INSERT failed)');
  }

  // ── Step 3: Admin DELETE Test ──────────────────────────────────────────
  console.log('\n── 3. Authenticated Admin DELETE room (Must Succeed) ───────────');
  if (createdRoomId) {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', createdRoomId);

    assert(error === null, 'Admin DELETE throwaway room successful', error ? error.message : `Deleted ID: ${createdRoomId}`);
  } else {
    assert(false, 'Admin DELETE room skipped (INSERT failed)');
  }

  // ── Step 4: Cleanup Verification ──────────────────────────────────────
  console.log('\n── 4. Verify Throwaway Test Data Cleaned Up ────────────────────');
  {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_number', throwawayRoomNumber);

    assert(Array.isArray(data) && data.length === 0, 'No leftover test room rows in live table', `Remaining matches: ${data?.length ?? 0}`);
  }

  console.log('\n─────────────────────────────────────────────────────────────────');
  if (failures === 0) {
    console.log('ALL AUTHENTICATED ADMIN RLS TESTS PASSED SUCCESSFULLY.');
    process.exit(0);
  } else {
    console.error(`AUTHENTICATED ADMIN RLS TEST SUITE FAILED with ${failures} failure(s).`);
    process.exit(1);
  }
}

runAdminRlsTests().catch((err) => {
  console.error('Unexpected test error:', err);
  process.exit(1);
});
