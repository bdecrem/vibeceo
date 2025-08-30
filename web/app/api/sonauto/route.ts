import { NextRequest, NextResponse } from 'next/server';

const SONAUTO_API_KEY = process.env.SONAUTO_API_KEY || 'REMOVED';
const SONAUTO_BASE_URL = 'https://api.sonauto.ai/v1';

export async function POST(req: NextRequest) {
  try {
    const { 
      prompt, 
      seed,
      tags,
      lyrics,
      instrumental,
      num_songs,
      output_format,
      output_bit_rate,
      prompt_strength,
      bpm
    } = await req.json();
    
    // Build request body with all supported parameters
    const requestBody: any = {};
    
    // At least one of prompt, tags, or lyrics is required
    if (prompt) requestBody.prompt = prompt;
    if (tags) requestBody.tags = tags;
    if (lyrics) requestBody.lyrics = lyrics;
    
    // Optional parameters
    if (seed !== undefined) requestBody.seed = seed;
    if (instrumental !== undefined) requestBody.instrumental = instrumental;
    if (num_songs !== undefined) requestBody.num_songs = num_songs;
    if (output_format) requestBody.output_format = output_format;
    if (output_bit_rate) requestBody.output_bit_rate = output_bit_rate;
    if (prompt_strength !== undefined) requestBody.prompt_strength = prompt_strength;
    if (bpm !== undefined) requestBody.bpm = bpm;
    
    // Validate that at least one required field is present
    if (!requestBody.prompt && !requestBody.tags && !requestBody.lyrics) {
      return NextResponse.json(
        { error: 'At least one of prompt, tags, or lyrics is required' }, 
        { status: 400 }
      );
    }
    
    const response = await fetch(`${SONAUTO_BASE_URL}/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SONAUTO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to generate music' }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Sonauto API error:', error);
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