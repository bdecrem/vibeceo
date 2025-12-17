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
    const { token, postId, commentId } = await req.json()

    if (!token || !postId || !commentId) {
      return NextResponse.json({ error: 'Token, postId, and commentId required' }, { status: 400 })
    }

    const phone = verifySessionToken(token)
    if (!phone) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(phone)

    // Get user's handle
    const { data: subscriber } = await supabase
      .from('sms_subscribers')
      .select('personalization')
      .eq('phone_number', phone)
      .single()

    const userHandle = subscriber?.personalization?.handle || subscriber?.personalization?.name

    if (!userHandle) {
      return NextResponse.json({ error: 'User handle not found' }, { status: 400 })
    }

    // Get the post with comments
    const { data: post, error: fetchError } = await supabase
      .from('cs_content')
      .select('comments')
      .eq('id', postId)
      .single()

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const comments = post.comments || []
    const commentIndex = comments.findIndex((c: { id: string; author: string }) => c.id === commentId)

    if (commentIndex === -1) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Verify ownership (unless admin)
    if (comments[commentIndex].author !== userHandle && !userIsAdmin) {
      return NextResponse.json({ error: 'Not authorized to delete this comment' }, { status: 403 })
    }

    // Remove the comment
    comments.splice(commentIndex, 1)

    const { error: updateError } = await supabase
      .from('cs_content')
      .update({ comments })
      .eq('id', postId)

    if (updateError) {
      console.error('[cs/delete-comment] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[cs/delete-comment] Error:', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
