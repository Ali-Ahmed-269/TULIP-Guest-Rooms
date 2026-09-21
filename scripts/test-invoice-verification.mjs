import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runTest() {
  console.log(`Invoice verification test suite running against ${BASE_URL} …\n`);

  // 1. Fetch or create a test booking row
  const { data: bookings, error: selectErr } = await supabase
    .from('bookings')
    .select('id, booking_reference, guest_email, guest_phone')
    .limit(1);

  let testBooking = bookings?.[0];

  if (selectErr || !testBooking) {
    // Create a dummy booking for testing if table is empty
    const { data: newBooking, error: insertErr } = await supabase
      .from('bookings')
      .insert({
        room_id: 1,
        booking_reference: 'TGR-2026-9999-TEST',
        guest_name: 'Verification Test Guest',
        guest_email: 'invoice-test@example.com',
        guest_phone: '0300-9999999',
        guest_cnic: '42101-1111111-1',
        guest_address: '123 Test Street',
        check_in_date: '2026-10-01',
        check_out_date: '2026-10-02',
        guests_count: 1,
        total_amount: 3000,
        payment_method: 'pay_at_hotel',
        payment_status: 'Unpaid',
        booking_status: 'Confirmed',
      })
      .select('id, booking_reference, guest_email, guest_phone')
      .single();

    if (insertErr || !newBooking) {
      console.error('Failed to prepare test booking row:', insertErr);
      process.exit(1);
    }
    testBooking = newBooking;
  }

  const bookingRef = testBooking.booking_reference || String(testBooking.id);
  const guestEmail = testBooking.guest_email;
  const guestPhone = testBooking.guest_phone;

  console.log(`Using test booking reference: "${bookingRef}"`);
  console.log(`Test guest email: "${guestEmail}", phone: "${guestPhone}"\n`);

  let failures = 0;

  // Helper for reporting test steps
  function assert(condition, label, details = '') {
    if (condition) {
      console.log(`  [PASS] ${label}${details ? ` (${details})` : ''}`);
    } else {
      console.log(`  [FAIL] ${label}${details ? ` (${details})` : ''}`);
      failures++;
    }
  }

  // ── TEST 1: Unauthenticated request with correct booking_id + matching email in POST body
  console.log('── 1. Verification with matching guest email in POST body ──────');
  {
    const res = await fetch(`${BASE_URL}/api/bookings/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL },
      body: JSON.stringify({ booking_id: bookingRef, email: guestEmail }),
    });

    assert(res.status === 200, 'HTTP status 200 OK', `status ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    assert(contentType.includes('application/pdf'), 'Content-Type is application/pdf', contentType);
    
    const buffer = await res.arrayBuffer();
    const pdfHeader = String.fromCharCode(...new Uint8Array(buffer.slice(0, 5)));
    assert(pdfHeader === '%PDF-', 'Buffer starts with %PDF- header', pdfHeader);
  }

  // ── TEST 2: Unauthenticated request with correct booking_id + matching phone in custom header
  console.log('\n── 2. Verification with matching guest phone in custom header ────');
  {
    const res = await fetch(`${BASE_URL}/api/bookings/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
        'x-guest-phone': guestPhone,
      },
      body: JSON.stringify({ booking_id: bookingRef }),
    });

    assert(res.status === 200, 'HTTP status 200 OK', `status ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    assert(contentType.includes('application/pdf'), 'Content-Type is application/pdf', contentType);
  }

  // ── TEST 3: Unauthenticated request with correct booking_id but missing email/phone
  console.log('\n── 3. Unauthenticated request without verification credentials ─');
  {
    const res = await fetch(`${BASE_URL}/api/bookings/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL },
      body: JSON.stringify({ booking_id: bookingRef }),
    });

    assert(res.status === 403, 'HTTP status 403 Forbidden', `status ${res.status}`);
    const json = await res.json().catch(() => ({}));
    assert(json.success === false, 'Returns success: false in JSON response');
  }

  // ── TEST 4: Unauthenticated request with wrong email and wrong phone
  console.log('\n── 4. Unauthenticated request with mismatching email & phone ──');
  {
    const res = await fetch(`${BASE_URL}/api/bookings/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL },
      body: JSON.stringify({
        booking_id: bookingRef,
        email: 'invalid-email-xyz@domain.invalid',
        phone: '0399-9999999',
      }),
    });

    assert(res.status === 403, 'HTTP status 403 Forbidden', `status ${res.status}`);
  }

  // ── TEST 5: Authenticated admin session can access invoice without email/phone
  console.log('\n── 5. Authenticated admin session access without email/phone ──');
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('  [SKIP] TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD not set in .env.local');
  } else {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(`${BASE_URL}/admin/login`);
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname.includes('/admin/dashboard'));

      const cookies = await context.cookies();
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

      const res = await fetch(`${BASE_URL}/api/bookings/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': BASE_URL,
          Cookie: cookieHeader,
        },
        body: JSON.stringify({ booking_id: bookingRef }), // NO email or phone passed!
      });

      assert(res.status === 200, 'Admin request returned HTTP 200 OK', `status ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      assert(contentType.includes('application/pdf'), 'Content-Type is application/pdf', contentType);
    } catch (err) {
      assert(false, 'Admin login and invoice fetch succeeded', err.message);
    } finally {
      await browser.close();
    }
  }

  console.log('\n─────────────────────────────────────────────────────────────────');
  if (failures === 0) {
    console.log('ALL INVOICE VERIFICATION TESTS PASSED SUCCESSFULLY.');
    process.exit(0);
  } else {
    console.error(`TEST SUITE FAILED with ${failures} failure(s).`);
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error('Unexpected test error:', err);
  process.exit(1);
});
