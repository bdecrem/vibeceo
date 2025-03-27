import { NextResponse } from 'next/server'
import { config } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    configuredModel: config.openai.model,
    envModel: process.env.OPENAI_MODEL || 'not set',
    nextConfigModel: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'not set in next config',
    hardcodedModel: 'gpt-3.5-turbo',  // Always using this model now
    isHardcoded: config.openai.model === 'gpt-3.5-turbo',
    environmentVars: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_RUNTIME: process.env.NEXT_RUNTIME,
      NETLIFY: process.env.NETLIFY || 'not set'
    }
  })
} 