import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionToken, isAdmin } from '../auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { token, postId, person } = await req.json()

    if (!token || !postId) {
      return NextResponse.json({ error: 'Token and postId required' }, { status: 400 })
    }

    const phone = verifySessionToken(token)
    if (!phone) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(phone)

    // Get the post
    const { data: post, error: fetchError } = await supabase
      .from('cs_content')
      .select('about_person')
      .eq('id', postId)
      .single()

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Non-admins can only set person if it's currently empty
    if (!userIsAdmin && post.about_person) {
      return NextResponse.json({ error: 'Not authorized to change person on this post' }, { status: 403 })
    }

    // Sanitize person input (1-2 words, max 50 chars)
    const sanitizedPerson = person?.trim().slice(0, 50) || null

    // Update the post
    const { error: updateError } = await supabase
      .from('cs_content')
      .update({ about_person: sanitizedPerson })
      .eq('id', postId)

    if (updateError) {
      console.error('[cs/set-person] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update person' }, { status: 500 })
    }

    return NextResponse.json({ success: true, person: sanitizedPerson })

  } catch (error) {
    console.error('[cs/set-person] Error:', error)
    return NextResponse.json({ error: 'Failed to set person' }, { status: 500 })
  }
}
