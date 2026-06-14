import 'dotenv/config'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

// Initialize the Supabase Client using your Anon key (mimicking a frontend browser login)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ⚠️ CHANGE THESE VALUES to the email and password you created in the Supabase Dashboard
const ADMIN_EMAIL = 'alikhanswati42574@gmail.com' 
const ADMIN_PASSWORD = '4257432@Ali'

async function testAdminLogin() {
  console.log(`🔄 Attempting login for: ${ADMIN_EMAIL}...`)

  // 1. Send the login request to Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })

  // 2. Handle Login Failures (Wrong password, user doesn't exist, etc.)
  if (error) {
    console.error('❌ Login Failed! Error details:', error.message)
    return
  }

  const loggedInUser = data.user
  console.log('✅ Authentication Successful!')
  console.log('------------------------------------')
  console.log(`📧 User Email: ${loggedInUser.email}`)
  console.log(`🆔 User UUID:  ${loggedInUser.id}`)
  console.log('------------------------------------')
  
  console.log('💡 Copy that User UUID! You can add it to your .env.local file as ADMIN_UUID to protect your middleware checkpoint.')

  // 3. Automatically sign out to keep the test clean
  await supabase.auth.signOut()
}

testAdminLogin()