/**
 * Import markdown documents from docsrepo into cs_content
 * Run with: npx tsx agents/cs-chat/import-docs.ts
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env from sms-bot root
dotenv.config({ path: path.join(__dirname, '../../.env.local') })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const DOCSREPO_PATH = path.join(__dirname, 'docsrepo')

async function importDocs() {
  // Get all markdown files (skip CLAUDE.md)
  const files = fs.readdirSync(DOCSREPO_PATH)
    .filter(f => f.endsWith('.md') && f !== 'CLAUDE.md')

  console.log(`Found ${files.length} markdown files to import`)

  for (const filename of files) {
    const filepath = path.join(DOCSREPO_PATH, filename)
    const content = fs.readFileSync(filepath, 'utf-8')

    // Extract title from first # heading or use filename
    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1] : filename.replace('.md', '').replace(/-/g, ' ')

    // Create a summary from the first ~500 chars after the title
    const summaryStart = titleMatch ? content.indexOf(titleMatch[0]) + titleMatch[0].length : 0
    const summary = content.slice(summaryStart, summaryStart + 500)
      .replace(/[#*_\[\]]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 200) + '...'

    // Check if already exists
    const { data: existing } = await supabase
      .from('cs_content')
      .select('id')
      .eq('document_filename', filename)
      .single()

    if (existing) {
      console.log(`Skipping ${filename} (already exists)`)
      continue
    }

    // Insert
    const { error } = await supabase
      .from('cs_content')
      .insert({
        source_type: 'document',
        document_filename: filename,
        document_title: title,
        url: `docsrepo://${filename}`,
        domain: 'docsrepo',
        content_text: content.slice(0, 50000), // Store up to 50k chars
        content_summary: summary,
        content_fetched_at: new Date().toISOString(),
        posted_at: new Date().toISOString(),
        posted_by_name: 'docsrepo',
        posted_by_phone: '+10000000000', // Placeholder for documents
      })

    if (error) {
      console.error(`Error importing ${filename}:`, error)
    } else {
      console.log(`Imported: ${title}`)
    }
  }

  console.log('Done!')
}

importDocs().catch(console.error)
