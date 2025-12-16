import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
    const offset = (page - 1) * limit

    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 })
    }

    const { data: links, error } = await supabase
      .from('cs_content')
      .select('id, url, domain, posted_by_name, notes, posted_at')
      .order('posted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching cs_content:', error)
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
    }

    const { count, error: countError } = await supabase
      .from('cs_content')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Error getting count:', countError)
    }

    return NextResponse.json({
      links: links || [],
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
