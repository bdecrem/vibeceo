import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

interface CSLink {
  id: string
  url: string
  domain: string | null
  posted_by_name: string | null
  notes: string | null
  posted_at: string
  content_summary: string | null
  content_text: string | null
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json()

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question required' }, { status: 400 })
    }

    const trimmedQuestion = question.trim()
    if (trimmedQuestion.length < 3 || trimmedQuestion.length > 500) {
      return NextResponse.json({ error: 'Question must be 3-500 characters' }, { status: 400 })
    }

    // Check if this is a broad/analytical question that should use all links
    const broadPatterns = /\b(theme|themes|common|summary|summarize|overview|all|everything|general|trend|trends|pattern|patterns)\b/i
    const isBroadQuestion = broadPatterns.test(trimmedQuestion)

    let links: CSLink[] = []

    // For broad questions, just get all links with content
    // For specific questions, try full-text search first
    if (!isBroadQuestion) {
      const searchTerms = trimmedQuestion
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(term => term.length > 2)
        .slice(0, 10)
        .join(' | ') // Use OR instead of AND for better recall

      if (searchTerms) {
        const { data, error } = await supabase
          .from('cs_content')
          .select('id, url, domain, posted_by_name, notes, posted_at, content_summary, content_text')
          .not('content_fetched_at', 'is', null)
          .textSearch(
            'content_text',
            searchTerms,
            { type: 'websearch', config: 'english' }
          )
          .order('posted_at', { ascending: false })
          .limit(10)

        if (error) {
          console.error('[cs/chat] Text search error:', error)
        } else if (data) {
          links = data
        }
      }
    }

    // Fall back to recent links with content (or use for broad questions)
    if (links.length === 0) {
      const { data, error } = await supabase
        .from('cs_content')
        .select('id, url, domain, posted_by_name, notes, posted_at, content_summary, content_text')
        .not('content_fetched_at', 'is', null)
        .order('posted_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('[cs/chat] Fallback query error:', error)
      } else if (data) {
        links = data
      }
    }

    if (links.length === 0) {
      return NextResponse.json({
        answer: "No links with content available yet. Share some links first!",
        sources: []
      })
    }

    // Build context for Claude
    const context = links.map((link, i) => {
      const summary = link.content_summary || 'No summary available'
      const content = link.content_text?.slice(0, 1000) || ''
      return `[${i + 1}] ${link.url}
Domain: ${link.domain || 'unknown'}
Posted by: ${link.posted_by_name || 'Anonymous'}
Summary: ${summary}
${link.notes ? `Note: "${link.notes}"` : ''}
Content excerpt: ${content}
---`
    }).join('\n\n')

    // Query Claude
    const anthropic = new Anthropic()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are a helpful assistant answering questions about a collection of shared links. Answer based ONLY on the provided sources. If the sources don't contain relevant information, say so.

SOURCES:
${context}

QUESTION: ${trimmedQuestion}

Instructions:
- Answer concisely (2-4 sentences)
- Cite sources by number like [1], [2]
- If no sources are relevant, say "I don't see any links about that topic."
- Don't make up information not in the sources

Answer:`
        }
      ]
    })

    const answerContent = response.content[0]
    const answer = answerContent.type === 'text' ? answerContent.text : 'Could not generate answer'

    // Extract cited source numbers and return those links
    const citedNumbers = [...answer.matchAll(/\[(\d+)\]/g)].map(m => parseInt(m[1]))
    const uniqueCited = [...new Set(citedNumbers)]
    const sources = uniqueCited
      .filter(n => n >= 1 && n <= links.length)
      .map(n => ({
        id: links[n - 1].id,
        url: links[n - 1].url,
        domain: links[n - 1].domain,
        posted_by_name: links[n - 1].posted_by_name
      }))

    return NextResponse.json({ answer, sources })

  } catch (error) {
    console.error('[cs/chat] Error:', error)
    return NextResponse.json({ error: 'Failed to process question' }, { status: 500 })
  }
}
