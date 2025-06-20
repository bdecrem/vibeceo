import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{
    user_slug: string
    app_slug: string
  }>
}

export default async function WTAFAppPage({ params }: PageProps) {
  const { user_slug, app_slug } = await params
  
  try {
    // Fetch the WTAF content from Supabase
    const { data, error } = await supabase
      .from('wtaf_content')
      .select('html_content, coach, original_prompt, created_at')
      .eq('user_slug', user_slug)
      .eq('app_slug', app_slug)
      .eq('status', 'published')
      .single()

    if (error || !data) {
      console.error('WTAF content not found:', error)
      return notFound()
    }

    // Return the HTML content directly
    return (
      <div 
        dangerouslySetInnerHTML={{ __html: data.html_content }}
        style={{ 
          minHeight: '100vh',
          width: '100%',
          margin: 0,
          padding: 0
        }}
      />
    )
  } catch (error) {
    console.error('Error fetching WTAF content:', error)
    return notFound()
  }
}

// Generate metadata with dynamic OG images
export async function generateMetadata({ params }: PageProps) {
  const { user_slug, app_slug } = await params
  
  try {
    const { data } = await supabase
      .from('wtaf_content')
      .select('original_prompt, coach')
      .eq('user_slug', user_slug)
      .eq('app_slug', app_slug)
      .eq('status', 'published')
      .single()

    const title = `WTAF: ${app_slug.split('-').join(' ')}`
    const description = data?.original_prompt ? 
      `${data.original_prompt.substring(0, 150)}...` : 
      'Vibecoded chaos, shipped via SMS.'

    // Use the working cached OG image route with full public URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://theaf-web.ngrok.io'
    const ogImageUrl = `${baseUrl}/api/generate-og-cached?user=${encodeURIComponent(user_slug)}&app=${encodeURIComponent(app_slug)}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: title,
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'WTAF - Delusional App Generator',
      description: 'Vibecoded chaos, shipped via SMS.',
      openGraph: {
        title: 'WTAF - Delusional App Generator',
        description: 'Vibecoded chaos, shipped via SMS.',
        images: [`${process.env.NEXT_PUBLIC_APP_URL || 'https://theaf-web.ngrok.io'}/api/generate-og-cached?user=default&app=wtaf`],
      },
    }
  }
} 