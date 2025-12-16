import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionToken } from '../auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { token, postId } = await req.json()

    if (!token || !postId) {
      return NextResponse.json({ error: 'Token and postId required' }, { status: 400 })
    }

    const phone = verifySessionToken(token)
    if (!phone) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Verify ownership before deleting
    const { data: post, error: fetchError } = await supabase
      .from('cs_content')
      .select('posted_by_phone')
      .eq('id', postId)
      .single()

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.posted_by_phone !== phone) {
      return NextResponse.json({ error: 'Not authorized to delete this post' }, { status: 403 })
    }

    // Delete the post
    const { error: deleteError } = await supabase
      .from('cs_content')
      .delete()
      .eq('id', postId)

    if (deleteError) {
      console.error('[cs/delete-post] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[cs/delete-post] Error:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
