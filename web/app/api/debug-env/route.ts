import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    SUPABASE_URL: process.env.SUPABASE_URL ? 'FOUND' : 'MISSING',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'FOUND' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
    keys: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
  });
} 