import { NextRequest, NextResponse } from 'next/server';

const SONAUTO_API_KEY = process.env.SONAUTO_API_KEY || 'REMOVED';
const SONAUTO_BASE_URL = 'https://api.sonauto.ai/v1';

export async function POST(req: NextRequest) {
  try {
    const { prompt, seed } = await req.json();
    
    // Build request body with optional seed
    const requestBody: any = { prompt };
    if (seed) {
      requestBody.seed = seed;
    }
    
    const response = await fetch(`${SONAUTO_BASE_URL}/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SONAUTO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate music' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const taskId = req.nextUrl.searchParams.get('taskId');
    
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }
    
    const response = await fetch(`${SONAUTO_BASE_URL}/generations/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${SONAUTO_API_KEY}`
      }
    });
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}