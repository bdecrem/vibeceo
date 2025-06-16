import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  
  // Disable test routes in production
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Test route disabled in production', { status: 404 });
  }
  try {
    console.log('🧪 Debug: Checking Supabase connection for golden-fox-painting')
    
    // Check if environment variables exist
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY
    
    console.log('🔍 Supabase URL exists:', !!supabaseUrl)
    console.log('🔍 Supabase Key exists:', !!supabaseKey)
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    // Try to import Supabase
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log('✅ Supabase client created')
    
    // Try to fetch the data
    console.log('🔍 Querying for golden-fox-painting...')
    const { data, error } = await supabase
      .from('wtaf_content')
      .select('user_slug, app_slug, coach, original_prompt')
      .eq('app_slug', 'golden-fox-painting')
      .single()
    
    console.log('📊 Query result:', { data, error })
    
    let displayData = {
      found: false,
      user_slug: 'unknown',
      app_slug: 'golden-fox-painting',
      coach: 'Unknown',
      error: null as string | null
    }
    
    if (error) {
      displayData.error = error.message
      console.error('❌ Supabase error:', error)
    } else if (data) {
      displayData = {
        found: true,
        user_slug: data.user_slug || 'unknown',
        app_slug: data.app_slug,
        coach: data.coach || 'Unknown',
        error: null
      }
      console.log('✅ Found data:', displayData)
    }
    
    const appTitle = displayData.app_slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: displayData.found ? '#7c3aed' : '#dc2626',
            fontSize: 24,
            fontWeight: 600,
            color: 'white',
            padding: '40px',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '20px' }}>
            {displayData.found ? '✅ FOUND' : '❌ NOT FOUND'}
          </div>
          
          <div style={{ fontSize: '28px', marginBottom: '15px', textAlign: 'center' }}>
            {appTitle}
          </div>
          
          <div style={{ fontSize: '18px', opacity: 0.9, marginBottom: '10px' }}>
            User: {displayData.user_slug}
          </div>
          
          <div style={{ fontSize: '18px', opacity: 0.9, marginBottom: '10px' }}>
            Coach: {displayData.coach}
          </div>
          
          <div style={{ fontSize: '16px', opacity: 0.7, marginBottom: '15px' }}>
            Slug: {displayData.app_slug}
          </div>
          
          {displayData.error && (
            <div style={{ 
              fontSize: '14px', 
              opacity: 0.8, 
              textAlign: 'center',
              backgroundColor: 'rgba(0,0,0,0.3)',
              padding: '10px',
              borderRadius: '5px',
              maxWidth: '800px'
            }}>
              Error: {displayData.error}
            </div>
          )}
          
          <div style={{ 
            fontSize: '12px', 
            opacity: 0.6, 
            marginTop: '20px',
            textAlign: 'center'
          }}>
            WTAF Debug • Simple Route Test
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.error('❌ Debug route failed:', e)
    
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#dc2626',
            fontSize: 20,
            color: 'white',
            padding: '40px',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '20px' }}>
            ❌ CRASH
          </div>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            {e.message}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>
            Check console logs for details
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }
}
