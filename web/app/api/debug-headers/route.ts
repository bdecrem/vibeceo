import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const headers = request.headers;
    const referer = headers.get('referer');
    
    const debug = {
        referer,
        allHeaders: Object.fromEntries(headers.entries()),
        url: request.url
    };
    
    return NextResponse.json(debug);
}