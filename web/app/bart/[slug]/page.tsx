import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface BartSlugPageProps {
  params: {
    slug: string
  }
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function BartSlugPage({ params }: BartSlugPageProps) {
  const { slug } = params

  console.log(`[DEBUG] BartSlugPage called with slug: ${slug}`)

  try {
    // Check if this is an admin slug (starts with "admin-")
    const isAdminSlug = slug.startsWith('admin-')
    
    if (isAdminSlug) {
      // For admin pages, query wtaf_content table with user_slug="bart" and app_slug=slug
      console.log(`[DEBUG] Admin slug detected: ${slug}`)
      
      const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content, coach, original_prompt, created_at')
        .eq('user_slug', 'bart')
        .eq('app_slug', slug)
        .eq('status', 'published')
        .single()

      if (error || !data) {
        console.error('Admin content not found:', error)
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
    } else {
      // For regular slugs, query wtaf_content table with user_slug="bart" and app_slug=slug
      console.log(`[DEBUG] Regular slug detected: ${slug}`)
      
      const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content, coach, original_prompt, created_at')
        .eq('user_slug', 'bart')
        .eq('app_slug', slug)
        .eq('status', 'published')
        .single()

      if (error || !data) {
        console.error('Regular content not found:', error)
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
    }
  } catch (error) {
    console.error('Error fetching content:', error)
    return notFound()
  }
}

// Generate metadata
export async function generateMetadata({ params }: BartSlugPageProps) {
  const { slug } = params
  
  try {
    const { data } = await supabase
      .from('wtaf_content')
      .select('original_prompt, coach')
      .eq('user_slug', 'bart')
      .eq('app_slug', slug)
      .eq('status', 'published')
      .single()

    const isAdminSlug = slug.startsWith('admin-')
    const title = isAdminSlug 
      ? `Admin: ${slug.replace('admin-', '').split('_')[0]}`
      : `WTAF: ${slug.split('-').join(' ')}`
    
    const description = data?.original_prompt ? 
      `${data.original_prompt.substring(0, 150)}...` : 
      'Vibecoded chaos, shipped via SMS.'

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: `/api/og-wtaf?user=bart&app=${encodeURIComponent(slug)}`,
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
        images: [`/api/og-wtaf?user=bart&app=${encodeURIComponent(slug)}`],
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: slug.startsWith('admin-') ? 'Admin Dashboard' : 'WTAF App',
      description: 'Vibecoded chaos, shipped via SMS.',
    }
  }
} 