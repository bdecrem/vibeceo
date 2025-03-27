import { NextResponse } from 'next/server'
import { config } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    configuredModel: config.openai.model,
    envModel: process.env.OPENAI_MODEL || 'not set',
    defaultModel: 'gpt-3.5-turbo' // what would be used if env not set
  })
} 