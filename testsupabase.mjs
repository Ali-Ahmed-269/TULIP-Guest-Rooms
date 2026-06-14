import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

// 1. Initialize with your project credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL 
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testStorageConnection() {
  console.log("🔄 Testing connection to Supabase Storage...")

  // Create a tiny text file in memory to test the upload
  const testBuffer = Buffer.from('connection test successful!')
  const fileName = `test-${Date.now()}.txt`

  // 2. Attempt to upload the test file to your bucket
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('payment-proofs') // Must match your bucket name exactly
    .upload(fileName, testBuffer, {
      contentType: 'text/plain',
      upsert: true
    })

  if (uploadError) {
    console.error('❌ Upload failed! Error details:', uploadError.message)
    return
  }

  console.log('✅ Upload successful! File created at:', uploadData.path)

  // 3. Optional: Clean up and delete the test file immediately
  const { error: deleteError } = await supabase
    .storage
    .from('PAYMENT-PROOFS')
    .remove([fileName])

  if (deleteError) {
    console.error('⚠️ Upload worked, but failed to auto-delete the test file:', deleteError.message)
  } else {
    console.log('✅ Clean up successful! Test file removed.')
  }
}

testStorageConnection()