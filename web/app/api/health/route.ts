import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'API routes are working',
    timestamp: new Date().toISOString()
  })
} 