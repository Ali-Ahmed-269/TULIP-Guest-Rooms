import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listLegacyBookings() {
  const { data: rows, error } = await supabase
    .from('bookings')
    .select('id, booking_reference, created_at')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching bookings:', error);
    process.exit(1);
  }

  // Regex for new random suffix format: TGR-YYYY-NNNN-XXX (e.g. TGR-2026-0001-X7K)
  const newFormatRegex = /^TGR-\d{4}-\d{4}-[A-Z0-9]{3}$/i;

  const legacyRows = (rows || []).filter((r) => !r.booking_reference || !newFormatRegex.test(r.booking_reference));

  console.log(`TOTAL BOOKINGS IN DB: ${(rows || []).length}`);
  console.log(`LEGACY BOOKINGS WITHOUT RANDOM SUFFIX: ${legacyRows.length}\n`);

  if (legacyRows.length > 0) {
    console.log('Legacy Booking IDs & References:');
    console.log(JSON.stringify(legacyRows, null, 2));
  }
}

listLegacyBookings();
