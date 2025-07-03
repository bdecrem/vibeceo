import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface UserPageProps {
  params: {
    user_slug: string
  }
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function UserPage({ params }: UserPageProps) {
  const { user_slug } = params

  console.log(`[DEBUG] UserPage called with user_slug: ${user_slug}`)

  // Check if user has an index file set (with cache busting)
  const { data: subscriber, error } = await supabase
    .from('sms_subscribers')
    .select('index_file')
    .eq('slug', user_slug)
    .limit(1)
    .single()

  console.log(`[DEBUG] Database query result:`, { subscriber, error })

  // If user has an index file set, redirect to that page
  if (subscriber?.index_file) {
    const app_slug = subscriber.index_file.trim().replace('.html', '')
    const redirectUrl = `/wtaf/${user_slug}/${app_slug}`
    console.log(`[DEBUG] Redirecting to custom index: ${redirectUrl}`)
    redirect(redirectUrl)
  }

  // If no custom index file, redirect to creations page
  const creationsUrl = `/wtaf/${user_slug}/creations`
  console.log(`[DEBUG] No index file found, redirecting to creations: ${creationsUrl}`)
  redirect(creationsUrl)
}

export function generateMetadata({ params }: UserPageProps) {
  return {
    title: params.user_slug,
    description: `Welcome to ${params.user_slug}'s corner of the weirdness.`
  }
}
