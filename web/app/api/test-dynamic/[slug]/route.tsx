import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  return new Response(`Hello from dynamic route: ${params.slug}`, {
    headers: { 'Content-Type': 'text/plain' }
  })
} 