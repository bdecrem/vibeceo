import { NextResponse } from 'next/server'
import { config } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    configuredModel: config.anthropic.model,
    envModel: process.env.ANTHROPIC_MODEL || 'not set',
    defaultModel: 'claude-3-sonnet' // what would be used if env not set
  })
} 