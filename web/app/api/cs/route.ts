import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from './auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const token = searchParams.get('token')
    const offset = (page - 1) * limit

    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 })
    }

    // Verify token to identify user's posts
    const userPhone = token ? verifySessionToken(token) : null

    const { data: links, error } = await supabase
      .from('cs_content')
      .select('id, url, domain, posted_by_name, posted_by_phone, notes, posted_at, comments, content_summary, about_person')
      .order('posted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching cs_content:', error)
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
    }

    // Get unique people for filter tags
    const { data: peopleData } = await supabase
      .from('cs_content')
      .select('about_person')
      .not('about_person', 'is', null)
      .order('about_person')

    const uniquePeople = [...new Set((peopleData || []).map(p => p.about_person).filter(Boolean))]

    // Mark owned posts and strip phone from response
    const processedLinks = (links || []).map(link => ({
      id: link.id,
      url: link.url,
      domain: link.domain,
      posted_by_name: link.posted_by_name,
      notes: link.notes,
      posted_at: link.posted_at,
      comments: link.comments,
      content_summary: link.content_summary,
      about_person: link.about_person,
      isOwner: userPhone ? link.posted_by_phone === userPhone : false
    }))

    const { count, error: countError } = await supabase
      .from('cs_content')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Error getting count:', countError)
    }

    return NextResponse.json({
      links: processedLinks,
      people: uniquePeople,
      pagination: {
        page,
        limit,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNextPage: page < Math.ceil((count || 0) / limit),
        hasPreviousPage: page > 1
      }
    })

  } catch (error) {
    console.error('Error in CS API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
