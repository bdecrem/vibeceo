/**
 * Backfill titles for CS links that don't have one yet
 * Run with: npx tsx scripts/backfill-cs-titles.ts
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env from sms-bot root
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

/**
 * Extract and clean the <title> tag from HTML
 */
function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (!match) return null

  let title = match[1].trim()

  // Decode HTML entities
  title = title
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')

  // Remove common suffixes like " | Site Name" or " - Site Name"
  const separators = [' | ', ' - ', ' – ', ' — ', ' :: ', ' // ']
  for (const sep of separators) {
    if (title.includes(sep)) {
      const parts = title.split(sep)
      if (parts[0].length > 10 || parts.length === 2) {
        title = parts[0].trim()
        break
      }
    }
  }

  // Clean up LinkedIn-style titles
  if (title.startsWith('(') && title.includes(')')) {
    title = title.replace(/^\(\d+\)\s*/, '')
  }

  // Skip generic titles
  const genericTitles = ['home', 'post', 'article', 'page', 'untitled', 'loading']
  if (genericTitles.includes(title.toLowerCase())) {
    return null
  }

  // Limit length
  if (title.length > 100) {
    title = title.slice(0, 97) + '...'
  }

  return title || null
}

async function backfillTitles() {
  // Get all links without a title (exclude documents)
  const { data: links, error } = await supabase
    .from('cs_content')
    .select('id, url, title')
    .or('source_type.eq.link,source_type.is.null')
    .is('title', null)
    .order('posted_at', { ascending: false })

  if (error) {
    console.error('Error fetching links:', error)
    return
  }

  console.log(`Found ${links?.length || 0} links without titles`)

  if (!links || links.length === 0) {
    console.log('Nothing to backfill!')
    return
  }

  let updated = 0
  let failed = 0

  for (const link of links) {
    try {
      console.log(`Fetching: ${link.url}`)

      const response = await fetch(link.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KochiBot/1.0; +https://kochi.to)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        console.log(`  - Failed to fetch (${response.status})`)
        failed++
        continue
      }

      const html = await response.text()
      const title = extractTitle(html)

      if (title) {
        const { error: updateError } = await supabase
          .from('cs_content')
          .update({ title })
          .eq('id', link.id)

        if (updateError) {
          console.log(`  - DB error: ${updateError.message}`)
          failed++
        } else {
          console.log(`  ✓ "${title}"`)
          updated++
        }
      } else {
        console.log(`  - No title found`)
        failed++
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 500))
    } catch (err) {
      console.log(`  - Error: ${err}`)
      failed++
    }
  }

  console.log(`\nDone! Updated: ${updated}, Failed: ${failed}`)
}

backfillTitles().catch(console.error)
