import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Admin handles that can delete any post/comment and edit any about_person
const ADMIN_HANDLES = ['bart']

// Check if a phone number belongs to an admin
export async function isAdmin(phone: string): Promise<boolean> {
  const { data: subscriber } = await supabase
    .from('sms_subscribers')
    .select('personalization')
    .eq('phone_number', phone)
    .single()

  const handle = subscriber?.personalization?.handle
  return handle ? ADMIN_HANDLES.includes(handle.toLowerCase()) : false
}

// Simple session token: base64(phone:timestamp:signature)
export function createSessionToken(phone: string): string {
  const secret = process.env.SUPABASE_SERVICE_KEY!.slice(0, 32)
  const timestamp = Date.now()
  const data = `${phone}:${timestamp}`
  const signature = crypto.createHmac('sha256', secret).update(data).digest('hex').slice(0, 16)
  return Buffer.from(`${data}:${signature}`).toString('base64')
}

export function verifySessionToken(token: string): string | null {
  try {
    const secret = process.env.SUPABASE_SERVICE_KEY!.slice(0, 32)
    const decoded = Buffer.from(token, 'base64').toString()
    const [phone, timestamp, signature] = decoded.split(':')

    const expectedSig = crypto.createHmac('sha256', secret).update(`${phone}:${timestamp}`).digest('hex').slice(0, 16)
    if (signature !== expectedSig) return null

    // Check expiry (30 days)
    if (Date.now() - parseInt(timestamp) > 30 * 24 * 60 * 60 * 1000) return null

    return phone
  } catch {
    return null
  }
}
