import 'dotenv/config'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase using your public variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDatabaseQuery() {
  console.log("🔄 Testing live connection to Supabase 'rooms' table...")
  console.log("⏳ Applying query filter: .eq('status', 'Available')...\n")

  // This mimics exactly what your getPageData() does on your page.tsx
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('status', 'Available')

  if (error) {
    console.error('❌ Database Query Failed! Error details:', error.message)
    console.error('💡 Hint: Double check that your table is named exactly "rooms" and contains a column named "status".')
    return
  }

  console.log('✅ Database Connection Successful!')
  console.log(`📊 Found ${rooms.length} rooms marked as 'Available':\n`)
  
  if (rooms.length > 0) {
    console.table(rooms.map(room => ({
      ID: room.id,
      Name: room.name || room.room_number || 'Unnamed Room',
      Status: room.status
    })))
  } else {
    console.log("⚠️ The query worked perfectly, but returned 0 rows. Make sure you actually have rooms in your dashboard table with the exact text 'Available' in the status column!");
  }
}

testDatabaseQuery()