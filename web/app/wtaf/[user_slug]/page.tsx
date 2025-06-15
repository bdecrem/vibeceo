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
    const app_slug = subscriber.index_file.replace('.html', '')
    const redirectUrl = `/wtaf/${user_slug}/${app_slug}`
    console.log(`[DEBUG] Redirecting to: ${redirectUrl}`)
    redirect(redirectUrl)
  }

  console.log(`[DEBUG] No index file found, showing default page`)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="text-xl md:text-2xl text-white space-y-4 leading-relaxed">
          <p>✅ Welcome to {user_slug}.</p>
          <p>This is the front porch. The weirdness lives deeper inside.</p>
          <p>Double-check your URL, or just vibe for a bit.</p>
        </div>
      </div>
    </div>
  )
}

export function generateMetadata({ params }: UserPageProps) {
  return {
    title: `${params.user_slug} - WTAF`,
    description: `Welcome to ${params.user_slug}'s corner of the weirdness.`
  }
}